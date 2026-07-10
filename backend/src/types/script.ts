// Mirrors frontend/src/types.ts DialogueScript. Keep these in sync.
// Used as the single source of truth on the backend for guardrail
// validation (AGENTS.md §2 "Script Protocol").

export type MessageType = 'text' | 'image' | 'voice' | 'red_packet' | 'pat';
export type Sender = 'me' | 'target';
export type PhoneModel = 'standard' | 'iphone17pro';
export type RedPacketSkin = 'classic_red' | 'love_pink' | 'gold_luxury';

export interface MessageBlock {
  id: string;
  type: MessageType;
  sender: Sender;
  content: string;
  durationInFrames: number;
  typingBefore?: number;
  redPacketSkin?: RedPacketSkin;
}

export interface DialogueScript {
  width: number;
  height: number;
  fps: number;
  bgMusic?: string;
  phoneModel: PhoneModel;
  timeline: MessageBlock[];
}

// Tiered limits applied before dispatching a render. AGENTS.md §5.
// "Resolution" is checked against long and short axes independently so
// portrait dimensions like 720x1280 fit "1080p class" (max=1280, min=720).
export interface TierLimits {
  maxWidth: number; // hard ceiling on either axis
  maxHeight: number;
  maxLongSide: number; // max(width, height) ≤ this
  maxShortSide: number; // min(width, height) ≤ this
  maxFps: number;
  maxNodes: number;
  watermark: boolean;
  allowIphone17Pro: boolean;
}

export const FREE_TIER: TierLimits = {
  maxWidth: 1920,
  maxHeight: 1920,
  maxLongSide: 1920,
  maxShortSide: 1080, // 720p or 1080p
  maxFps: 30,
  maxNodes: 10,
  watermark: true,
  allowIphone17Pro: false,
};

export const PREMIUM_TIER: TierLimits = {
  maxWidth: 3840,
  maxHeight: 3840,
  maxLongSide: 3840,
  maxShortSide: 2160, // 4K
  maxFps: 60,
  maxNodes: Number.POSITIVE_INFINITY,
  watermark: false,
  allowIphone17Pro: true,
};

// Permissive limits used for project save/load — actual render endpoints
// re-enforce tier limits against the user's JWT claims.
export const LIBRARY_TIER: TierLimits = {
  maxWidth: 3840,
  maxHeight: 3840,
  maxLongSide: 3840,
  maxShortSide: 2160,
  maxFps: 60,
  maxNodes: Number.POSITIVE_INFINITY,
  watermark: false,
  allowIphone17Pro: true,
};
