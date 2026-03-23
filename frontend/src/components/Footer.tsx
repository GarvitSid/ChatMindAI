import React from 'react';
import { Bot, Mail, MapPin, Phone, Heart } from 'lucide-react';
import { COLLEGE_DATA } from '../data/content.js';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-['Outfit'] font-bold text-xl text-white">
              {COLLEGE_DATA.name}
            </span>
          </div>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            {COLLEGE_DATA.tagline}. Leading the academic revolution through cutting-edge research, hands-on industry collaborations, and AI-first engineering pedagogy.
          </p>
          <div className="flex flex-col gap-2 text-xs text-slate-400 pt-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{COLLEGE_DATA.campusSize}, {COLLEGE_DATA.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>admissions@chatmind.edu</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>+91 (0) 80 4492 8800</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
            Academic Programs
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li><a href="#courses" className="hover:text-indigo-400 transition-colors">B.Tech Computer Science & AI</a></li>
            <li><a href="#courses" className="hover:text-indigo-400 transition-colors">B.Tech Data Science</a></li>
            <li><a href="#courses" className="hover:text-indigo-400 transition-colors">B.Tech Electronics & IoT</a></li>
            <li><a href="#courses" className="hover:text-indigo-400 transition-colors">M.Tech AI & Machine Intelligence</a></li>
            <li><a href="#courses" className="hover:text-indigo-400 transition-colors">M.Tech Cybersecurity</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
            Campus & Portals
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li><a href="#placements" className="hover:text-indigo-400 transition-colors">Placement Records & CTC</a></li>
            <li><a href="#campus" className="hover:text-indigo-400 transition-colors">Maker Labs & Robotics</a></li>
            <li><a href="/login" className="hover:text-indigo-400 transition-colors">Student AI Assistant Portal</a></li>
            <li><a href="/admin" className="hover:text-indigo-400 transition-colors">Admin Knowledge Base</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <div>
          © {new Date().getFullYear()} {COLLEGE_DATA.name}. All rights reserved. {COLLEGE_DATA.accreditation}.
        </div>
        <div className="flex items-center gap-1">
          <span>Powered by RAG Pipeline with Google Gemini & Pinecone</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline ml-1" />
        </div>
      </div>
    </footer>
  );
};
