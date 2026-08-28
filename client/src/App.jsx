import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Components & Modals
import F1Navbar from './components/F1Navbar';
import F1AuthModal from './components/F1AuthModal';

// Pages
import LobbyPage from './pages/LobbyPage';
import RacePage from './pages/RacePage';
import StandingsPage from './pages/StandingsPage';
import ProfilePage from './pages/ProfilePage';

function MainApp() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { login } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[#08080c] text-white selection:bg-[#e10600] selection:text-white">
      
      {/* Universal F1 Navbar with React Router NavLinks */}
      <F1Navbar onOpenAuth={() => setAuthModalOpen(true)} />

      {/* Main Content Viewport */}
      <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col p-3 sm:p-5">
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/race/:roomId" element={<RacePage />} />
          <Route path="/standings" element={<StandingsPage />} />
          <Route path="/garage" element={<ProfilePage onOpenAuth={() => setAuthModalOpen(true)} />} />
        </Routes>
      </main>

      {/* Driver Superlicence Login / Register Modal */}
      <F1AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user, token) => {
          login(user, token);
        }}
      />

    </div>
  );
}

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1029384756-keysprint-f1.apps.googleusercontent.com';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <MainApp />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
