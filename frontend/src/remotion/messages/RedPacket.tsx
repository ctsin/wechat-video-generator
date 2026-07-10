// 微信红包卡片（合成坐标系宽 720px）。
export const RedPacket: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div style={{ maxWidth: '68%', borderRadius: 14, overflow: 'hidden' }}>
      <div
        style={{
          backgroundColor: '#f44336',
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            backgroundColor: '#ffd700',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f44336',
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          ¥
        </div>
        <div
          style={{
            color: '#ffffff',
            fontSize: 30,
            fontWeight: 500,
            lineHeight: '38px',
          }}
        >
          {content}
        </div>
      </div>
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '10px 20px',
          fontSize: 20,
          color: '#888888',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>微信红包</span>
        <span>已领取</span>
      </div>
    </div>
  );
};
