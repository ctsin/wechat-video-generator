# 🤖 Multi-Agent Project Context & Handbook (AGENTS.md)
*System Target: WeChat Dialogue Video Generator (Remotion-based Cloud Rendering SaaS)*

This document serves as the single source of truth for **AI Coding Agents (Cursor, Windsurf, Copilot, Cline)** to understand the project architecture, tech stack limits, data structures, and constraints. **Agents MUST read this document before writing any code.**

---

## 🧭 1. Project Overview & Architecture

This is a lightweight, high-conversion SaaS tool allowing short-video creators to input chat dialogue scripts and export high-fidelity, smooth WeChat chat dynamic videos (MP4) rendered via **Remotion** on **AWS Lambda**.

### Monorepo/解耦架构 (Decoupled Structure)
```text
/wechat-video-generator (Root)
├── frontend/             # SPA client (Vite + React + TS) - Hosted on Cloudflare Pages
├── backend/              # Orchestration Server (Express + Node.js) - Lightweight VPS
└── AGENTS.md             # This Context Manual

```

* **Frontend:** Client-side form editor designed via Google Stitch. Uses `@remotion/player` for realtime canvas/DOM preview. **Zero registration barriers** for previewing.
* **Backend:** Express API. Orchestrates AWS Lambda rendering jobs using `@remotion/lambda` and handles official WeChat/Alipay Native payment webhooks.
* **Renderer:** Stateless AWS Lambda instances spin up concurrently to stitch and encode frames via FFmpeg into an MP4 video, saving to an Amazon S3 Bucket.

---

## 📊 2. Core JSON Data Structure (The Script Protocol)

All agents must strictly respect and type-check the following dialogue JSON protocol exchanged between Frontend, Backend, and Remotion Compositor.

```typescript
export interface DialogueScript {
  width: number;          // Standard: 720 (Premium: 3840 for 4K)
  height: number;         // Standard: 1280 (Premium: 2160 for 4K)
  fps: number;            // Standard: 30 (Premium: 60)
  bgMusic?: string;       // Remote URL to assets/BGM
  phoneModel: 'standard' | 'iphone17pro'; // Premium feature toggle
  timeline: MessageBlock[];
}

export interface MessageBlock {
  id: string;             // Unique node UUID
  type: 'text' | 'image' | 'voice' | 'red_packet' | 'pat';
  sender: 'me' | 'target';
  content: string;        // Text content, image URL, or custom text
  durationInFrames: number; // Duration before the next message pops up
  // Premium Features
  redPacketSkin?: 'classic_red' | 'love_pink' | 'gold_luxury'; 
}

```

---

## 🎬 3. Remotion Execution & Animation Constraints

### ⚠️ Critical Rendering Rules (MUST READ FOR AGENTS)

1. **NO `display: flex` or `display: grid` on Remotion Layout Containers:** WeasyPrint and certain Puppeteer/Remotion screenshot pipelines fail to wrap text or compute dynamic heights accurately with heavy flex. Use standard `display: block` with precise paddings/margins or absolute positioning inside fixed wrappers.
2. **Dynamic Height & Scrolling Calculation:** WeChat bubbles push content upward. Do NOT hardcode absolute layout coordinates. Keep chat containers anchored at the bottom (`position: absolute; bottom: 0;`), allowing new DOM items to push previous nodes naturally. Use `spring()` animations for fluid `opacity` and `scale` entry effects.
3. **Typography & Emoji Fallback:** Serverless Linux containers (AWS Lambda) do NOT carry Apple Emoji or Chinese system fonts. Ensure CSS references pre-packaged typography layers or explicit remote font faces (e.g., *Source Han Sans*) to prevent empty squares (☐).

---

## 🔑 4. Authentication & Silent Monetization Loop

The application bypasses typical username/password sign-up processes to maximize checkout conversions. Agents must follow this exact functional pipeline for monetization:

```text
[Anonymous User] ──> Edits Script ──> Clicks HD Download ──> Triggers Native Pay QR Code
                                                                       │
[S3 HD Video Download] <── [Inject JWT Token] <── [Callback auto-creates User ID] 

```

1. **Anonymous Session:** Frontend assigns a client-side UUID stored in `localStorage` for tracking temporary draft indices.
2. **Watermarked Previews:** The renderer applies a semi-transparent watermarked mask over the video stream unless verified tokens are injected into the metadata payload.
3. **Pay-to-Register (Silent Onboarding):** - User scans the WeChat/Alipay Native QR code.
* Payment provider hits the backend endpoint `/api/pay/callback`.
* Backend extracts the provider's unique `openid`. It silently updates or creates a database record for this `openid`.
* Backend signs an asymmetric stateless **JWT Token** containing account privileges and returns it to the client pool, updating `localStorage`.



---

## 📈 5. Feature Tier & Guardrails

To protect against Lambda compute billing exploitation, the backend must strictly enforce structural limits via middleware checking before passing commands to `renderMediaOnLambda`.

| Feature | Free Tier / Anonymous Preview | Paid Premium Tier (JWT Validated) |
| --- | --- | --- |
| **Resolution** | Maximum 720p or 1080p | 4K Ultra HD (`3840x2160`) |
| **Frame Rate** | Locked at 24 FPS or 30 FPS | Ultra-smooth 60 FPS |
| **Duration Limit** | Max 10 dialogue nodes / 30 seconds | Unlimited nodes / Multi-minute drama |
| **Watermark** | Forced hardcoded layer | Removed cleanly |
| **Assets** | Classic phone frames / Red theme | iPhone + Dynamic Island UI / Custom Skins |

---

## 🛠️ 6. Next Actions for Agents (Phase 1 Focus)

When prompted to begin coding, immediately prioritize these structural milestones:

* [ ] **Frontend:** Build the static timeline mapper. Ensure `durationInFrames` correctly calculates absolute `startFrame` limits for consecutive messages.
* [ ] **Remotion Composition:** Create standard left/right green and white text bubbles utilizing accurate Tailwind border-radius definitions.
* [ ] **Backend:** Implement basic CORS handling and design an enterprise-safe `/api/render` skeleton that acts as a strict guardrail schema analyzer.

---

*End of Handbook. Agent, proceed with building the core Vite state machine now.*
