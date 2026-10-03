import React, { useState, useRef, useEffect, useCallback } from 'react';
import { callFormHelper } from '../ai/gemini';
import { FormHelperFields } from '../types';
import { useProfile } from '../state/ProfileProvider';
import { Sparkles, Send, Mic, MicOff, Square, X, ChevronDown, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  filledFields?: Record<string, any>;
  fillCount?: number;
  timestamp: number;
}

interface Props {
  formState: Record<string, any>;
  missingRequired: string[];
  onFieldsFilled: (fields: FormHelperFields) => void;
  onUndo: (messageId: string) => void;
  onLocationQuery: (query: string) => void;
  onClose: () => void;
}

const genId = () => Math.random().toString(36).substring(2, 10);

export const AIHelpSidebar: React.FC<Props> = ({
  formState,
  missingRequired,
  onFieldsFilled,
  onUndo,
  onClose,
  onLocationQuery,
}) => {
  const { profile } = useProfile();
  const preferredLanguage = profile?.preferences?.language || 'English';

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: genId(),
      role: 'system',
      text: `Hello! I'm your farm setup helper. Tell me about your farm in your own words — by typing or using the microphone. I'll fill in the form details for you. I can help with crop, water source, pump power, solar capacity, soil type, irrigation method, and more! You'll still need to draw the field boundary on the map yourself.`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getHistory = () =>
    messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'model', parts: m.text }));

  const sendMessage = useCallback(async (text: string, audioBase64?: { data: string; mimeType: string }) => {
    if (loading) return;

    const userMsg: AIMessage = {
      id: genId(),
      role: 'user',
      text: text || '🎤 Voice message',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = getHistory();
      history.push({ role: 'user', parts: userMsg.text });

      const response = await callFormHelper(
        history,
        formState,
        missingRequired,
        preferredLanguage,
        audioBase64,
      );

      // Process location query first
      if (response.fields.location_query) {
        onLocationQuery(response.fields.location_query);
      }

      // Apply filled fields to form
      const fieldsToApply = { ...response.fields };
      delete (fieldsToApply as any).location_query;
      const fieldCount = Object.keys(fieldsToApply).length;

      if (fieldCount > 0) {
        onFieldsFilled(fieldsToApply as FormHelperFields);
      }

      const assistantMsgId = genId();
      const assistantMsg: AIMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: response.transcript
          ? `[Heard: "${response.transcript}"]\n\n${response.reply}`
          : response.reply,
        filledFields: fieldCount > 0 ? fieldsToApply : undefined,
        fillCount: fieldCount,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: genId(),
        role: 'assistant',
        text: `Sorry, I ran into an issue: ${err?.message || 'Please try again.'}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, formState, missingRequired, preferredLanguage, onFieldsFilled, onLocationQuery]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice recording
  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        await sendMessage('', { data: base64, mimeType });
        setRecording(false);
        setRecordingTime(0);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      };

      mr.start();
      setRecording(true);

      recordTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 60) {
            stopRecording();
            return 60;
          }
          return t + 1;
        });
      }, 1000);
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone access was denied. Allow microphone permission in your browser settings to use voice input.'
        : `Could not start recording: ${err?.message}`;
      setMicError(msg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
    setRecordingTime(0);
    setMessages(prev => prev);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-100 shadow-[-2px_0_12px_rgba(20,83,45,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-mint to-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sun flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold font-heading text-forest leading-tight">Farm Helper</h3>
            <p className="text-[10px] text-slate-500">Powered by Gemini AI</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          aria-label="Close AI helper sidebar"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
              msg.role === 'user'
                ? 'bg-forest text-white rounded-br-none'
                : msg.role === 'system'
                ? 'bg-mint border border-leaf-200 text-forest rounded-bl-none'
                : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Filled fields summary */}
              {msg.filledFields && msg.fillCount && msg.fillCount > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-leaf-700 mb-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Filled {msg.fillCount} field{msg.fillCount !== 1 ? 's' : ''}:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(msg.filledFields).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-leaf-100 text-forest text-[10px] font-semibold">
                        {k.replace(/_/g, ' ')}: {String(v)}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => onUndo(msg.id)}
                    className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500 hover:text-critical transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Undo this fill
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-leaf-500" />
              <span className="text-xs text-slate-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Mic Error */}
      {micError && (
        <div className="mx-4 mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          {micError}
        </div>
      )}

      {/* Recording State */}
      {recording && (
        <div className="mx-4 mb-2 flex items-center justify-between p-3 rounded-2xl bg-red-50 border border-red-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-critical animate-pulse" />
            <span className="text-xs font-bold text-critical">Recording {recordingTime}s / 60s</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={cancelRecording}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-critical text-white hover:bg-red-600 transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-slate-100 bg-warm/60">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type about your farm, or use the mic..."
            disabled={loading || recording}
            rows={2}
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-forest focus:ring-1 focus:ring-forest/20 text-xs text-slate-800 resize-none outline-none placeholder:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || recording || !input.trim()}
              className="w-9 h-9 rounded-xl bg-forest text-white flex items-center justify-center disabled:opacity-40 hover:bg-forest/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
              aria-label="Send message"
              title="Send"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={loading}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest disabled:opacity-40 ${
                recording
                  ? 'bg-critical text-white hover:bg-red-600 animate-pulse-subtle'
                  : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
              }`}
              aria-label={recording ? 'Stop recording' : 'Start voice recording'}
              title={micError ? micError : recording ? 'Stop recording' : 'Voice input'}
            >
              {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">
          Press Enter to send. The assistant fills the form but never submits it.
        </p>
      </div>
    </div>
  );
};
