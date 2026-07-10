// Project CRUD. The dialog editor in the frontend persists scripts here
// keyed by the anonymous owner id (issued via /api/auth/anonymous).

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  createProject,
  deleteProject,
  findProject,
  listProjects,
  updateProject,
} from '../lib/db.js';
import { requireJwt } from '../middleware/auth.js';
import { validateScript } from '../middleware/validateScript.js';
import { LIBRARY_TIER } from '../types/script.js';

export const projectsRouter: Router = Router();

const CreateBody = z.object({
  title: z.string().min(1).max(120),
  script: z.unknown(),
});

const UpdateBody = z.object({
  title: z.string().min(1).max(120).optional(),
  script: z.unknown().optional(),
});

projectsRouter.use(requireJwt);

projectsRouter.get('/', async (req: Request, res: Response) => {
  const items = await listProjects(req.user!.id);
  res.json({
    items: items.map((p) => ({
      id: p.id,
      title: p.title,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
    })),
  });
});

projectsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }
  // Use the most permissive tier for save/load — the actual render endpoint
  // re-enforces limits against the user's JWT claims.
  const script = validateScript(parsed.data.script, LIBRARY_TIER);
  const proj = await createProject({
    ownerId: req.user!.id,
    title: parsed.data.title,
    script,
  });
  res.status(201).json({
    project: {
      id: proj.id,
      title: proj.title,
      script: proj.script,
      createdAt: proj.createdAt,
      updatedAt: proj.updatedAt,
    },
  });
});

projectsRouter.get('/:id', async (req: Request, res: Response) => {
  const proj = await findProject(req.params.id, req.user!.id);
  if (!proj) {
    res.status(404).json({ error: 'project_not_found' });
    return;
  }
  res.json({
    project: {
      id: proj.id,
      title: proj.title,
      script: proj.script,
      createdAt: proj.createdAt,
      updatedAt: proj.updatedAt,
    },
  });
});

projectsRouter.put('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    return;
  }
  let script = undefined as ReturnType<typeof validateScript> | undefined;
  if (parsed.data.script !== undefined) {
    script = validateScript(parsed.data.script, LIBRARY_TIER);
  }
  const proj = await updateProject(req.params.id, req.user!.id, {
    title: parsed.data.title,
    script,
  });
  if (!proj) {
    res.status(404).json({ error: 'project_not_found' });
    return;
  }
  res.json({
    project: {
      id: proj.id,
      title: proj.title,
      script: proj.script,
      createdAt: proj.createdAt,
      updatedAt: proj.updatedAt,
    },
  });
});

projectsRouter.delete('/:id', async (req: Request, res: Response) => {
  const ok = await deleteProject(req.params.id, req.user!.id);
  if (!ok) {
    res.status(404).json({ error: 'project_not_found' });
    return;
  }
  res.status(204).end();
});
