import { create } from 'zustand';
import { api } from '../services/api.js';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const getStoredToken = (): string | null => localStorage.getItem('chatmind_auth_token');
const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('chatmind_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  isAuthenticated: Boolean(getStoredToken()),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;

      localStorage.setItem('chatmind_auth_token', token);
      localStorage.setItem('chatmind_auth_user', JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { token, user } = response.data.data;

      localStorage.setItem('chatmind_auth_token', token);
      localStorage.setItem('chatmind_auth_user', JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('chatmind_auth_token');
    localStorage.removeItem('chatmind_auth_user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      const user = response.data.data.user;
      localStorage.setItem('chatmind_auth_user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('chatmind_auth_token');
      localStorage.removeItem('chatmind_auth_user');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
