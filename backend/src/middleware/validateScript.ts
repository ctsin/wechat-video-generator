// Tier-aware script-protocol guardrail. Validates DialogueScript against
// AGENTS.md §2 schema and §5 tier limits. Used before any /api/render
// call so we never dispatch an unsafe job into Remotion Lambda.
//
// Returns the validated+normalized script on success; throws on failure
// (the route's error handler turns this into a 400 JSON).

import { z } from 'zod';
import {
  FREE_TIER,
  PREMIUM_TIER,
  type DialogueScript,
  type TierLimits,
} from '../types/script.js';

const MessageType = z.enum(['text', 'image', 'voice', 'red_packet', 'pat']);
const Sender = z.enum(['me', 'target']);
const PhoneModel = z.enum(['standard', 'iphone17pro']);
const RedPacketSkin = z.enum(['classic_red', 'love_pink', 'gold_luxury']);

// Raw schema. We tighten framerate / resolution / counts against the
// caller's tier in a second pass.
const ScriptSchema = z
  .object({
    width: z.number().int().positive().max(3840),
    height: z.number().int().positive().max(2160),
    fps: z.number().int().positive().max(60),
    bgMusic: z.string().url().optional(),
    phoneModel: PhoneModel,
    timeline: z
      .array(
        z.object({
          id: z.string().min(1).max(128),
          type: MessageType,
          sender: Sender,
          content: z.string().max(8192),
          durationInFrames: z.number().int().positive().max(60 * 60 * 30), // up to ~30min @60fps
          typingBefore: z.number().int().nonnegative().max(60 * 30).optional(),
          redPacketSkin: RedPacketSkin.optional(),
        }),
      )
      .max(1000), // hard global ceiling
  })
  .strict(); // reject unknown keys so the protocol stays clean

export class ScriptValidationError extends Error {
  readonly status = 400;
  readonly issues: unknown;
  constructor(issues: unknown) {
    super('script validation failed');
    this.issues = issues;
  }
}

export function validateScript(
  raw: unknown,
  limits: TierLimits,
): DialogueScript {
  const parsed = ScriptSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ScriptValidationError(parsed.error.issues);
  }
  const script = parsed.data as DialogueScript;

  if (script.width > limits.maxWidth || script.height > limits.maxHeight) {
    throw new ScriptValidationError([
      {
        path: ['width'],
        message: `resolution ${script.width}x${script.height} exceeds tier limit ${limits.maxWidth}x${limits.maxHeight}`,
      },
    ]);
  }
  const longSide = Math.max(script.width, script.height);
  const shortSide = Math.min(script.width, script.height);
  if (longSide > limits.maxLongSide || shortSide > limits.maxShortSide) {
    throw new ScriptValidationError([
      {
        path: ['width'],
        message: `resolution ${script.width}x${script.height} (long=${longSide}, short=${shortSide}) exceeds tier ${limits.maxLongSide}x${limits.maxShortSide}`,
      },
    ]);
  }
  if (script.fps > limits.maxFps) {
    throw new ScriptValidationError([
      {
        path: ['fps'],
        message: `fps ${script.fps} exceeds tier limit ${limits.maxFps}`,
      },
    ]);
  }
  if (script.timeline.length > limits.maxNodes) {
    throw new ScriptValidationError([
      {
        path: ['timeline'],
        message: `node count ${script.timeline.length} exceeds tier limit ${limits.maxNodes}`,
      },
    ]);
  }
  if (script.phoneModel === 'iphone17pro' && !limits.allowIphone17Pro) {
    throw new ScriptValidationError([
      {
        path: ['phoneModel'],
        message: 'iphone17pro skin is premium-only',
      },
    ]);
  }
  for (const [i, block] of script.timeline.entries()) {
    if (block.redPacketSkin && limits.maxNodes === FREE_TIER.maxNodes) {
      // hard constraint per AGENTS.md §5 — premium skin only
      throw new ScriptValidationError([
        {
          path: ['timeline', i, 'redPacketSkin'],
          message: 'redPacketSkin is premium-only',
        },
      ]);
    }
  }
  return script;
}

export const FREE_TIER_LIMITS = FREE_TIER;
export const PREMIUM_TIER_LIMITS = PREMIUM_TIER;
