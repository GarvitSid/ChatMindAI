import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { COLLEGE_DATA } from '../data/content.js';
import {
  Lock,
  Sparkles,
  TrendingUp,
  Building2,
  Calendar,
  Activity,
  Cpu,
  BookOpen,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  Cpu: <Cpu className="w-6 h-6 text-indigo-400" />,
  Activity: <Activity className="w-6 h-6 text-emerald-400" />,
  BookOpen: <BookOpen className="w-6 h-6 text-blue-400" />,
  Users: <Users className="w-6 h-6 text-purple-400" />,
};

export const GatedTeaser: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { placements, campusLife } = COLLEGE_DATA;

  return (
    <section id="placements" className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Industry Proven Results</span>
        </div>
        <h2 className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Career Placements & Campus Ecosystem
        </h2>
        <p className="text-slate-400 mt-4 text-base">
          Our graduating engineers achieve premier placements across global Big Tech, hyper-growth AI startups, and prestigious research labs.
        </p>
      </div>

      {/* Main Container: Blurred if not authenticated */}
      <div className="relative">
        {/* The Gated Content */}
        <div className={`space-y-20 transition-all duration-700 ${!isAuthenticated ? 'filter blur-md pointer-events-none select-none opacity-40' : ''}`}>
          {/* Key Placement Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {placements.stats.map((stat, idx) => (
              <div
                key={idx}
                className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                  {stat.label}
                </span>
                <div className="font-['Outfit'] text-3xl sm:text-4xl font-extrabold text-white my-2">
                  {stat.value}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {stat.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Top Recruiters Cards */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-['Outfit'] text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  <span>Top Recruiting Partners</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  165+ campus recruiters offering average CTC of {placements.summary.averagePackage}
                </p>
              </div>
              <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                {placements.summary.totalOffers} Offers Extended
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {placements.topRecruiters.map((recruiter, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3.5 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-sm">
                    {recruiter.logoInitial}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{recruiter.name}</div>
                    <div className="text-[11px] text-slate-400">{recruiter.tier}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campus Life & Facilities */}
          <div id="campus" className="space-y-10">
            <div className="text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Smart 25-Acre Eco-Campus</span>
              </div>
              <h3 className="font-['Outfit'] text-2xl sm:text-3xl font-bold text-white">
                World-Class Campus Facilities & Student Life
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campusLife.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="glass-panel p-6 rounded-2xl border border-slate-800 flex gap-4 hover:border-slate-700 transition-all"
                >
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 shrink-0 h-fit">
                    {iconMap[feature.iconName] || <Sparkles className="w-6 h-6 text-indigo-400" />}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                      {feature.category}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1 mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Events Gallery */}
            <div className="glass-panel p-8 rounded-3xl border border-slate-800">
              <h4 className="font-['Outfit'] text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span>Upcoming Flagship Events & Hackathons</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {campusLife.events.map((event) => (
                  <div
                    key={event.id}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-purple-500/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                          {event.tag}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {event.date}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-white mb-2">
                        {event.title}
                      </h5>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gated Overlay for Visitors */}
        {!isAuthenticated && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20">
            <div className="max-w-md w-full p-8 rounded-3xl glass-panel bg-slate-950/90 border border-indigo-500/40 shadow-2xl shadow-indigo-950/90 text-center space-y-5 animate-pulse-glow">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <Lock className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-['Outfit'] text-2xl font-bold text-white mb-2">
                  Unlock Placement & Campus Intelligence
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Sign in or register for free to reveal our verified CTC statistics, recruiter packages, campus life galleries, and unlock the 24/7 AI chat drawer.
                </p>
              </div>

              <div className="space-y-2 text-left text-xs text-slate-300 py-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full breakdown of ₹42 LPA highest & ₹14.8 LPA average packages</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Uncensored list of 165+ recruiting technology companies</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>RAG AI Assistant answering queries strictly from official PDFs</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  to="/register"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 hover:opacity-95 transition-all text-center"
                >
                  <span>Register Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors text-center"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
