// Tiny JSON-file persistence for projects + users.
// Chosen over SQLite to keep dependencies minimal for the dev backend.
// Writes are debounced + serialized through a single queue so concurrent
// requests can't interleave the file write.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DialogueScript } from '../types/script.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../db.json');

export interface UserRecord {
  id: string; // internal user id
  openid: string; // provider (WeChat / Alipay) id
  provider: 'wechat' | 'alipay';
  tier: 'free' | 'premium';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  ownerId: string; // user id (anonymous or paid)
  title: string;
  script: DialogueScript;
  createdAt: string;
  updatedAt: string;
}

interface DbShape {
  users: UserRecord[];
  projects: ProjectRecord[];
}

const EMPTY: DbShape = { users: [], projects: [] };

let state: DbShape = EMPTY;
let writeChain: Promise<void> = Promise.resolve();
let loaded = false;

async function load(): Promise<void> {
  if (loaded) return;
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    state = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') {
      console.warn('[db] could not read db.json, starting empty:', e.message);
    }
    state = { ...EMPTY };
  }
  loaded = true;
}

async function persist(): Promise<void> {
  const json = JSON.stringify(state, null, 2);
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  // atomic-ish write: tmp -> rename
  const tmp = `${DB_PATH}.tmp-${process.pid}`;
  await fs.writeFile(tmp, json, 'utf8');
  await fs.rename(tmp, DB_PATH);
}

// Public read helpers ------------------------------------------------------

export async function db(): Promise<DbShape> {
  await load();
  return state;
}

// Queue a mutation so concurrent callers don't race the file write.
function withWrite<T>(mutator: () => T | Promise<T>): Promise<T> {
  const next = writeChain.then(async () => {
    const out = await mutator();
    await persist();
    return out;
  });
  // Swallow errors on the chain anchor so one failure doesn't poison later writes.
  writeChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

// Users --------------------------------------------------------------------

export async function upsertUser(input: {
  openid: string;
  provider: 'wechat' | 'alipay';
  tier?: 'free' | 'premium';
}): Promise<UserRecord> {
  await load();
  return withWrite(() => {
    const existing = state.users.find((u) => u.openid === input.openid);
    const now = new Date().toISOString();
    if (existing) {
      if (input.tier === 'premium' && existing.tier !== 'premium') {
        existing.tier = 'premium';
        existing.updatedAt = now;
      }
      return existing;
    }
    const user: UserRecord = {
      id: `usr_${Math.random().toString(36).slice(2, 10)}`,
      openid: input.openid,
      provider: input.provider,
      tier: input.tier ?? 'free',
      createdAt: now,
      updatedAt: now,
    };
    state.users.push(user);
    return user;
  });
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  await load();
  return state.users.find((u) => u.id === id) ?? null;
}

// Projects -----------------------------------------------------------------

export async function listProjects(ownerId: string): Promise<ProjectRecord[]> {
  await load();
  return state.projects
    .filter((p) => p.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function findProject(
  id: string,
  ownerId: string,
): Promise<ProjectRecord | null> {
  await load();
  return (
    state.projects.find((p) => p.id === id && p.ownerId === ownerId) ?? null
  );
}

export async function createProject(input: {
  ownerId: string;
  title: string;
  script: DialogueScript;
}): Promise<ProjectRecord> {
  await load();
  return withWrite(() => {
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      id: `prj_${Math.random().toString(36).slice(2, 10)}`,
      ownerId: input.ownerId,
      title: input.title,
      script: input.script,
      createdAt: now,
      updatedAt: now,
    };
    state.projects.push(project);
    return project;
  });
}

export async function updateProject(
  id: string,
  ownerId: string,
  patch: { title?: string; script?: DialogueScript },
): Promise<ProjectRecord | null> {
  await load();
  return withWrite(() => {
    const proj = state.projects.find(
      (p) => p.id === id && p.ownerId === ownerId,
    );
    if (!proj) return null;
    if (patch.title !== undefined) proj.title = patch.title;
    if (patch.script !== undefined) proj.script = patch.script;
    proj.updatedAt = new Date().toISOString();
    return proj;
  });
}

export async function deleteProject(
  id: string,
  ownerId: string,
): Promise<boolean> {
  await load();
  return withWrite(() => {
    const before = state.projects.length;
    state.projects = state.projects.filter(
      (p) => !(p.id === id && p.ownerId === ownerId),
    );
    return state.projects.length < before;
  });
}
