import type { MessageBlock, MessageType } from '../types';

const TYPE_PILLS: { key: MessageType; label: string }[] = [
  { key: 'text', label: '文本' },
  { key: 'image', label: '图片' },
  { key: 'voice', label: '语音' },
  { key: 'red_packet', label: '红包' },
];

// 发送者切换段
const SenderToggle: React.FC<{ sender: MessageBlock['sender'] }> = ({
  sender,
}) => {
  const meActive = sender === 'me';
  const on = 'px-3 py-1 font-label-caps text-label-caps bg-primary text-white';
  const off =
    'px-3 py-1 font-label-caps text-label-caps bg-surface-variant text-on-surface-variant';
  return (
    <div className="flex rounded-lg overflow-hidden border border-outline-variant">
      <button className={meActive ? on : off}>我</button>
      <button className={meActive ? off : on}>对方</button>
    </div>
  );
};

// 单条消息编辑卡（移植自 stitch/_1）。本版为展示态。
export const BlockCard: React.FC<{ block: MessageBlock; active?: boolean }> = ({
  block,
  active = false,
}) => {
  // 拍一拍：虚线居中卡片
  if (block.type === 'pat') {
    return (
      <div className="bg-white border border-outline-variant border-dashed rounded-xl p-3 flex items-center justify-center gap-3 hover:bg-surface-container-low transition-colors">
        <span className="material-symbols-outlined text-outline-variant">
          back_hand
        </span>
        <span className="font-body-sm text-on-surface-variant italic">
          {block.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={
        active
          ? 'bg-white border-2 border-primary rounded-xl p-4 shadow-sm relative group'
          : 'bg-white border border-outline-variant rounded-xl p-4 shadow-sm relative group hover:border-outline transition-colors'
      }
    >
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
      )}
      <div className="flex items-start gap-4">
        <div className="mt-2 cursor-move text-outline-variant hover:text-outline">
          <span className="material-symbols-outlined">drag_indicator</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <SenderToggle sender={block.sender} />
            <div className="flex gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-variant transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">
                  content_copy
                </span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container hover:text-error transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">
                  delete
                </span>
              </button>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            {TYPE_PILLS.map((p) => (
              <button
                key={p.key}
                className={
                  p.key === block.type
                    ? 'px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-caps text-[10px]'
                    : 'px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-caps text-[10px]'
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          {block.type === 'red_packet' ? (
            <div className="flex items-center gap-3 bg-red-50 p-4 rounded-xl border border-red-100">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                ¥
              </div>
              <div>
                <p className="font-title-sm text-red-700">{block.content}</p>
                <p className="text-xs text-red-500">微信支付</p>
              </div>
            </div>
          ) : (
            <textarea
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 font-chat-text text-chat-text outline-none focus:ring-1 focus:ring-primary h-20 resize-none"
              defaultValue={block.content}
            />
          )}
        </div>
      </div>
    </div>
  );
};
