import { interpolate, useCurrentFrame } from 'remotion';

// 「正在输入」三点脉冲，白色气泡（对方）。用当前帧驱动上下浮动。
export const TypingIndicator: React.FC = () => {
  const frame = useCurrentFrame();
  const dot = (offset: number) => {
    const t = (frame + offset) % 30;
    const y = interpolate(t, [0, 15, 30], [0, -8, 0], {
      extrapolateRight: 'clamp',
    });
    return (
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: '#9ca3af',
          transform: `translateY(${y}px)`,
        }}
      />
    );
  };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '20px 24px',
      }}
    >
      {dot(0)}
      {dot(10)}
      {dot(20)}
    </div>
  );
};
