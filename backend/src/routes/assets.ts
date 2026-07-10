// BGM asset upload. Accepts audio/mpeg, audio/wav, audio/x-wav; sizes
// capped by MAX_BGM_BYTES. Files land in <repo>/backend/uploads/bgm and
// are served back at /static/bgm/<safe-name>.

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../lib/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/bgm');

const ALLOWED_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const safe = file.originalname
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(-80);
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: env.MAX_BGM_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error(`unsupported_mime:${file.mimetype}`));
  },
});

export const assetsRouter: Router = Router();

assetsRouter.post(
  '/bgm',
  (req: Request, res: Response, next) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const msg = err instanceof Error ? err.message : 'upload_failed';
        res.status(400).json({ error: msg });
        return;
      }
      next();
    });
  },
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'no_file' });
      return;
    }
    const url = `${env.PUBLIC_BASE_URL}/static/bgm/${req.file.filename}`;
    res.status(201).json({
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mime: req.file.mimetype,
        size: req.file.size,
        url,
      },
    });
  },
);
