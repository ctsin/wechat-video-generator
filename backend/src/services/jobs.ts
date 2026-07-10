// Render-job store. Jobs are in-memory keyed by id; the frontend polls
// GET /api/render/:id until status is "done". When status reaches "done"
// the store also exposes a public URL the browser can hit to download
// the produced MP4.
//
// In the dev (non-AWS) path the URL points at /static/preview/*.mp4 so the
// front-end can actually verify the full loop without Lambda access.

import { nanoid } from 'nanoid';
import { env, remotionLambdaReady } from '../lib/env.js';

export type JobTier = 'free' | 'premium';
export type JobStatus = 'queued' | 'rendering' | 'done' | 'failed';

export interface RenderJob {
  id: string;
  tier: JobTier;
  ownerId: string;
  watermark: boolean;
  status: JobStatus;
  progress: number; // 0..1
  outputUrl?: string;
  compositionId?: string;
  remoteRenderId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const jobs = new Map<string, RenderJob>();

function nowIso(): string {
  return new Date().toISOString();
}

export function createJob(input: {
  tier: JobTier;
  ownerId: string;
  watermark: boolean;
}): RenderJob {
  const job: RenderJob = {
    id: `job_${nanoid(12)}`,
    tier: input.tier,
    ownerId: input.ownerId,
    watermark: input.watermark,
    status: 'queued',
    progress: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): RenderJob | null {
  return jobs.get(id) ?? null;
}

export function updateJob(
  id: string,
  patch: Partial<RenderJob>,
): RenderJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  Object.assign(job, patch, { updatedAt: nowIso() });
  return job;
}

export function listJobsFor(ownerId: string): RenderJob[] {
  return Array.from(jobs.values())
    .filter((j) => j.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Build a fully-qualified URL the browser can fetch the produced MP4 from.
export function publicUrlFor(jobId: string): string {
  return `${env.PUBLIC_BASE_URL}/static/renders/${jobId}.mp4`;
}

export const isLambdaEnabled = (): boolean => remotionLambdaReady;
