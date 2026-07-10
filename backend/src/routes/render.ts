// Render routes: anonymous watermarked preview vs premium HD render.
// Both share the job-store so the front-end can poll the same /api/render/:id.

import { Router, type Request, type Response } from 'express';
import { requireJwt } from '../middleware/auth.js';
import {
  FREE_TIER_LIMITS,
  PREMIUM_TIER_LIMITS,
  validateScript,
} from '../middleware/validateScript.js';
import {
  createJob,
  getJob,
  listJobsFor,
  publicUrlFor,
  type RenderJob,
} from '../services/jobs.js';
import { startRender } from '../services/render.js';
import type { DialogueScript } from '../types/script.js';

export const renderRouter: Router = Router();

// Anonymous preview — no JWT required, always watermarked, free tier limits.
// The returned job id has no ownership filter; the rendered MP4 URL is opaque.
renderRouter.post('/preview/render', (req: Request, res: Response) => {
  let script: DialogueScript;
  try {
    script = validateScript(req.body?.script, FREE_TIER_LIMITS);
  } catch (err) {
    // The error handler middleware turns the throw into a JSON 400.
    throw err;
  }
  const job = createJob({
    tier: 'free',
    ownerId: 'anonymous',
    watermark: true,
  });
  startRender(job, script);
  res.status(202).json({ job: projectJob(job) });
});

// Premium HD render — JWT required, free of watermark, premium limits.
renderRouter.post('/render', requireJwt, (req: Request, res: Response) => {
  const user = req.user!;
  if (user.tier !== 'premium') {
    res.status(403).json({ error: 'premium_required' });
    return;
  }
  let script: DialogueScript;
  try {
    script = validateScript(req.body?.script, PREMIUM_TIER_LIMITS);
  } catch (err) {
    throw err;
  }
  const job = createJob({
    tier: 'premium',
    ownerId: user.id,
    watermark: false,
  });
  startRender(job, script);
  res.status(202).json({ job: projectJob(job) });
});

renderRouter.get(
  '/render/:id',
  requireJwt,
  (req: Request, res: Response) => {
    const job = getJob(req.params.id);
    if (!job || job.ownerId !== req.user!.id) {
      res.status(404).json({ error: 'job_not_found' });
      return;
    }
    res.json({ job: projectJob(job) });
  },
);

// Unauthenticated status for anonymous preview jobs — the id is already
// opaque + unguessable (nanoid), so exposing status without a JWT is fine
// for the dev loop. In production we could sign the id instead.
renderRouter.get('/preview/render/:id', (req: Request, res: Response) => {
  const job = getJob(req.params.id);
  if (!job || job.tier !== 'free') {
    res.status(404).json({ error: 'job_not_found' });
    return;
  }
  res.json({ job: projectJob(job) });
});

renderRouter.get('/jobs', requireJwt, (req: Request, res: Response) => {
  res.json({ items: listJobsFor(req.user!.id).map(projectJob) });
});

function projectJob(job: RenderJob): Record<string, unknown> {
  return {
    id: job.id,
    tier: job.tier,
    status: job.status,
    progress: job.progress,
    watermark: job.watermark,
    outputUrl: job.outputUrl ?? (job.status === 'done' ? publicUrlFor(job.id) : undefined),
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
