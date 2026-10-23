import { create } from 'zustand';
import { api } from '../api';
import type { Credentials, User } from '../api';

interface AuthState {
  adminSession: { user: User; accessToken: string; expiresAt: number } | null;
  impersonationBusy: boolean;
  impersonationError: string | null;
  impersonate: (id: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
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
  adminSession: null,
  impersonationBusy: false,
  impersonationError: null,
  impersonate: async (id) => {
    const original = get();
    if (original.adminSession || original.impersonationBusy || !original.user?.roles.includes('PlatformAdmin')
      || !original.accessToken || !original.expiresAt || original.user.id === id) {
      return;
    }
    set({ impersonationBusy: true, impersonationError: null });
    try {
      const tokens = await api.impersonate(id, original.accessToken);
      const user = await api.me(tokens.accessToken);
      if (get().accessToken !== original.accessToken) {
        await api.stopImpersonating(tokens.accessToken);
        return;
      }
      set({
        adminSession: { user: original.user, accessToken: original.accessToken, expiresAt: original.expiresAt },
        user, accessToken: tokens.accessToken,
        expiresAt: Math.min(original.expiresAt, Date.now() + tokens.expiresIn * 1000),
      });
    } catch (error) {
      set({ impersonationError: error instanceof Error ? error.message : 'Could not impersonate user.' });
    } finally {
      set({ impersonationBusy: false });
    }
  },
  stopImpersonating: async () => {
    const { adminSession, accessToken, impersonationBusy } = get();
    if (!adminSession || !accessToken || impersonationBusy) {
      return;
    }
    set({ impersonationBusy: true, impersonationError: null });
    try {
      await api.stopImpersonating(accessToken);
      if (adminSession.expiresAt <= Date.now()) {
        get().logout();
        return;
      }
      const user = await api.me(adminSession.accessToken);
      if (get().accessToken !== accessToken) {
        return;
      }
      set({ user, accessToken: adminSession.accessToken, expiresAt: adminSession.expiresAt, adminSession: null });
    } catch (error) {
      set({ impersonationError: error instanceof Error ? error.message : 'Could not return to your account. Sign out and sign in again.' });
    } finally {
      set({ impersonationBusy: false });
    }
  },
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
  logout: () => {
    const { adminSession, accessToken } = get();
    if (adminSession && accessToken) {
      void api.stopImpersonating(accessToken).catch(() => {});
    }
    set({ user: null, accessToken: null, expiresAt: null, error: null, adminSession: null, impersonationBusy: false, impersonationError: null });
  },
  clearError: () => set({ error: null }),
}));
