import { create } from 'zustand';
import { api } from '../api';
import type { Credentials, User } from '../api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Shared session state. Tokens stay in memory; refreshing the page signs you out.
// Select individual fields in components so they subscribe only to what they use.
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  expiresAt: null,
  isLoading: false,
  error: null,
  login: async (credentials) => {
    if (get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const tokens = await api.login(credentials);
      const user = await api.me(tokens.accessToken);
      set({ user, accessToken: tokens.accessToken, expiresAt: Date.now() + tokens.expiresIn * 1000 });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign-in failed.' });
    } finally {
      set({ isLoading: false });
    }
  },
  register: async (credentials) => {
    if (get().isLoading) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await api.register(credentials);
      set({ isLoading: false });
      await get().login(credentials);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Registration failed.', isLoading: false });
    }
  },
  logout: () => set({ user: null, accessToken: null, expiresAt: null, error: null }),
  clearError: () => set({ error: null }),
}));
