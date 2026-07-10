// Session store — JWT + anonymous clientId backed by localStorage.
// Tiny Zustand-like API is intentionally avoided so the project stays
// dep-light; a single useSyncExternalStore-backed store is enough.

import { useSyncExternalStore } from 'react';

export interface SessionState {
  token: string | null;
  clientId: string;
  user: {
    id: string;
    tier: 'free' | 'premium';
    openid?: string;
    provider?: 'wechat' | 'alipay';
  } | null;
}

const TOKEN_KEY = 'wcvgen.token';
const CLIENT_ID_KEY = 'wcvgen.clientId';
const USER_KEY = 'wcvgen.user';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'cid_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadInitial(): SessionState {
  const token = localStorage.getItem(TOKEN_KEY);
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = uuid();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  let user: SessionState['user'] = null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) user = JSON.parse(raw);
  } catch {
    user = null;
  }
  return { token, clientId, user };
}

type Listener = () => void;

class SessionStore {
  private state: SessionState = loadInitial();
  private listeners: Set<Listener> = new Set();

  getState = (): SessionState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setToken(token: string | null, user: SessionState['user'] = null): void {
    this.state = { ...this.state, token, user };
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
    this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

export const useSessionStore = new SessionStore();

export function useSession(): SessionState {
  return useSyncExternalStore(
    useSessionStore.subscribe,
    useSessionStore.getState,
    useSessionStore.getState,
  );
}

// Convenience hook that always returns a stable clientId (so callers
// can `useSession()` and not care about object identity churn).
export function useClientId(): string {
  return useSession().clientId;
}
