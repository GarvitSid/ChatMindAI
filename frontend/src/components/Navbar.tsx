import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Bot, LogOut, Shield, User as UserIcon, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-['Outfit'] font-bold text-xl tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                ChatMind
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                AI College
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              NAAC A++ • Estd. 2005
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="/#about" className="hover:text-indigo-400 transition-colors">
            About
          </a>
          <a href="/#courses" className="hover:text-indigo-400 transition-colors">
            Courses
          </a>
          <a href="/#placements" className="hover:text-indigo-400 transition-colors">
            Placements
          </a>
          <a href="/#campus" className="hover:text-indigo-400 transition-colors">
            Campus Life
          </a>
        </nav>

        {/* User / CTA Area */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  id="nav-admin-dashboard-btn"
                  className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all"
                >
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Admin Panel</span>
                </Link>
              )}

              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white max-w-[110px] truncate">
                    {user.name}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                id="nav-logout-btn"
                title="Sign Out"
                className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                id="nav-login-btn"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                id="nav-register-btn"
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25 hover:opacity-95 hover:shadow-indigo-600/40 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Join Student Portal</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
