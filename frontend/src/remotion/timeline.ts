import type { MessageBlock } from '../types';

export interface TimedBlock {
  block: MessageBlock;
  typingStart: number; // 「正在输入」气泡起始帧（= 上一段末尾）
  typingFrames: number; // typing 持续帧数（0 表示不显示）
  startFrame: number; // 该消息弹出的绝对起始帧（typing 之后）
  endFrame: number; // 下一条弹出前（= 下一段起始）
  index: number;
}

// 静态时间轴映射器（AGENTS.md Phase 1）：
// 累加 durationInFrames，把每条消息映射为绝对 startFrame。
// typing 帧计入游标——真实延后对方消息、拉长总时长；仅 target 生效。
export function withStartFrames(timeline: MessageBlock[]): TimedBlock[] {
  let cursor = 0;
  return timeline.map((block, index) => {
    const typingFrames =
      block.sender === 'target' ? block.typingBefore ?? 0 : 0;
    const typingStart = cursor;
    const startFrame = cursor + typingFrames;
    cursor = startFrame + block.durationInFrames;
    return { block, typingStart, typingFrames, startFrame, endFrame: cursor, index };
  });
}

// 合成总时长：由映射结果推导，确保把 typing 帧算进总时长（至少 1 帧，避免 Player 报错）。
export function totalDuration(timeline: MessageBlock[]): number {
  const timed = withStartFrames(timeline);
  return Math.max(timed.at(-1)?.endFrame ?? 0, 1);
}
