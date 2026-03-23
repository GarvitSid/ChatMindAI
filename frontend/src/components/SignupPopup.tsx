import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Sparkles, X, TrendingUp, Bot, ArrowRight } from 'lucide-react';

export const SignupPopup: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasDismissed, setHasDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated || hasDismissed) return;

    const handleScroll = () => {
      const scrollTotal = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollTotal <= 0) return;

      const currentScroll = window.scrollY;
      const scrollPercentage = (currentScroll / scrollTotal) * 100;

      if (scrollPercentage >= 50 && !hasDismissed) {
        setIsOpen(true);
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAuthenticated, hasDismissed]);

  if (!isOpen || isAuthenticated) return null;

  const handleClose = () => {
    setIsOpen(false);
    setHasDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg p-8 rounded-2xl glass-panel bg-slate-900/95 border border-indigo-500/30 shadow-2xl shadow-indigo-950/80 transform transition-all animate-scale-up">
        {/* Dismiss Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close Popup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Glow badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Exclusive Student Access</span>
        </div>

        <h3 className="font-['Outfit'] text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
          Unlock 92% Placement Records & AI Assistant
        </h3>

        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
          Create your free student account today to access audited salary stats, dream company recruiter lists, and chat 24/7 with the College RAG AI Assistant!
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">₹42 LPA</div>
              <div className="text-slate-400 text-xs">Highest CTC</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">RAG AI Assistant</div>
              <div className="text-slate-400 text-xs">24/7 Instant Answers</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/register"
            onClick={handleClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all text-center"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            onClick={handleClose}
            className="flex items-center justify-center py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors text-center"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
