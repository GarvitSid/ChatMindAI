import React from 'react';
import { Link } from 'react-router-dom';
import { COLLEGE_DATA } from '../data/content.js';
import { GatedTeaser } from '../components/GatedTeaser.js';
import { SignupPopup } from '../components/SignupPopup.js';
import { ChatDrawer } from '../components/ChatDrawer.js';
import {
  Sparkles,
  Award,
  GraduationCap,
  Building,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Clock,
} from 'lucide-react';

export const Home: React.FC = () => {
  const { hero, about, courses } = COLLEGE_DATA;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[800px] -left-64 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[1600px] -right-64 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 text-xs font-semibold uppercase tracking-wider mb-8 animate-fade-in shadow-sm">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{hero.badge}</span>
        </div>

        {/* Headline */}
        <h1 className="font-['Outfit'] text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight max-w-5xl mx-auto leading-[1.1] mb-6">
          Where <span className="text-gradient">Artificial Intelligence</span> Meets World-Class Engineering
        </h1>

        {/* Subheadline */}
        <p className="text-slate-300 text-base sm:text-xl max-w-3xl mx-auto mb-10 leading-relaxed font-light">
          {hero.subheadline}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#courses"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-semibold text-base shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] transition-all"
          >
            <GraduationCap className="w-5 h-5" />
            <span>Explore Programs</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#placements"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-base border border-slate-800 transition-all hover:border-slate-700"
          >
            <Award className="w-5 h-5 text-indigo-400" />
            <span>View Placement Records</span>
          </a>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {hero.stats.map((stat, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl glass-panel border border-slate-800/80 hover:border-indigo-500/30 transition-all group"
            >
              <div className="font-['Outfit'] text-2xl sm:text-4xl font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                {stat.number}
              </div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-850">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold uppercase tracking-wider">
              <Building className="w-3.5 h-3.5" />
              <span>Campus Heritage</span>
            </div>
            <h2 className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              {about.subtitle}
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {about.description}
            </p>
            <div className="pt-2 flex items-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>NAAC A++ Accredited</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>AICTE Approved</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {about.pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2.5 hover:border-indigo-500/40 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                  0{idx + 1}
                </div>
                <h3 className="font-['Outfit'] text-base font-bold text-white">
                  {pillar.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses / Academics Section */}
      <section id="courses" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-850">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Academic Curriculum</span>
          </div>
          <h2 className="font-['Outfit'] text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Accredited Undergraduate & Postgraduate Programs
          </h2>
          <p className="text-slate-400 mt-4 text-base">
            Industry-aligned curriculum designed in collaboration with Silicon Valley and global AI research labs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="glass-panel glass-panel-hover p-7 rounded-3xl border border-slate-800 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 uppercase">
                    {course.degree}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{course.duration}</span>
                  </div>
                </div>

                <h3 className="font-['Outfit'] text-xl font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                  {course.title}
                </h3>
                <span className="text-xs text-indigo-400 font-medium block mb-4">
                  {course.department}
                </span>

                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  {course.description}
                </p>

                <div className="space-y-2 mb-6">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Key Highlights:
                  </span>
                  {course.highlights.map((item, hIdx) => (
                    <div key={hIdx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Intake: <strong className="text-white">{course.seats} Seats</strong></span>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gated Teaser: Placements & Campus Life */}
      <GatedTeaser />

      {/* 50% Scroll Signup Popup */}
      <SignupPopup />

      {/* Floating AI Chat Trigger / Drawer */}
      <ChatDrawer />
    </div>
  );
};
