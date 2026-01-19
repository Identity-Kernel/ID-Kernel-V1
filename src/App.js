import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { KernelProvider, useKernel } from './context/KernelContext';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Identity from './pages/Identity';
import Pulses from './pages/Pulses';
import Agents from './pages/Agents';
import Governance from './pages/Governance';
import Economy from './pages/Economy';
import Social from './pages/Social';
import AITerminal from './pages/AITerminal';
import Settings from './pages/Settings';

// Layout
import Layout from './components/Layout';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useKernel();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border border-primary/30 flex items-center justify-center mx-auto mb-4 pulse-glow">
            <div className="w-6 h-6 border-t-2 border-primary animate-spin rounded-full" />
          </div>
          <p className="font-mono text-sm text-muted-foreground">Initializing Kernel...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

// Public Route wrapper (redirect if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useKernel();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border border-primary/30 flex items-center justify-center mx-auto mb-4 pulse-glow">
            <div className="w-6 h-6 border-t-2 border-primary animate-spin rounded-full" />
          </div>
          <p className="font-mono text-sm text-muted-foreground">Initializing Kernel...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={
        <PublicRoute>
          <Landing />
        </PublicRoute>
      } />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/identity" element={
        <ProtectedRoute>
          <Identity />
        </ProtectedRoute>
      } />
      <Route path="/pulses" element={
        <ProtectedRoute>
          <Pulses />
        </ProtectedRoute>
      } />
      <Route path="/agents" element={
        <ProtectedRoute>
          <Agents />
        </ProtectedRoute>
      } />
      <Route path="/governance" element={
        <ProtectedRoute>
          <Governance />
        </ProtectedRoute>
      } />
      <Route path="/economy" element={
        <ProtectedRoute>
          <Economy />
        </ProtectedRoute>
      } />
      <Route path="/social" element={
        <ProtectedRoute>
          <Social />
        </ProtectedRoute>
      } />
      <Route path="/ai" element={
        <ProtectedRoute>
          <AITerminal />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <KernelProvider>
        <AppRoutes />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0A0A0A',
              border: '1px solid #27272A',
              color: '#FAFAFA',
              fontFamily: 'JetBrains Mono, monospace',
            },
          }}
        />
      </KernelProvider>
    </BrowserRouter>
  );
}

export default App;
