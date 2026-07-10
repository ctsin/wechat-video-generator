import type { Sender } from '../../types';

// 微信文本气泡：我(绿) / 对方(白)，含侧向小尖角。
// 合成坐标系宽 720px，尺寸与尖角按该比例放大（index.css 里的
// .wechat-bubble-* 尖角是给 375px 小屏用的，此处自绘以匹配大屏）。
export const TextBubble: React.FC<{ sender: Sender; content: string }> = ({
  sender,
  content,
}) => {
  const isMe = sender === 'me';
  const bg = isMe ? '#07c160' : '#ffffff';
  const tail = 14; // 尖角尺寸
  return (
    <div
      style={{
        position: 'relative',
        maxWidth: '68%',
        padding: '18px 22px',
        fontSize: 30,
        lineHeight: '42px',
        fontFamily: 'system-ui, sans-serif',
        wordBreak: 'break-word',
        borderRadius: 10,
        backgroundColor: bg,
        color: isMe ? '#ffffff' : '#000000',
        border: isMe ? 'none' : '1px solid #e5e7eb',
      }}
    >
      {content}
      {/* 侧向尖角 */}
      <div
        style={{
          position: 'absolute',
          top: 26,
          width: 0,
          height: 0,
          borderTop: `${tail}px solid transparent`,
          borderBottom: `${tail}px solid transparent`,
          ...(isMe
            ? { right: -tail, borderLeft: `${tail}px solid ${bg}` }
            : { left: -tail, borderRight: `${tail}px solid ${bg}` }),
        }}
      />
    </div>
  );
};
