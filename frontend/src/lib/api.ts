// Thin fetch wrapper. Base URL = same origin in dev (Vite proxy) and prod.
// Injects the bearer JWT from sessionStorage for every request.

import { useSessionStore } from './session';

const session = () => useSessionStore.getState();

export interface JobDTO {
  id: string;
  tier: 'free' | 'premium';
  status: 'queued' | 'rendering' | 'done' | 'failed';
  progress: number;
  watermark: boolean;
  outputUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    tier: 'free' | 'premium';
    openid: string;
    provider: 'wechat' | 'alipay';
  };
}

export interface ProjectDTO {
  id: string;
  title: string;
  script: import('../types').DialogueScript;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayOrderDTO {
  orderId: string;
  amount: number;
  provider: 'wechat' | 'alipay';
  qrCode: string;
  simulateSuccessUrl: string;
}

export interface BgmUploadDTO {
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  url: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: { headers?: Record<string, string>; raw?: BodyInit },
): Promise<T> {
  const current = session();
  const headers: Record<string, string> = {
    ...(init?.headers ?? {}),
    ...(current.token ? { Authorization: `Bearer ${current.token}` } : {}),
  };
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  } else if (init?.raw !== undefined) {
    payload = init.raw;
  }
  const res = await fetch(path, { method, headers, body: payload });
  if (!res.ok) {
    let detail: unknown = undefined;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    const err = new Error(`${method} ${path} -> ${res.status}`) as Error & {
      status?: number;
      detail?: unknown;
    };
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  if (res.status === 204) return undefined as unknown as T;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export const api = {
  health: () => request<{ ok: boolean; ts: string }>('GET', '/api/health'),

  // Auth -----------------------------------------------------------------
  anonymous: (clientId: string) =>
    request<AuthResponse>('POST', '/api/auth/anonymous', { clientId }),
  me: () =>
    request<{ user: AuthResponse['user'] }>('GET', '/api/auth/me'),
  upgrade: () =>
    request<AuthResponse>('POST', '/api/auth/upgrade'),

  // Projects -------------------------------------------------------------
  listProjects: () =>
    request<{ items: ProjectSummary[] }>('GET', '/api/projects'),
  getProject: (id: string) =>
    request<{ project: ProjectDTO }>('GET', `/api/projects/${id}`),
  createProject: (title: string, script: unknown) =>
    request<{ project: ProjectDTO }>('POST', '/api/projects', {
      title,
      script,
    }),
  updateProject: (id: string, patch: { title?: string; script?: unknown }) =>
    request<{ project: ProjectDTO }>('PUT', `/api/projects/${id}`, patch),

  // Render ---------------------------------------------------------------
  previewRender: (script: unknown) =>
    request<{ job: JobDTO }>('POST', '/api/preview/render', { script }),
  premiumRender: (script: unknown) =>
    request<{ job: JobDTO }>('POST', '/api/render', { script }),
  getPreviewJob: (id: string) =>
    request<{ job: JobDTO }>('GET', `/api/preview/render/${id}`),
  getPremiumJob: (id: string) =>
    request<{ job: JobDTO }>('GET', `/api/render/${id}`),

  // Pay ------------------------------------------------------------------
  createOrder: (input: { openid: string; amount?: number; provider?: 'wechat' | 'alipay' }) =>
    request<PayOrderDTO>('POST', '/api/pay/orders', input),

  // Assets ---------------------------------------------------------------
  uploadBgm: (file: File): Promise<{ file: BgmUploadDTO }> => {
    const fd = new FormData();
    fd.append('file', file);
    const current = session();
    return fetch('/api/assets/bgm', {
      method: 'POST',
      headers: current.token
        ? { Authorization: `Bearer ${current.token}` }
        : {},
      body: fd,
    }).then(async (res) => {
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`upload failed: ${res.status} ${detail}`);
      }
      return res.json() as Promise<{ file: BgmUploadDTO }>;
    });
  },
};
