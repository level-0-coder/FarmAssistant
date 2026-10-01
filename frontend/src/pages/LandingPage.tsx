import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken, isAuthenticated } from '../api/auth';
import { apiClient } from '../api/client';
import { ENV } from '../config/options';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Auth modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ScrollSpy active link
  const [activeSection, setActiveSection] = useState<'home' | 'problem' | 'features' | 'products'>('home');

  // Hero interactive telemetry & chip simulation
  const [activeChip, setActiveChip] = useState(0);
  const telemetryStates = [
    { moisture: '42%', solar: '760 W/m²', mm: '3.8 mm', litres: '15,200 Litres' },
    { moisture: '39%', solar: '810 W/m²', mm: '4.1 mm', litres: '16,400 Litres' },
    { moisture: '45%', solar: '690 W/m²', mm: '3.4 mm', litres: '13,600 Litres' },
    { moisture: '44%', solar: '740 W/m²', mm: '3.6 mm', litres: '14,400 Litres' },
    { moisture: '41%', solar: '780 W/m²', mm: '3.9 mm', litres: '15,600 Litres' },
  ];

  // Product carousel ref
  const productTrackRef = useRef<HTMLDivElement>(null);

  // Interval for hero chip rotation & telemetry updates
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveChip((prev) => (prev + 1) % 5);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // ScrollSpy observer
  useEffect(() => {
    const sectionIds: ('home' | 'problem' | 'features' | 'products')[] = ['home', 'problem', 'features', 'products'];
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as any);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    sections.forEach((sec) => observer.observe(sec));

    const handleScroll = () => {
      if (window.scrollY < 80) {
        setActiveSection('home');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Modal open / close handlers
  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setError(null);
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseAuth = () => {
    setModalOpen(false);
    document.body.style.overflow = '';
  };

  // Auth submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (ENV.USE_MOCKS) {
        setToken('mock_jwt_token_farmer_ramesh');
        handleCloseAuth();
        navigate('/dashboard');
      } else {
        const endpoint = authMode === 'signup' ? '/api/v1/auth/register' : '/api/v1/auth/login';
        const res: any = await apiClient(endpoint, {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        const token = res.access_token || res.token || res.jwt;
        if (token) {
          setToken(token);
          handleCloseAuth();
          navigate('/dashboard');
        } else if (authMode === 'signup') {
          setAuthMode('login');
          setError('Registration successful! Please log in.');
        } else {
          setError('Invalid login response from server.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login
  const handleQuickDemoLogin = async () => {
    if (ENV.USE_MOCKS) {
      setToken('mock_jwt_token_demo_user');
      handleCloseAuth();
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res: any = await apiClient('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'farmer@test.com', password: 'password123' }),
      });
      const token = res.access_token || res.token || res.jwt;
      if (token) {
        setToken(token);
        handleCloseAuth();
        navigate('/dashboard');
      } else {
        setError('Login failed: no token returned.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not log in with demo account. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Product carousel scroll controls
  const handleCarouselScroll = (direction: 'prev' | 'next') => {
    if (productTrackRef.current) {
      const scrollAmount = direction === 'prev' ? -340 : 340;
      productTrackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const currentTelemetry = telemetryStates[activeChip] || telemetryStates[0];

  return (
    <div className="bg-background font-body-md text-on-surface antialiased selection:bg-secondary-fixed selection:text-on-secondary-fixed min-h-screen flex flex-col">
      {/* =====================================================================
          HEADER / NAVBAR
          ===================================================================== */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/80 backdrop-blur-md shadow-[0_1px_8px_rgba(20,83,45,0.06)]">
        <div className="h-20 max-w-7xl mx-auto px-margin-desktop flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-space-sm">
            <img
              alt="Farm Assistant logo"
              className="h-8 w-auto object-contain"
              src="/assets/images/logo.png"
            />
            <a
              className="flex items-baseline font-headline-md text-headline-md tracking-tight text-on-surface"
              href="#home"
            >
              Farm<span className="text-primary ml-1">Assistant</span>
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              className={`nav-link relative py-2 font-label-lg text-label-lg transition-colors duration-200 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full ${
                activeSection === 'home'
                  ? 'text-primary font-bold after:bg-primary'
                  : 'text-on-surface-variant hover:text-primary after:bg-transparent'
              }`}
              href="#home"
            >
              Home
            </a>
            <a
              className={`nav-link relative py-2 font-label-lg text-label-lg transition-colors duration-200 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full ${
                activeSection === 'problem'
                  ? 'text-primary font-bold after:bg-primary'
                  : 'text-on-surface-variant hover:text-primary after:bg-transparent'
              }`}
              href="#problem"
            >
              Problem
            </a>
            <a
              className={`nav-link relative py-2 font-label-lg text-label-lg transition-colors duration-200 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full ${
                activeSection === 'features'
                  ? 'text-primary font-bold after:bg-primary'
                  : 'text-on-surface-variant hover:text-primary after:bg-transparent'
              }`}
              href="#features"
            >
              Features
            </a>
            <a
              className={`nav-link relative py-2 font-label-lg text-label-lg transition-colors duration-200 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full ${
                activeSection === 'products'
                  ? 'text-primary font-bold after:bg-primary'
                  : 'text-on-surface-variant hover:text-primary after:bg-transparent'
              }`}
              href="#products"
            >
              Products
            </a>
          </nav>

          {/* Auth Action Buttons */}
          <div className="flex items-center gap-space-md">
            {isAuthenticated() ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-space-lg py-space-sm rounded-full font-label-md text-label-md bg-primary text-on-primary shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                type="button"
              >
                <span>Dashboard</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <>
                <button
                  className="px-space-md py-space-sm rounded-full font-label-md text-label-md text-secondary border border-secondary hover:bg-secondary-fixed hover:text-on-secondary-fixed-variant transition-all duration-200"
                  onClick={() => handleOpenAuth('login')}
                  type="button"
                >
                  Log in
                </button>
                <button
                  className="px-space-lg py-space-sm rounded-full font-label-md text-label-md bg-secondary text-on-secondary shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  onClick={() => handleOpenAuth('signup')}
                  type="button"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN CONTENT CONTAINER
          ===================================================================== */}
      <main className="w-full pt-20 bg-background flex-1">
        <div className="flex flex-col w-full">
          {/* ===================================================================
              HERO SECTION
              =================================================================== */}
          <section className="relative w-full overflow-hidden bg-surface-container-lowest" id="home">
            {/* Ambient sunlit background layer with wheat backdrop */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-25 mix-blend-multiply">
              <img
                className="w-full h-full object-cover object-center"
                alt="Vast golden sunlit wheat farm in rural India during morning sunrise"
                src="/assets/images/wheat-field-sunrise.jpg"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-container-lowest/40 to-surface-container-lowest" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-margin-desktop py-space-xl flex flex-col lg:flex-row items-center justify-between gap-gutter-desktop min-h-[calc(100vh-5rem)]">
              {/* Left Column: Copy & Actions */}
              <div className="flex-1 flex flex-col items-start gap-space-lg max-w-2xl">
                {/* Pill Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-fixed/60 text-on-secondary-fixed-variant shadow-sm backdrop-blur-sm">
                  <span
                    className="material-symbols-outlined text-[18px] text-primary"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    eco
                  </span>
                  <span className="font-label-md text-label-md tracking-wide">
                    Solar-powered smart irrigation
                  </span>
                </div>

                {/* Headline */}
                <h1 className="font-headline-xl text-[44px] lg:text-[54px] leading-[1.12] text-on-surface font-extrabold tracking-tight">
                  Let the sun pump.
                  <br />
                  Let the{' '}
                  <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">
                    data pour.
                  </span>
                </h1>

                {/* Subheadline */}
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                  Know how much water your crop needs, calculated from your farm's weather, soil moisture and growth stage.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
                  <button
                    className="h-14 px-8 rounded-full bg-primary text-on-primary font-label-lg text-label-lg flex items-center gap-3 shadow-md hover:shadow-xl hover:bg-primary-container transition-all duration-200"
                    onClick={() => handleOpenAuth('signup')}
                    type="button"
                  >
                    <span>Get Started</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                  <a
                    className="h-14 px-8 rounded-full bg-surface-container-lowest text-secondary font-label-lg text-label-lg flex items-center gap-2 shadow-sm hover:bg-secondary-fixed/40 transition-all duration-200"
                    href="#features"
                  >
                    <span>See how it works</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                  </a>
                  <button
                    className="h-14 px-6 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-label-lg text-label-lg flex items-center gap-2 shadow-sm hover:bg-amber-200 transition-all duration-200"
                    onClick={handleQuickDemoLogin}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px] text-amber-700">bolt</span>
                    <span>Demo Mode</span>
                  </button>
                </div>

                {/* Trust Stats horizontal bar */}
                <div className="w-full pt-space-md mt-space-sm grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                  <div className="flex items-start gap-2.5 bg-surface-container-low/70 p-3.5 rounded-xl">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">verified</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                      93% validation accuracy on wheat growth stages
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 bg-surface-container-low/70 p-3.5 rounded-xl">
                    <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">calculate</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                      FAO-style ET₀ → ETc calculation
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 bg-surface-container-low/70 p-3.5 rounded-xl">
                    <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">wb_sunny</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                      Built specifically for solar-pump farms
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Day/Night Farm Simulation Component */}
              <div className="w-full lg:w-[480px] flex-shrink-0 relative">
                <div className="relative bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-6 shadow-xl overflow-hidden border border-outline-variant/30">
                  {/* Glass feature tags with active cyclic rotation highlight */}
                  <div className="flex flex-wrap gap-2 mb-4" id="hero-chip-container">
                    {[
                      'Farm profile',
                      'Soil moisture',
                      'Crop stage from photo',
                      'Open-Meteo weather',
                      'Water requirement',
                    ].map((label, idx) => (
                      <button
                        key={label}
                        onClick={() => setActiveChip(idx)}
                        className={`text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md transition-all duration-500 cursor-pointer ${
                          activeChip === idx
                            ? 'bg-secondary-fixed text-on-secondary-fixed-variant shadow-sm ring-1 ring-primary/40 scale-105'
                            : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Illustrated Day & Night Cycle SVG Canvas with Continuous Loop */}
                  <div className="relative w-full h-56 rounded-xl anim-sky-cycle overflow-hidden flex items-end shadow-inner border border-outline-variant/20">
                    <svg
                      className="w-full h-full absolute inset-0 pointer-events-none"
                      fill="none"
                      preserveAspectRatio="none"
                      viewBox="0 0 440 220"
                    >
                      {/* Orbit Arc */}
                      <path
                        d="M 40,190 A 180,140 0 0,1 400,190"
                        opacity="0.45"
                        stroke="#fcd34d"
                        strokeDasharray="4 4"
                        strokeWidth="2"
                      />
                      {/* Celestial Sun */}
                      <g className="anim-sun">
                        <circle cx="220" cy="70" fill="#fde68a" opacity="0.4" r="32" />
                        <circle cx="220" cy="70" fill="#fbbf24" opacity="0.95" r="21" />
                        <line stroke="#fbbf24" strokeLinecap="round" strokeWidth="2" x1="220" x2="220" y1="42" y2="35" />
                        <line stroke="#fbbf24" strokeLinecap="round" strokeWidth="2" x1="220" x2="220" y1="98" y2="105" />
                        <line stroke="#fbbf24" strokeLinecap="round" strokeWidth="2" x1="192" x2="185" y1="70" y2="70" />
                        <line stroke="#fbbf24" strokeLinecap="round" strokeWidth="2" x1="248" x2="255" y1="70" y2="70" />
                      </g>
                      {/* Celestial Moon */}
                      <g className="anim-moon">
                        <circle cx="220" cy="70" fill="#e0f2fe" opacity="0.85" r="18" />
                        <circle cx="226" cy="65" fill="#1e1b4b" opacity="0.75" r="14" />
                        <circle cx="185" cy="50" fill="#ffffff" opacity="0.8" r="1.5" />
                        <circle cx="255" cy="45" fill="#ffffff" opacity="0.9" r="1.2" />
                        <circle cx="270" cy="78" fill="#fef08a" opacity="0.75" r="1.8" />
                      </g>
                      {/* Solar Photovoltaic Array */}
                      <g className="anim-solar-panel" transform="translate(55, 108)">
                        <rect
                          fill="#0f172a"
                          height="34"
                          rx="2"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          transform="skewX(-14)"
                          width="74"
                          x="0"
                          y="24"
                        />
                        <line opacity="0.8" stroke="#38bdf8" strokeWidth="1.2" x1="0" x2="74" y1="41" y2="41" />
                        <line opacity="0.8" stroke="#38bdf8" strokeWidth="1.2" x1="25" x2="25" y1="24" y2="58" />
                        <line opacity="0.8" stroke="#38bdf8" strokeWidth="1.2" x1="49" x2="49" y1="24" y2="58" />
                        <path d="M 28,58 L 28,80 M 44,58 L 44,80" stroke="#64748b" strokeWidth="3" />
                      </g>
                      {/* Elevated Water Tank */}
                      <g transform="translate(155, 112)">
                        <rect fill="#0284c7" height="42" rx="4" width="36" x="10" y="10" />
                        <rect fill="#7dd3fc" height="34" opacity="0.5" rx="1" width="6" x="13" y="13" />
                        <path d="M 12,52 L 8,78 M 44,52 L 48,78" stroke="#475569" strokeWidth="2.5" />
                        <path d="M 28,52 L 28,75 L 85,75 L 85,82" fill="none" stroke="#0284c7" strokeWidth="3" />
                        <path
                          className="anim-water-stream"
                          d="M 28,52 L 28,75 L 85,75 L 85,82 L 180,82"
                          fill="none"
                          stroke="#38bdf8"
                          strokeLinecap="round"
                          strokeWidth="2.5"
                        />
                      </g>
                      {/* Crop Rows & Soil Base */}
                      <path d="M 0,180 Q 120,165 240,175 T 440,170 L 440,220 L 0,220 Z" fill="#78350f" opacity="0.88" />
                      <path d="M 0,190 Q 140,178 280,188 T 440,182 L 440,220 L 0,220 Z" fill="#451a03" />
                      {/* Swaying Wheat Stalks */}
                      <g className="anim-crop-1" stroke="#15803d" strokeLinecap="round" strokeWidth="2.5">
                        <line x1="262" x2="262" y1="188" y2="140" />
                        <line x1="292" x2="294" y1="188" y2="142" />
                        <line x1="330" x2="332" y1="188" y2="139" />
                      </g>
                      <g className="anim-crop-2" stroke="#16a34a" strokeLinecap="round" strokeWidth="2.5">
                        <line x1="277" x2="279" y1="188" y2="135" />
                        <line x1="312" x2="314" y1="189" y2="137" />
                        <line x1="346" x2="348" y1="188" y2="145" />
                      </g>
                      <g className="anim-crop-1" fill="#16a34a">
                        <circle cx="262" cy="138" r="4.5" />
                        <circle cx="294" cy="140" r="4.5" />
                        <circle cx="332" cy="137" r="4.5" />
                      </g>
                      <g className="anim-crop-2" fill="#22c55e">
                        <circle cx="279" cy="133" r="4.5" />
                        <circle cx="314" cy="135" r="4.5" />
                        <circle cx="348" cy="143" r="4.5" />
                      </g>
                      {/* Sensor Probe planted in soil */}
                      <g transform="translate(374, 142)">
                        <rect fill="#166534" height="26" rx="3" width="13" x="0" y="0" />
                        <line stroke="#94a3b8" strokeWidth="2" x1="4" x2="4" y1="26" y2="48" />
                        <line stroke="#94a3b8" strokeWidth="2" x1="9" x2="9" y1="26" y2="48" />
                        <circle cx="6.5" cy="7" fill="#4ade80" r="2.5">
                          <animate attributeName="opacity" dur="1.4s" repeatCount="indefinite" values="1;0.2;1" />
                        </circle>
                      </g>
                    </svg>
                    <div className="relative z-10 w-full px-4 py-2 bg-gradient-to-t from-black/75 to-transparent flex items-center justify-between text-white">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        Solar Irradiance: Optimal
                      </span>
                      <span className="text-xs font-mono text-amber-200">{currentTelemetry.solar}</span>
                    </div>
                  </div>

                  {/* Readout Box with Live Animated Telemetry */}
                  <div className="mt-4 p-4 rounded-xl bg-surface-container-low flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                        Field Telemetry Engine
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant uppercase tracking-wider">
                        Sample data
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="p-2.5 rounded-lg bg-surface-container-lowest shadow-sm">
                        <span className="font-label-sm text-label-sm text-on-surface-variant block">Soil Moisture</span>
                        <span className="font-headline-md text-headline-md text-secondary font-bold anim-telemetry-pulse block">
                          {currentTelemetry.moisture}
                        </span>
                        <span className="text-[11px] text-tertiary font-medium">Volumetric Content</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface-container-lowest shadow-sm">
                        <span className="font-label-sm text-label-sm text-on-surface-variant block">Wheat Stage</span>
                        <span className="font-headline-md text-headline-md text-primary font-bold">Stage 2</span>
                        <span className="text-[11px] text-on-surface-variant font-medium">Vegetative (Kc 0.7)</span>
                      </div>
                    </div>
                    {/* Today's Need highlight */}
                    <div className="p-3 rounded-lg bg-secondary-fixed/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px]">water_drop</span>
                        <div>
                          <span className="font-label-sm text-label-sm text-on-secondary-fixed-variant block font-bold">
                            Today's Irrigation Need
                          </span>
                          <span className="text-[12px] text-on-surface-variant">0.4 ha plot adjusted</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-headline-md text-headline-md text-primary font-extrabold">
                          {currentTelemetry.mm}
                        </span>
                        <span className="text-[12px] font-mono text-on-surface block font-bold">
                          {currentTelemetry.litres}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Soft wave divider */}
            <div className="w-full h-10 text-surface-container-low overflow-hidden leading-none">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 60">
                <path d="M0,0 C300,50 600,-20 900,40 C1050,60 1150,20 1200,30 L1200,60 L0,60 Z" fill="currentColor" />
              </svg>
            </div>
          </section>

          {/* ===================================================================
              SECTION 2: THE PROBLEM
              =================================================================== */}
          <section className="w-full bg-surface-container-low py-space-xl relative" id="problem">
            <div className="max-w-7xl mx-auto px-margin-desktop">
              {/* Section Header */}
              <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-space-xl">
                <span className="text-[12px] font-extrabold tracking-widest uppercase text-error px-3 py-1 rounded-full bg-error-container/40 mb-3">
                  THE PROBLEM
                </span>
                <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mb-2">
                  Small farms. Big uncertainty.
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  What India's small farmers face every season.
                </p>
              </div>

              {/* Problem Presentation: Editorial Composition */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-stretch mb-space-lg">
                {/* Farmer Image Column */}
                <div className="lg:col-span-4 relative rounded-2xl overflow-hidden shadow-md min-h-[380px] bg-surface-container">
                  <img
                    className="w-full h-full object-cover object-center"
                    alt="Portrait of an Indian wheat farmer in turban standing thoughtfully beside wheat crop"
                    src="/assets/images/farmer-portrait.jpg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-inverse-surface/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-inverse-on-surface">
                    <span className="text-xs uppercase font-bold tracking-wider text-secondary-fixed">
                      Field Ground Reality
                    </span>
                    <p className="font-body-md text-body-md mt-1 text-surface-container-lowest font-medium">
                      “We pump when electricity arrives or sun shines, guessing if the wheat drank too little or too much.”
                    </p>
                  </div>
                </div>

                {/* 3 Stat Cards Right */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-gutter">
                  {/* Card 1 */}
                  <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-on-surface-variant">
                        SHRINKING HOLDINGS
                      </span>
                      <div className="font-headline-xl text-headline-xl text-primary font-black mt-2 mb-3">
                        0.74 ha
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        The average Indian farm has shrunk to about 0.74 hectares, down from 1.08 ha five years earlier.
                        Small plots leave no room to waste water or inputs.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline mt-4 pt-3 block">
                      Source: NABARD NAFIS 2021-22
                    </span>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-error">
                        EXTREME WEATHER
                      </span>
                      <div className="font-headline-xl text-headline-xl text-error font-black mt-2 mb-3">
                        99% <span className="text-base font-semibold">of days</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        India recorded extreme weather on 99% of days between January and September 2025, affecting at least
                        9.47 million hectares of cropland. Rain and heat are harder to plan around every year.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline mt-4 pt-3 block">
                      Source: CSE & Down To Earth, Climate India 2025
                    </span>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-tertiary">
                        GROUNDWATER DEPLETION
                      </span>
                      <div className="font-headline-xl text-headline-xl text-tertiary font-black mt-2 mb-3">
                        64%
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Groundwater supplies about 64% of India's irrigation, and 730 blocks (10.8%) are already
                        over-exploited. Guessing how much to irrigate means wasted water and energy, or a stressed crop.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline mt-4 pt-3 block">
                      Source: CGWB Dynamic Groundwater Assessment 2025
                    </span>
                  </div>
                </div>
              </div>

              {/* 2 Qualitative Challenge Cards Below */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter max-w-4xl mx-auto">
                <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                      One-size-fits-all advice
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      A crop's thirst changes with its growth stage, the weather and the soil, yet most irrigation follows
                      habit or a fixed schedule.
                    </p>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[24px]">visibility_off</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                      No data from the field
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      Most decisions are made by eye. Farmers rarely have measurements of their own soil moisture, humidity
                      or crop stage to rely on.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===================================================================
              SECTION 3: FEATURES (THE SYSTEM)
              =================================================================== */}
          <section className="w-full bg-surface-container-lowest py-space-xl" id="features">
            <div className="max-w-7xl mx-auto px-margin-desktop">
              {/* Section Header */}
              <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-space-xl">
                <span className="text-[12px] font-extrabold tracking-widest uppercase text-primary px-3 py-1 rounded-full bg-secondary-fixed/50 mb-3">
                  THE SYSTEM
                </span>
                <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mb-2">
                  From your field to your water number
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Precision water estimation tailored for solar pump farmers
                </p>
              </div>

              {/* Feature Rows Zigzag (5 Alternating Rows) */}
              <div className="flex flex-col gap-space-xl">
                {/* Row 01: Image Left / Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-gutter-desktop">
                  <div className="w-full lg:w-1/2 relative rounded-2xl overflow-hidden shadow-lg h-80 bg-surface-container">
                    <img
                      className="w-full h-full object-cover"
                      alt="Indian farmer holding smartphone in wheat field checking farm registration"
                      src="/assets/images/farmer-smartphone.jpg"
                    />
                    <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface text-xs font-bold shadow flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">pin_drop</span>
                      <span>Farm Location Linked</span>
                    </div>
                    <div className="absolute bottom-4 right-4 px-3 py-1 rounded-lg bg-inverse-surface/80 text-inverse-on-surface font-mono text-xs">
                      21.1458° N, 79.0882° E • 0.4 ha
                    </div>
                  </div>
                  <div className="w-full lg:w-1/2 flex flex-col gap-space-sm pl-0 lg:pl-6">
                    <span className="font-mono text-xs font-bold text-secondary uppercase tracking-widest">
                      Step 01
                    </span>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface">Set up your farm once</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Register a farm with its location, field area, water source and power source. Your sensor units are
                      assigned to that farm, so every reading and calculation belongs to the right field.
                    </p>
                    <ul className="flex flex-col gap-2 mt-2">
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Farm location and field area</span>
                      </li>
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Water source and power source</span>
                      </li>
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Sensor units linked to each farm</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Row 02: Text Left / Image Right */}
                <div className="flex flex-col-reverse lg:flex-row items-center gap-gutter-desktop">
                  <div className="w-full lg:w-1/2 flex flex-col gap-space-sm pr-0 lg:pr-6">
                    <span className="font-mono text-xs font-bold text-primary uppercase tracking-widest">
                      Step 02
                    </span>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface">Sensors that listen to your soil</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Each physical sensor unit sends its readings, and every farm keeps a history with the newest readings
                      first. Soil moisture and air humidity feed directly into the water calculation.
                    </p>
                    <ul className="flex flex-col gap-2 mt-2">
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Soil moisture and air humidity</span>
                      </li>
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Every unit tracked individually</span>
                      </li>
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Newest-first reading history</span>
                      </li>
                    </ul>
                  </div>
                  <div className="w-full lg:w-1/2 relative rounded-2xl overflow-hidden shadow-lg h-80 bg-surface-container">
                    <img
                      className="w-full h-full object-cover"
                      alt="Digital electronic soil moisture probe inserted in soil"
                      src="/assets/images/soil-moisture-sensor.jpg"
                    />
                    <div className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-secondary text-xs font-bold shadow flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-tertiary text-[18px]">sensors</span>
                      <span>Latest readings</span>
                    </div>
                    <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-surface-container-lowest/95 backdrop-blur-md shadow text-xs">
                      <div className="font-bold text-on-surface">Unit FA-SOIL-09</div>
                      <div className="text-tertiary font-mono">Moisture: 42% • RH: 68%</div>
                    </div>
                  </div>
                </div>

                {/* Row 03: Image Left / Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-gutter-desktop">
                  <div className="w-full lg:w-1/2 relative rounded-2xl overflow-hidden shadow-lg h-80 bg-surface-container">
                    <img
                      className="w-full h-full object-cover"
                      alt="Wheat heads and stalks in rural farm under bright sunlight"
                      src="/assets/images/crop-wheat-growth.jpg"
                    />
                    <div className="absolute inset-x-4 bottom-4 p-4 rounded-xl bg-surface-container-lowest/95 backdrop-blur-md shadow flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-outline uppercase block">
                          Detected Stage (Sample data)
                        </span>
                        <span className="font-headline-sm text-headline-sm text-primary font-bold">
                          Tillering / Jointing (Stage 2)
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-secondary-fixed text-on-secondary-fixed-variant text-xs font-mono font-bold">
                        93.4% conf.
                      </span>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/2 flex flex-col gap-space-sm pl-0 lg:pl-6">
                    <span className="font-mono text-xs font-bold text-secondary uppercase tracking-widest">
                      Step 03
                    </span>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface">Crop stage from a single photo</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Send a photo of your crop and a MobileNetV3 model identifies its wheat growth stage among four
                      classes, with about 93% validation accuracy. The stage sets the crop coefficient used in the water
                      calculation.
                    </p>
                    <ul className="flex flex-col gap-2 mt-2">
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Wheat growth-stage detection</span>
                      </li>
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Four growth-stage classes</span>
                      </li>
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>About 93% validation accuracy</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Row 04: Text Left / Image Right */}
                <div className="flex flex-col-reverse lg:flex-row items-center gap-gutter-desktop">
                  <div className="w-full lg:w-1/2 flex flex-col gap-space-sm pr-0 lg:pr-6">
                    <span className="font-mono text-xs font-bold text-primary uppercase tracking-widest">
                      Step 04
                    </span>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface">Local weather, automatically</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Your farm's location is used to fetch weather from Open-Meteo. Temperature, humidity, wind and
                      precipitation conditions feed the evapotranspiration calculation.
                    </p>
                    <ul className="flex flex-col gap-2 mt-2">
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Weather by farm location</span>
                      </li>
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Powered by Open-Meteo</span>
                      </li>
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Used directly in the water calculation</span>
                      </li>
                    </ul>
                  </div>
                  <div className="w-full lg:w-1/2 p-6 rounded-2xl bg-surface-container-low shadow-sm flex flex-col justify-between h-80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-tertiary text-[24px]">cloud</span>
                        <span className="font-headline-sm text-headline-sm text-on-surface">Open-Meteo Weather</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant uppercase tracking-wider">
                        Sample data
                      </span>
                    </div>
                    {/* Weather Telemetry Grid */}
                    <div className="grid grid-cols-2 gap-3 my-auto">
                      <div className="p-3 rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-600 text-[26px]">thermostat</span>
                        <div>
                          <span className="text-xs text-on-surface-variant block">Temperature</span>
                          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">29°C</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-3">
                        <span className="material-symbols-outlined text-tertiary text-[26px]">humidity_percentage</span>
                        <div>
                          <span className="text-xs text-on-surface-variant block">Air Humidity</span>
                          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">48%</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-3">
                        <span className="material-symbols-outlined text-outline text-[26px]">air</span>
                        <div>
                          <span className="text-xs text-on-surface-variant block">Wind Speed</span>
                          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">8 km/h</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-container-lowest shadow-sm flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[26px]">rainy</span>
                        <div>
                          <span className="text-xs text-on-surface-variant block">Rain 24h</span>
                          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">0 mm</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-on-surface-variant flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-[16px] text-primary">sync</span>
                      <span>Updated automatically for farm GPS coordinates</span>
                    </div>
                  </div>
                </div>

                {/* Row 05: Image Left / Text Right */}
                <div className="flex flex-col lg:flex-row items-center gap-gutter-desktop">
                  <div className="w-full lg:w-1/2 p-6 rounded-2xl bg-surface-container-low shadow-sm flex flex-col justify-between h-80">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-secondary uppercase tracking-wider">
                        FAO Penman-Monteith Standard
                      </span>
                      <span className="font-mono text-xs font-bold text-primary">ET₀ × Kc = ETc</span>
                    </div>
                    {/* Workflow visual nodes */}
                    <div className="flex items-center justify-between gap-1 my-auto">
                      <div className="flex-1 bg-surface-container-lowest p-2.5 rounded-lg text-center shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Weather</span>
                        <span className="font-mono text-xs font-bold text-tertiary">Solar / Wind</span>
                      </div>
                      <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
                      <div className="flex-1 bg-surface-container-lowest p-2.5 rounded-lg text-center shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant block">ET₀</span>
                        <span className="font-mono text-xs font-bold text-secondary">5.4 mm/d</span>
                      </div>
                      <span className="material-symbols-outlined text-outline text-[16px]">close</span>
                      <div className="flex-1 bg-surface-container-lowest p-2.5 rounded-lg text-center shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Crop Kc</span>
                        <span className="font-mono text-xs font-bold text-primary">0.70</span>
                      </div>
                      <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
                      <div className="flex-1 bg-primary text-on-primary p-2.5 rounded-lg text-center shadow-sm">
                        <span className="text-[10px] uppercase font-bold opacity-80 block">Water Need</span>
                        <span className="font-mono text-xs font-bold">3.8 mm</span>
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                      Integrates field soil depletion index with crop evapotranspiration.
                    </p>
                  </div>
                  <div className="w-full lg:w-1/2 flex flex-col gap-space-sm pl-0 lg:pl-6">
                    <span className="font-mono text-xs font-bold text-secondary uppercase tracking-widest">
                      Step 05
                    </span>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface">Water requirement, the FAO way</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Instead of a fixed soil-moisture threshold, the platform calculates reference evapotranspiration (ET₀)
                      from weather, applies a crop coefficient based on growth stage to get crop evapotranspiration (ETc),
                      and combines it with soil moisture and field area to estimate how much water your crop needs.
                    </p>
                    <ul className="flex flex-col gap-2 mt-2">
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>ET₀ from weather data</span>
                      </li>
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Crop coefficient from growth stage</span>
                      </li>
                      <li className="flex items-center gap-2 text-on-surface font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        <span>Uses soil moisture and field area</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===================================================================
              SECTION 4: PRODUCTS
              =================================================================== */}
          <section className="w-full bg-surface-container-low py-space-xl relative overflow-hidden" id="products">
            {/* Subtle backdrop wheat texture */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
              <img
                className="w-full h-full object-cover"
                alt="Wheat crop field under sunny rural sky"
                src="/assets/images/wheat-field-sunrise.jpg"
              />
            </div>
            <div className="relative z-10 max-w-7xl mx-auto px-margin-desktop">
              <div className="flex flex-col lg:flex-row items-start gap-gutter-desktop">
                {/* Left Side: Title & Controls */}
                <div className="w-full lg:w-1/3 flex flex-col justify-between self-stretch pr-0 lg:pr-4">
                  <div>
                    <span className="text-[12px] font-extrabold tracking-widest uppercase text-primary px-3 py-1 rounded-full bg-secondary-fixed/50 mb-3 inline-block">
                      FIELD HARDWARE
                    </span>
                    <h2 className="font-headline-xl text-[56px] lg:text-[72px] leading-tight text-on-surface font-black tracking-tight mb-4">
                      Products
                    </h2>
                    <p className="font-body-lg text-body-lg text-on-surface-variant max-w-sm">
                      Hardware that listens to your soil and watches your crops.
                    </p>
                  </div>
                  {/* Carousel Controls */}
                  <div className="flex items-center gap-3 mt-8 lg:mt-0 pt-4">
                    <button
                      aria-label="Previous product"
                      className="w-12 h-12 rounded-full bg-surface-container-lowest text-on-surface hover:bg-secondary-fixed hover:text-on-secondary-fixed flex items-center justify-center shadow transition-all cursor-pointer"
                      onClick={() => handleCarouselScroll('prev')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                    </button>
                    <button
                      aria-label="Next product"
                      className="w-12 h-12 rounded-full bg-surface-container-lowest text-on-surface hover:bg-secondary-fixed hover:text-on-secondary-fixed flex items-center justify-center shadow transition-all cursor-pointer"
                      onClick={() => handleCarouselScroll('next')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
                    </button>
                    <span className="text-xs text-on-surface-variant font-mono ml-2">3 Dedicated Units</span>
                  </div>
                </div>

                {/* Right Side: Horizontal Scroll Track */}
                <div className="w-full lg:w-2/3 overflow-hidden">
                  <div
                    ref={productTrackRef}
                    className="flex gap-gutter overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {/* Product 1: Soil Moisture + Air Humidity Sensor Unit */}
                    <div className="w-[320px] sm:w-[360px] flex-shrink-0 snap-start bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="h-48 w-full bg-surface-container overflow-hidden relative">
                          <img
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            alt="Soil moisture probe sensor unit"
                            src="/assets/images/soil-moisture-sensor.jpg"
                          />
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-surface-container-lowest/90 text-[11px] font-bold text-on-surface shadow">
                            Telemetry Probe
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-2">
                            Soil Moisture + Air Humidity Sensor Unit
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                            Robust in-ground sensor probe measuring volumetric soil water content and ambient crop humidity.
                          </p>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              Soil moisture
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              Air humidity
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              Reading history
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 pt-0">
                        <span className="text-[11px] text-outline block mb-3 font-medium">
                          Registers as a unit in your account.
                        </span>
                        <button
                          className="w-full h-11 rounded-xl bg-surface-container-low text-secondary hover:bg-secondary-fixed hover:text-on-secondary-fixed-variant font-label-md text-label-md font-bold transition-all cursor-pointer"
                          onClick={() => handleOpenAuth('signup')}
                          type="button"
                        >
                          Learn more
                        </button>
                      </div>
                    </div>

                    {/* Product 2: Camera Unit */}
                    <div className="w-[320px] sm:w-[360px] flex-shrink-0 snap-start bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="h-48 w-full bg-surface-container overflow-hidden relative">
                          <img
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            alt="Solar powered camera unit for wheat stage detection"
                            src="/assets/images/solar-camera-unit.jpg"
                          />
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-surface-container-lowest/90 text-[11px] font-bold text-on-surface shadow">
                            Optical Vision
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-2">
                            Camera Unit
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                            Solar-powered pole-mounted outdoor camera capturing optical wheat canopy photos for stage detection.
                          </p>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              Crop photos
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              Wheat stage detection
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              93% validation accuracy
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 pt-0">
                        <span className="text-[11px] text-outline block mb-3 font-medium">
                          Registers as a unit in your account.
                        </span>
                        <button
                          className="w-full h-11 rounded-xl bg-surface-container-low text-secondary hover:bg-secondary-fixed hover:text-on-secondary-fixed-variant font-label-md text-label-md font-bold transition-all cursor-pointer"
                          onClick={() => handleOpenAuth('signup')}
                          type="button"
                        >
                          Learn more
                        </button>
                      </div>
                    </div>

                    {/* Product 3: Complete Combo Unit */}
                    <div className="w-[320px] sm:w-[360px] flex-shrink-0 snap-start bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md flex flex-col justify-between relative">
                      <div className="absolute top-3 right-3 z-10 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-extrabold uppercase tracking-wider shadow">
                        Complete kit
                      </div>
                      <div>
                        <div className="h-48 w-full bg-surface-container overflow-hidden relative">
                          <img
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            alt="Complete combo field array"
                            src="/assets/images/farmer-portrait.jpg"
                          />
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-surface-container-lowest/90 text-[11px] font-bold text-on-surface shadow">
                            Combo Field Array
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-2">
                            Complete Combo Unit
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                            Integrated telemetry kit with soil probe and canopy camera providing the complete field data picture.
                          </p>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              Sensors + camera
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              Full farm picture
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                              One farm profile
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 pt-0">
                        <span className="text-[11px] text-outline block mb-3 font-medium">
                          Registers as a unit in your account.
                        </span>
                        <button
                          className="w-full h-11 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md font-bold transition-all shadow-sm cursor-pointer"
                          onClick={() => handleOpenAuth('signup')}
                          type="button"
                        >
                          Learn more
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* =====================================================================
          FOOTER
          ===================================================================== */}
      <footer className="w-full bg-surface-container-lowest mt-space-xl relative overflow-hidden">
        <div className="w-full h-8 overflow-hidden leading-none text-surface-container-low">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 120">
            <path d="M0,0 C150,90 350,-40 500,45 C650,130 900,10 1200,40 L1200,120 L0,120 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="bg-surface-container-low w-full pt-space-lg pb-space-xl">
          <div className="max-w-7xl mx-auto px-margin-desktop">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter-desktop mb-space-xl">
              {/* Brand Col */}
              <div className="flex flex-col gap-space-md">
                <div className="flex items-center gap-space-sm">
                  <img
                    alt="Farm Assistant Logo"
                    className="h-7 w-auto object-contain"
                    src="/assets/images/logo.png"
                  />
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Farm<span className="text-primary ml-0.5">Assistant</span>
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                  Empowering Indian farmers through solar-synced drip intelligence and predictive precision irrigation
                  telemetry.
                </p>
                <div className="flex items-center gap-space-sm">
                  <a
                    aria-label="Connect on social network"
                    className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-secondary-fixed transition-colors"
                    href="#"
                  >
                    <span className="material-symbols-outlined text-[18px]">tag</span>
                  </a>
                  <a
                    aria-label="Connect on business network"
                    className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-secondary-fixed transition-colors"
                    href="#"
                  >
                    <span className="material-symbols-outlined text-[18px]">hub</span>
                  </a>
                  <a
                    aria-label="Follow visual gallery"
                    className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-secondary-fixed transition-colors"
                    href="#"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  </a>
                  <a
                    aria-label="Watch video tutorials"
                    className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-secondary-fixed transition-colors"
                    href="#"
                  >
                    <span className="material-symbols-outlined text-[18px]">smart_display</span>
                  </a>
                </div>
              </div>

              {/* Quick Links Col */}
              <div>
                <h4 className="font-label-lg text-label-lg text-on-surface uppercase tracking-wider mb-space-md">
                  Quick Links
                </h4>
                <ul className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                  <li>
                    <a className="hover:text-primary transition-colors" href="#home">
                      Home
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-colors" href="#problem">
                      Problem
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-colors" href="#features">
                      Features
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-colors" href="#products">
                      Products
                    </a>
                  </li>
                </ul>
              </div>

              {/* Resources Col */}
              <div>
                <h4 className="font-label-lg text-label-lg text-on-surface uppercase tracking-wider mb-space-md">
                  Resources
                </h4>
                <ul className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                  <li>
                    <a className="hover:text-primary transition-colors" href="#">
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-colors" href="#">
                      Support Desk
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-colors" href="#">
                      Solar Micro-Pump FAQ
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-colors" href="#">
                      Agronomy Guides
                    </a>
                  </li>
                </ul>
              </div>

              {/* Legal & Contact Col */}
              <div>
                <h4 className="font-label-lg text-label-lg text-on-surface uppercase tracking-wider mb-space-md">
                  Legal & Contact
                </h4>
                <ul className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                  <li>
                    <a className="hover:text-primary transition-colors" href="#">
                      Terms & Conditions
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-colors" href="#">
                      Privacy Policy
                    </a>
                  </li>
                  <li className="flex items-center gap-space-xs text-on-surface pt-space-xs">
                    <span className="material-symbols-outlined text-[16px] text-primary">mail</span>
                    <span>support@farmassistant.in</span>
                  </li>
                  <li className="flex items-center gap-space-xs text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                    <span>India</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-space-md border-t border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-space-md font-body-sm text-body-sm text-on-surface-variant">
              <p>© 2026 Farm Assistant. All rights reserved.</p>
              <p className="flex items-center gap-space-xs font-label-md text-label-md text-secondary">
                <span className="material-symbols-outlined text-[18px]">spa</span>
                Made for Indian farmers
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          AUTHENTICATION MODAL
          ===================================================================== */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseAuth();
          }}
        >
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl p-6 sm:p-space-xl shadow-[0_24px_48px_-12px_rgba(20,83,45,0.22)] relative max-h-[92vh] overflow-y-auto border border-outline-variant/30">
            {/* Close Button */}
            <button
              aria-label="Close modal"
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              onClick={handleCloseAuth}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Brand Header */}
            <div className="flex items-center gap-space-sm mb-4">
              <img
                alt="Brand logo"
                className="h-6 w-auto object-contain"
                src="/assets/images/logo.png"
              />
              <span className="font-headline-sm text-headline-sm text-on-surface">
                Farm<span className="text-primary">Assistant</span>
              </span>
            </div>

            {/* Tabs for Log in / Sign up */}
            <div className="flex bg-surface-container-low p-1 rounded-xl mb-5">
              <button
                className={`flex-1 py-2 rounded-lg font-label-md text-label-md transition-all duration-200 cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                }}
                type="button"
              >
                Log in
              </button>
              <button
                className={`flex-1 py-2 rounded-lg font-label-md text-label-md transition-all duration-200 cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => {
                  setAuthMode('signup');
                  setError(null);
                }}
                type="button"
              >
                Sign up
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-error-container/40 border border-error/20 text-error text-xs font-medium">
                {error}
              </div>
            )}

            {/* STATE 1: LOG IN */}
            {authMode === 'login' && (
              <div className="flex flex-col">
                <div className="mb-4">
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Welcome back</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Log in to view your farm telemetry and crop water status.
                  </p>
                </div>
                <form className="flex flex-col gap-4" onSubmit={handleAuthSubmit}>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="login-email">
                      Email
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">mail</span>
                      <input
                        className="w-full h-[48px] pl-11 pr-4 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none font-body-md text-body-md text-on-surface"
                        id="login-email"
                        placeholder="kisan@example.com"
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="font-label-md text-label-md text-on-surface" htmlFor="login-password">
                        Password
                      </label>
                      <button
                        className="text-xs text-secondary hover:underline font-label-sm cursor-pointer"
                        onClick={() => alert('Password reset instructions sent to your email.')}
                        type="button"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">lock</span>
                      <input
                        className="w-full h-[48px] pl-11 pr-11 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none font-body-md text-body-md text-on-surface"
                        id="login-password"
                        placeholder="••••••••"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        aria-label="Toggle password visibility"
                        className="absolute right-3 text-outline hover:text-on-surface flex items-center justify-center p-1 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <button
                    className="mt-2 w-full h-[50px] rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg shadow-sm hover:shadow-md hover:bg-secondary/95 transition-all cursor-pointer disabled:opacity-50"
                    disabled={loading}
                    type="submit"
                  >
                    {loading ? 'Logging in...' : 'Log in'}
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-outline-variant/50" />
                    <span className="flex-shrink mx-4 text-xs font-semibold uppercase text-outline">or</span>
                    <div className="flex-grow border-t border-outline-variant/50" />
                  </div>

                  <button
                    className="w-full h-[46px] rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-md text-label-md font-bold shadow-sm hover:bg-secondary-fixed-dim transition-all flex items-center justify-center gap-2 cursor-pointer"
                    onClick={handleQuickDemoLogin}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">bolt</span>
                    Instant Demo Login (Ramesh Patel)
                  </button>

                  <p className="text-center font-body-sm text-body-sm text-on-surface-variant pt-2">
                    Don't have an account?{' '}
                    <button
                      className="text-secondary font-label-md text-label-md font-bold hover:underline cursor-pointer ml-1"
                      onClick={() => {
                        setAuthMode('signup');
                        setError(null);
                      }}
                      type="button"
                    >
                      Sign up
                    </button>
                  </p>
                </form>
              </div>
            )}

            {/* STATE 2: SIGN UP */}
            {authMode === 'signup' && (
              <div className="flex flex-col">
                <div className="mb-4">
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Create your account</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Start optimizing solar irrigation and monitoring soil health.
                  </p>
                </div>
                <form className="flex flex-col gap-3.5" onSubmit={handleAuthSubmit}>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="signup-email">
                      Email
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">mail</span>
                      <input
                        className="w-full h-[48px] pl-11 pr-4 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none font-body-md text-body-md text-on-surface"
                        id="signup-email"
                        placeholder="kisan@example.com"
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="signup-password">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">lock</span>
                      <input
                        className="w-full h-[48px] pl-11 pr-11 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none font-body-md text-body-md text-on-surface"
                        id="signup-password"
                        placeholder="At least 8 characters"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        aria-label="Toggle password visibility"
                        className="absolute right-3 text-outline hover:text-on-surface flex items-center justify-center p-1 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-md text-label-md text-on-surface" htmlFor="signup-confirm-password">
                      Confirm Password
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                        lock_reset
                      </span>
                      <input
                        className="w-full h-[48px] pl-11 pr-11 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none font-body-md text-body-md text-on-surface"
                        id="signup-confirm-password"
                        placeholder="Re-enter password"
                        required
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        aria-label="Toggle confirm password visibility"
                        className="absolute right-3 text-outline hover:text-on-surface flex items-center justify-center p-1 cursor-pointer"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      className="w-4 h-4 mt-1 rounded text-secondary focus:ring-secondary accent-secondary cursor-pointer"
                      id="signup-agree"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      type="checkbox"
                    />
                    <label
                      className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer select-none"
                      htmlFor="signup-agree"
                    >
                      I agree to the <a className="text-secondary underline" href="#">Terms & Conditions</a> and{' '}
                      <a className="text-secondary underline" href="#">Privacy Policy</a>
                    </label>
                  </div>
                  <button
                    className="mt-2 w-full h-[50px] rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg shadow-sm hover:shadow-md hover:bg-secondary/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    disabled={!agreeTerms || loading}
                    id="signup-submit-btn"
                    type="submit"
                  >
                    {loading ? 'Creating Account...' : 'Sign up'}
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-outline-variant/50" />
                    <span className="flex-shrink mx-4 text-xs font-semibold uppercase text-outline">or</span>
                    <div className="flex-grow border-t border-outline-variant/50" />
                  </div>

                  <button
                    className="w-full h-[46px] rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-md text-label-md font-bold shadow-sm hover:bg-secondary-fixed-dim transition-all flex items-center justify-center gap-2 cursor-pointer"
                    onClick={handleQuickDemoLogin}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">bolt</span>
                    Instant Demo Login (Ramesh Patel)
                  </button>

                  <p className="text-center font-body-sm text-body-sm text-on-surface-variant pt-2">
                    Already have an account?{' '}
                    <button
                      className="text-secondary font-label-md text-label-md font-bold hover:underline cursor-pointer ml-1"
                      onClick={() => {
                        setAuthMode('login');
                        setError(null);
                      }}
                      type="button"
                    >
                      Log in
                    </button>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
