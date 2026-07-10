import type { DialogueScript } from '../types';

// 静态示例脚本 —— 本版用于驱动 @remotion/player 预览。
// 之后接入编辑器状态时，可将其作为 useState 初始值。
export const sampleScript: DialogueScript = {
  width: 720,
  height: 1280,
  fps: 30,
  phoneModel: 'standard',
  timeline: [
    {
      id: 'b1',
      type: 'text',
      sender: 'target',
      content: '你看到我刚才发的项目素材了吗？关于品牌设计的，让我知道你的想法。',
      durationInFrames: 60,
      typingBefore: 24,
    },
    {
      id: 'b2',
      type: 'text',
      sender: 'me',
      content: '刚看完，整体方向很棒！配色我超喜欢 👍',
      durationInFrames: 50,
    },
    {
      id: 'b3',
      type: 'red_packet',
      sender: 'me',
      content: '恭喜发财，大吉大利',
      durationInFrames: 55,
      redPacketSkin: 'classic_red',
    },
    {
      id: 'b4',
      type: 'pat',
      sender: 'me',
      content: '“我” 拍了拍 “Elena”',
      durationInFrames: 45,
    },
    {
      id: 'b5',
      type: 'text',
      sender: 'target',
      content: '哈哈哈谢谢老板！这就去优化细节～',
      durationInFrames: 60,
      typingBefore: 20,
    },
  ],
};
