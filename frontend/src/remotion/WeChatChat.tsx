import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { DialogueScript } from '../types';
import { withStartFrames, type TimedBlock } from './timeline';
import { PhoneFrame } from './PhoneFrame';
import { TextBubble } from './messages/TextBubble';
import { RedPacket } from './messages/RedPacket';
import { PatNotice } from './messages/PatNotice';
import { TypingIndicator } from './messages/TypingIndicator';

const CHAT_NAME = 'Elena';

// 头像：圆角方块 + 首字（避免依赖外链 / Lambda 缺字体的 emoji）。
const Avatar: React.FC<{ sender: 'me' | 'target' }> = ({ sender }) => {
  const isMe = sender === 'me';
  return (
    <div
      style={{
        width: 84,
        height: 84,
        flexShrink: 0,
        borderRadius: 10,
        backgroundColor: isMe ? '#07c160' : '#4f46e5',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 34,
        fontWeight: 700,
      }}
    >
      {isMe ? '我' : 'E'}
    </div>
  );
};

// 单条消息行：spring 弹入（opacity + scale），按 sender 左右排布。
const MessageRow: React.FC<{ timed: TimedBlock }> = ({ timed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { block } = timed;
  const isMe = block.sender === 'me';

  const enter = frame - timed.startFrame;
  const progress = spring({
    frame: enter,
    fps,
    config: { damping: 200 },
    durationInFrames: 12,
  });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const scale = interpolate(progress, [0, 1], [0.85, 1]);

  // 「拍一拍」：居中系统提示，无头像。
  if (block.type === 'pat') {
    return (
      <div style={{ margin: '18px 0', opacity }}>
        <PatNotice content={block.content} />
      </div>
    );
  }

  const bubble =
    block.type === 'red_packet' ? (
      <RedPacket content={block.content} />
    ) : (
      // text 及其它类型的兜底，都以文本气泡呈现
      <TextBubble sender={block.sender} content={block.content} />
    );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        margin: '18px 0',
        flexDirection: isMe ? 'row-reverse' : 'row',
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: isMe ? 'right center' : 'left center',
      }}
    >
      <Avatar sender={block.sender} />
      {bubble}
    </div>
  );
};

// 「正在输入」行：对方左对齐（与 MessageRow 对方样式一致），opacity 淡入。
const TypingRow: React.FC<{ timed: TimedBlock }> = ({ timed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - timed.typingStart,
    fps,
    config: { damping: 200 },
    durationInFrames: 8,
  });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        margin: '18px 0',
        opacity,
      }}
    >
      <Avatar sender="target" />
      <TypingIndicator />
    </div>
  );
};

// 合成根：微信外壳 + 底部锚定的消息流。
// 消息流容器 position:absolute; bottom:0（block 流），新消息把旧消息上推，
// 上溢部分被 PhoneFrame 聊天区的 overflow:hidden 裁去（AGENTS.md §3）。
export const WeChatChat: React.FC<{ script: DialogueScript }> = ({ script }) => {
  const frame = useCurrentFrame();
  const timed = withStartFrames(script.timeline);
  const visible = timed.filter((t) => frame >= t.startFrame);
  // 当前帧命中的 typing 窗口（各窗口互不重叠，至多一条）。
  const typingNow = timed.find(
    (t) => t.typingFrames > 0 && frame >= t.typingStart && frame < t.startFrame,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#ededed' }}>
      <PhoneFrame chatName={CHAT_NAME}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '24px 26px',
          }}
        >
          {visible.map((t) => (
            <MessageRow key={t.block.id} timed={t} />
          ))}
          {typingNow && <TypingRow key={`typing-${typingNow.block.id}`} timed={typingNow} />}
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
};
