import { create } from 'zustand';
import { api, setAccessToken, refreshAccessToken } from './api';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  onboardingDone: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setAuth: (user, accessToken) => {
    setAccessToken(accessToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },
  clearAuth: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));

export async function initAuth(): Promise<boolean> {
  try {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      useAuthStore.getState().clearAuth();
      return false;
    }

    const user = await api<User>('/auth/me');
    useAuthStore.getState().setAuth(user, (await import('./api')).getAccessToken()!);
    return true;
  } catch {
    useAuthStore.getState().clearAuth();
    return false;
  }
}

export async function sendMagicLink(email: string) {
  return api<{ ok: boolean }>('/auth/send-magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyPin(email: string, pin: string) {
  const data = await api<{ accessToken: string; user: User }>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, pin }),
  });
  useAuthStore.getState().setAuth(data.user, data.accessToken);
  return data;
}

export async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  }
  useAuthStore.getState().clearAuth();
}
