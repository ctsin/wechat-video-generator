import React from 'react';
import { registerRoot, Composition } from 'remotion';
import type { DialogueScript } from '../types';
import { WeChatChat } from './WeChatChat';
import { totalDuration } from './timeline';

// Used by the render pipelines (local @remotion/renderer + AWS Lambda).
// App.tsx uses the Player + WeChatChat directly for browser-side preview.
// We register Composition explicitly so Remotion's stitcher can find a
// Composition whose component is WeChatChat — otherwise it errors out with
// "useCurrentFrame() can only be called inside a component that was registered
// as a composition".
//
// Dimensions/fps/duration are derived from the incoming script via
// calculateMetadata so the rendered MP4 follows the script (4K / 60fps premium,
// exact timeline length) instead of the fixed fallback below.
const FALLBACK_FPS = 30;
const FALLBACK_WIDTH = 720;
const FALLBACK_HEIGHT = 1280;
const FALLBACK_DURATION = 90;

const COMPONENT = WeChatChat as unknown as React.ComponentType<
  Record<string, unknown>
>;

// Remotion passes the merged (defaultProps + inputProps) props here. In the
// render paths inputProps carries { script }; guard for the studio/preview
// case where it may be absent.
function calculateMetadata({ props }: { props: Record<string, unknown> }) {
  const script = props.script as DialogueScript | undefined;
  if (!script) {
    return {
      width: FALLBACK_WIDTH,
      height: FALLBACK_HEIGHT,
      fps: FALLBACK_FPS,
      durationInFrames: FALLBACK_DURATION,
    };
  }
  // h264 requires even pixel dimensions; round to the nearest even number.
  const even = (n: number) => {
    const r = Math.max(2, Math.round(n));
    return r % 2 === 0 ? r : r + 1;
  };
  return {
    width: even(script.width || FALLBACK_WIDTH),
    height: even(script.height || FALLBACK_HEIGHT),
    fps: Math.max(1, Math.round(script.fps || FALLBACK_FPS)),
    durationInFrames: totalDuration(script.timeline ?? []),
  };
}

registerRoot(() =>
  React.createElement(Composition, {
    id: 'WeChatChat',
    component: COMPONENT,
    // Fallbacks; calculateMetadata overrides these from the script.
    durationInFrames: FALLBACK_DURATION,
    fps: FALLBACK_FPS,
    width: FALLBACK_WIDTH,
    height: FALLBACK_HEIGHT,
    calculateMetadata,
  }),
);
