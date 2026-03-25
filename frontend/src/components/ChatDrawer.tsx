import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import {
  Bot,
  MessageSquare,
  Plus,
  Send,
  X,
  FileText,
  Sparkles,
  Loader2,
  ChevronRight,
  ShieldCheck,
  PanelLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ChatDrawer: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const {
    isDrawerOpen,
    closeDrawer,
    toggleDrawer,
    sessions,
    currentSessionId,
    messages,
    isSending,
    isLoadingHistory,
    fetchSessions,
    createSession,
    selectSession,
    sendMessage,
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (isDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, isDrawerOpen]);

  // Initial load of sessions when drawer opens
  useEffect(() => {
    if (isDrawerOpen && isAuthenticated) {
      fetchSessions();
    }
  }, [isDrawerOpen, isAuthenticated, fetchSessions]);

  const handleFloatingButtonClick = () => {
    if (!isAuthenticated) {
      toast('Please sign in to access the RAG AI Assistant', {
        icon: '🔒',
        style: {
          borderRadius: '10px',
          background: '#0f172a',
          color: '#fff',
          border: '1px solid #334155',
        },
      });
      navigate('/login');
      return;
    }
    toggleDrawer();
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const msg = inputMessage;
    setInputMessage('');
    await sendMessage(msg);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
  };

  const handleNewChat = async () => {
    try {
      await createSession('New Conversation');
    } catch {
      toast.error('Failed to create new session');
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleFloatingButtonClick}
          id="floating-chat-trigger-btn"
          aria-label="Open AI Assistant"
          className="relative group flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-semibold shadow-xl shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-105 transition-all duration-300 border border-white/20"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-bounce-short" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-950 animate-pulse" />
          </div>
          <span className="hidden sm:inline text-sm font-['Outfit'] tracking-wide">
            Chat with AI Assistant
          </span>
        </button>
      </div>

      {/* Slide-over Drawer Modal */}
      {isDrawerOpen && isAuthenticated && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm animate-fade-in flex justify-end">
          <div className="relative w-full max-w-4xl h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col md:flex-row overflow-hidden animate-slide-left">
            {/* Left Sidebar: Chat Sessions */}
            <div
              className={`${
                sidebarOpen ? 'w-full md:w-72' : 'hidden'
              } border-r border-slate-800 bg-slate-900/90 flex flex-col transition-all duration-300 shrink-0`}
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={handleNewChat}
                  id="new-chat-session-btn"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Conversation</span>
                </button>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                  History
                </div>
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No conversations yet. Start asking questions!
                  </div>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session._id}
                      onClick={() => selectSession(session._id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                        currentSessionId === session._id
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-medium'
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate flex-1">{session.title}</span>
                    </button>
                  ))
                )}
              </div>

              {/* User info in sidebar footer */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-xs font-semibold text-white truncate">{user?.name}</span>
                  <span className="text-[10px] text-slate-400 truncate">{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Main Chat Conversation Window */}
            <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
              {/* Chat Header */}
              <div className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden md:block"
                    title="Toggle Sessions Sidebar"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>

                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-['Outfit'] text-sm font-bold text-white flex items-center gap-2">
                      <span>ChatMind Knowledge Assistant</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                        RAG Active
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Strict source grounding via Pinecone & Google Gemini 3.5 Flash
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={closeDrawer}
                    id="close-chat-drawer-btn"
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Close Chat Drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    <span className="text-xs">Loading conversation history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-10">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h4 className="font-['Outfit'] text-lg font-bold text-white mb-2">
                      Ask Any Question About ChatMind AI College
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      Our RAG AI Assistant searches strictly within uploaded college policy PDFs, admission guidelines, and placement brochures.
                    </p>

                    <div className="w-full space-y-2 text-left">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                        Try asking:
                      </div>
                      {[
                        'What are the eligibility criteria for B.Tech CSE?',
                        'What is the highest and average placement CTC?',
                        'What are the hostel and campus life rules?',
                        'Are there scholarships for merit students?',
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickPrompt(prompt)}
                          className="w-full text-left p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-slate-850 transition-all flex items-center justify-between group"
                        >
                          <span>{prompt}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={msg._id || idx}
                      className={`flex gap-3.5 ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role === 'ai' && (
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 text-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                            : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none shadow-md'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>

                        {/* Render small "Source: [filename]" badge below AI text */}
                        {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                              Sources:
                            </span>
                            {msg.sources.map((source, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-medium"
                              >
                                <FileText className="w-3 h-3 text-indigo-400" />
                                <span>{source}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 text-xs font-bold">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Sending / Thinking Indicator */}
                {isSending && (
                  <div className="flex gap-3.5 justify-start">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none p-4 text-xs text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Searching Pinecone vector index & formulating verified answer with Gemini...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/70">
                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                  <input
                    type="text"
                    id="chat-query-input"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about admissions, courses, cutoffs, syllabus..."
                    disabled={isSending}
                    className="w-full py-3.5 pl-4 pr-12 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                  />
                  <button
                    type="submit"
                    id="chat-send-btn"
                    disabled={!inputMessage.trim() || isSending}
                    className="absolute right-2 p-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-40 disabled:hover:opacity-40 hover:opacity-95 shadow-md shadow-indigo-600/30 transition-all"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Zero hallucination policy: answers strictly constrained to uploaded documents
                  </span>
                  <span className="hidden sm:inline">Press Enter to send</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
