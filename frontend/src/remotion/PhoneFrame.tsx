import React from 'react';

const HEADER_H = 150;
const FOOTER_H = 120;

// 微信聊天界面外壳（合成坐标系 720×1280）：顶部导航 + 底部输入栏为叠加层，
// 中间聊天区由 children 填充（top/bottom 让位给头尾栏，overflow 裁剪上溢消息）。
export const PhoneFrame: React.FC<{
  chatName: string;
  children: React.ReactNode;
}> = ({ chatName, children }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#ededed',
        overflow: 'hidden',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* 聊天区 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: HEADER_H,
          bottom: FOOTER_H,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>

      {/* 顶部导航栏 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_H,
          backgroundColor: '#ededed',
          borderBottom: '1px solid #d1d1d1',
          paddingTop: 56,
          paddingLeft: 28,
          paddingRight: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 40, color: '#111' }}
          >
            arrow_back_ios
          </span>
          <span style={{ fontSize: 34, fontWeight: 700, color: '#111' }}>
            {chatName}
          </span>
        </div>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 40, color: '#111' }}
        >
          more_horiz
        </span>
      </div>

      {/* 底部输入栏 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: FOOTER_H,
          backgroundColor: '#f7f7f7',
          borderTop: '1px solid #d1d1d1',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '0 24px',
          zIndex: 10,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 48, color: '#555' }}
        >
          mic
        </span>
        <div
          style={{
            flex: 1,
            height: 60,
            backgroundColor: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e5e5e5',
          }}
        />
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 48, color: '#555' }}
        >
          mood
        </span>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 48, color: '#555' }}
        >
          add_circle
        </span>
      </div>
    </div>
  );
};
