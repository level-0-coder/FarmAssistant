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

// Special wrapper for the profile page that handles onboarding vs edit mode
function ProfileRoute() {
  const { isOnboarding, status } = useProfile();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-forest" />
      </div>
    );
  }

  return <ProfilePage mode={isOnboarding ? 'onboarding' : 'edit'} />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={
          isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LandingPage />
        }
      />

      {/* Profile can be accessed even during onboarding */}
      <Route
        path="/profile"
        element={
          isAuthenticated() ? <ProfileRoute /> : <Navigate to="/" replace />
        }
      />

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
