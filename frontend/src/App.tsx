import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProfileProvider } from './state/ProfileProvider';
import { RouteGuard } from './components/RouteGuard';
import { LandingPage } from './pages/LandingPage';
import { ProfilePage } from './pages/ProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateFarmPage } from './pages/CreateFarmPage';
import { FarmDetailPage } from './pages/FarmDetailPage';
import { isAuthenticated } from './api/auth';
import { useProfile } from './state/ProfileProvider';
import { Loader2 } from 'lucide-react';

// Special wrapper for the profile page that handles onboarding vs edit mode.
// Also guards the route reactively — isAuthenticated() is called inside a
// component so it re-evaluates on every render instead of being frozen at
// the moment AppRoutes first mounts.
function ProfileRoute() {
  const { isOnboarding, status } = useProfile();

  // Not authenticated → go to landing
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-forest" />
      </div>
    );
  }

  return <ProfilePage mode={isOnboarding ? 'onboarding' : 'edit'} />;
}

// Reactive landing-page guard: redirects authenticated users to dashboard.
// Defined as a component so isAuthenticated() is evaluated on every render.
function LandingOrDashboard() {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingOrDashboard />} />

      {/* Profile can be accessed even during onboarding */}
      <Route path="/profile" element={<ProfileRoute />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <RouteGuard>
            <DashboardPage />
          </RouteGuard>
        }
      />
      <Route
        path="/farms/new"
        element={
          <RouteGuard>
            <CreateFarmPage />
          </RouteGuard>
        }
      />
      <Route
        path="/farms/:farmId"
        element={
          <RouteGuard>
            <FarmDetailPage />
          </RouteGuard>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ProfileProvider>
        <AppRoutes />
      </ProfileProvider>
    </BrowserRouter>
  );
}
