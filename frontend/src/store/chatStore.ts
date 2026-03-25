import { create } from 'zustand';
import { api } from '../services/api.js';

export interface Message {
  _id: string;
  sessionId?: string;
  role: 'user' | 'ai';
  content: string;
  sources: string[];
  createdAt: string;
}

export interface Session {
  _id: string;
  title: string;
  createdAt: string;
}

interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  isDrawerOpen: boolean;
  isSending: boolean;
  isLoadingHistory: boolean;
  
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  
  fetchSessions: () => Promise<void>;
  createSession: (title?: string) => Promise<string>;
  selectSession: (sessionId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  clearActiveSession: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isDrawerOpen: false,
  isSending: false,
  isLoadingHistory: false,

  openDrawer: () => {
    set({ isDrawerOpen: true });
    get().fetchSessions();
  },

  closeDrawer: () => set({ isDrawerOpen: false }),

  toggleDrawer: () => {
    const nextState = !get().isDrawerOpen;
    set({ isDrawerOpen: nextState });
    if (nextState) {
      get().fetchSessions();
    }
  },

  clearActiveSession: () => {
    set({ currentSessionId: null, messages: [] });
  },

  fetchSessions: async () => {
    try {
      const response = await api.get('/chat/sessions');
      const sessions = response.data.data || [];
      set({ sessions });
      
      // If no current session is active and we have sessions, select the latest
      if (!get().currentSessionId && sessions.length > 0) {
        get().selectSession(sessions[0]._id);
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    }
  },

  createSession: async (title?: string) => {
    try {
      const response = await api.post('/chat/sessions', { title: title || 'New Conversation' });
      const newSession = response.data.data;
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        currentSessionId: newSession._id,
        messages: [],
      }));
      return newSession._id;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  },

  selectSession: async (sessionId: string) => {
    set({ currentSessionId: sessionId, isLoadingHistory: true });
    try {
      const response = await api.get(`/chat/sessions/${sessionId}`);
      const { messages } = response.data.data;
      set({ messages: messages || [], isLoadingHistory: false });
    } catch (error) {
      console.error('Error loading session messages:', error);
      set({ isLoadingHistory: false });
    }
  },

  sendMessage: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const { currentSessionId, messages } = get();

    // Optimistic user message
    const tempUserMsg: Message = {
      _id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      sources: [],
      createdAt: new Date().toISOString(),
    };

    set({
      messages: [...messages, tempUserMsg],
      isSending: true,
    });

    try {
      const response = await api.post('/chat/ask', {
        sessionId: currentSessionId,
        message: trimmed,
      });

      const { sessionId, userMessage, aiMessage } = response.data.data;

      // Update active session ID and messages list
      set((state) => {
        const filtered = state.messages.filter((m) => m._id !== tempUserMsg._id);
        return {
          currentSessionId: sessionId,
          messages: [...filtered, userMessage, aiMessage],
          isSending: false,
        };
      });

      // Refresh sessions to get updated titles
      get().fetchSessions();
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg: Message = {
        _id: `err-${Date.now()}`,
        role: 'ai',
        content: error instanceof Error ? error.message : 'Failed to retrieve response from knowledge base.',
        sources: [],
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, errorMsg],
        isSending: false,
      }));
    }
  },
}));
