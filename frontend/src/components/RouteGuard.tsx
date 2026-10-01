import React from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '../state/ProfileProvider';
import { isAuthenticated } from '../api/auth';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<Props> = ({ children }) => {
  const { status } = useProfile();

  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-forest">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Farm Assistant…</p>
        </div>
      </div>
    );
  }

  if (status === 'onboarding') {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};
