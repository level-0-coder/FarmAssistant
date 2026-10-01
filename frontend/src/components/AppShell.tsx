import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '../state/ProfileProvider';
import { User } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export const AppShell: React.FC<Props> = ({ children, breadcrumbs = [] }) => {
  const { profile, isOnboarding } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const userInitial = profile?.name ? profile.name.trim().charAt(0).toUpperCase() : null;

  return (
    <div className="min-h-screen bg-warm text-slate-800 flex flex-col font-sans">
      {/* FIXED TOP BAR */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-emerald-950/10 z-40 px-4 sm:px-8 flex items-center justify-between shadow-[0_1px_4px_rgba(20,83,45,0.04)]">
        {/* LEFT: Word "Dashboard" */}
        <Link
          to={isOnboarding ? '#' : '/dashboard'}
          className={`text-xl sm:text-2xl font-extrabold font-heading text-forest tracking-tight hover:text-leaf-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 rounded-lg px-2 py-1 ${
            isOnboarding ? 'pointer-events-none opacity-60' : ''
          }`}
          aria-label="Dashboard Home"
        >
          Dashboard
        </Link>

        {/* RIGHT: Round Profile Icon */}
        {!isOnboarding ? (
          <button
            onClick={() => navigate('/profile')}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 focus-visible:ring-offset-2 ${
              location.pathname === '/profile'
                ? 'bg-forest text-white ring-2 ring-forest ring-offset-2'
                : 'bg-leaf-50 text-forest border border-leaf-200 hover:bg-leaf-100 hover:scale-105'
            }`}
            aria-label="View and edit profile"
            title="Profile"
          >
            {userInitial ? (
              <span>{userInitial}</span>
            ) : (
              <User className="w-5 h-5 text-forest" />
            )}
          </button>
        ) : (
          <div
            className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center cursor-not-allowed border border-slate-200 opacity-60"
            aria-disabled="true"
            title="Complete profile setup first"
          >
            <User className="w-5 h-5" />
          </div>
        )}
      </header>

      {/* BODY CONTENT BELOW FIXED HEADER */}
      <main className="flex-1 pt-16 flex flex-col">
        {/* BREADCRUMB STRIP (If provided) */}
        {breadcrumbs.length > 0 && (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-3">
            <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.label}>
                    {idx > 0 && <span className="text-slate-300">/</span>}
                    {crumb.href && !isLast ? (
                      <Link
                        to={crumb.href}
                        className="hover:text-forest transition-colors focus:outline-none focus:underline"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? 'text-forest font-bold' : 'text-slate-500'}>
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>
        )}

        {/* PAGE CONTENT */}
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pb-12 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
};
