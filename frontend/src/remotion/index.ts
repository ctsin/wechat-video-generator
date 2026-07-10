import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { WeChatChat } from './WeChatChat';

// Used only for AWS Lambda rendering. App.tsx uses the Player + WeChatChat
// directly for browser-side preview. We register Composition explicitly so
// Remotion's Lambda stitcher can find a Composition whose component is
// WeChatChat — otherwise it errors out with
// "useCurrentFrame() can only be called inside a component that was registered
// as a composition".
const FPS = 30;
const WIDTH = 720;
const HEIGHT = 1280;

const COMPONENT = WeChatChat as unknown as React.ComponentType<
  Record<string, unknown>
>;

registerRoot(() =>
  React.createElement(Composition, {
    id: 'WeChatChat',
    component: COMPONENT,
    durationInFrames: 90,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
  }),
);
