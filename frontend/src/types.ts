// 对话脚本协议 —— 与 AGENTS.md §2 保持一致（前端 / 后端 / Remotion 共享）

export interface DialogueScript {
  width: number; // 标准 720（4K 3840）
  height: number; // 标准 1280（4K 2160）
  fps: number; // 标准 30（高级 60）
  bgMusic?: string; // BGM 远程 URL
  phoneModel: 'standard' | 'iphone17pro'; // 高级机型开关
  timeline: MessageBlock[];
}

export type MessageType = 'text' | 'image' | 'voice' | 'red_packet' | 'pat';
export type Sender = 'me' | 'target';
export type PhoneModel = 'standard' | 'iphone17pro';
export type RedPacketSkin = 'classic_red' | 'love_pink' | 'gold_luxury';

export interface MessageBlock {
  id: string; // 节点 UUID
  type: MessageType;
  sender: Sender;
  content: string; // 文本内容 / 图片 URL / 自定义文案
  durationInFrames: number; // 下一条消息弹出前的停留时长
  typingBefore?: number; // 该(对方)消息弹出前显示「正在输入」的帧数；默认 0/不显示
  // 高级特性
  redPacketSkin?: RedPacketSkin;
}
