import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore.js';
import { api } from './services/api.js';

// Layout Components
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';

// Pages
import { Home } from './pages/Home.js';
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';
import { AdminDashboard } from './pages/AdminDashboard.js';

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    api.get('/health')
      .then(() => console.log("Backend is awake!"))
      .catch(() => console.log("Waking backend..."));
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            fontSize: '13px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />

      <div className="flex flex-col min-h-screen">
        <Routes>
          {/* Main Landing & Gated Experience */}
          <Route
            path="/"
            element={
              <>
                <Navbar />
                <main className="flex-1">
                  <Home />
                </main>
                <Footer />
              </>
            }
          />

          {/* Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Protected Dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <Navbar />
                <main className="flex-1">
                  <AdminDashboard />
                </main>
                <Footer />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
