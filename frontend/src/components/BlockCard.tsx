import type { MessageBlock, MessageType, Sender } from '../types';

const TYPE_PILLS: { key: MessageType; label: string }[] = [
  { key: 'text', label: '文本' },
  { key: 'image', label: '图片' },
  { key: 'voice', label: '语音' },
  { key: 'red_packet', label: '红包' },
  { key: 'pat', label: '拍一拍' },
];

// 发送者切换段
const SenderToggle: React.FC<{
  sender: Sender;
  onChange: (s: Sender) => void;
}> = ({ sender, onChange }) => {
  const meActive = sender === 'me';
  const on = 'px-3 py-1 font-label-caps text-label-caps bg-primary text-white';
  const off =
    'px-3 py-1 font-label-caps text-label-caps bg-surface-variant text-on-surface-variant';
  return (
    <div className="flex rounded-lg overflow-hidden border border-outline-variant">
      <button
        type="button"
        className={meActive ? on : off}
        onClick={() => onChange('me')}
      >
        我
      </button>
      <button
        type="button"
        className={meActive ? off : on}
        onClick={() => onChange('target')}
      >
        对方
      </button>
    </div>
  );
};

// 单条消息编辑卡。本版接入了编辑态：上层通过 onPatch / onDelete 协同
// 维护脚本状态。空 pat 类型也允许编辑 content。
export const BlockCard: React.FC<{
  block: MessageBlock;
  active?: boolean;
  onPatch?: (patch: Partial<MessageBlock>) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}> = ({ block, active = false, onPatch, onDelete, onDuplicate }) => {
  // 拍一拍：虚线居中卡片
  if (block.type === 'pat') {
    return (
      <div className="bg-white border border-outline-variant border-dashed rounded-xl p-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors">
        <span className="material-symbols-outlined text-outline-variant">
          back_hand
        </span>
        <input
          className="flex-1 bg-transparent font-body-sm text-on-surface-variant italic outline-none"
          defaultValue={block.content}
          onChange={(e) => onPatch?.({ content: e.target.value })}
        />
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-error-container hover:text-error text-on-surface-variant"
            aria-label="删除"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        )}
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
            <SenderToggle
              sender={block.sender}
              onChange={(s) => onPatch?.({ sender: s })}
            />
            <div className="flex gap-1">
              {onDuplicate && (
                <button
                  type="button"
                  onClick={onDuplicate}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-variant transition-colors text-on-surface-variant"
                  aria-label="复制"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    content_copy
                  </span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error-container hover:text-error transition-colors text-on-surface-variant"
                  aria-label="删除"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    delete
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {TYPE_PILLS.filter((p) => p.key !== 'pat').map((p) => (
              <button
                type="button"
                key={p.key}
                className={
                  p.key === block.type
                    ? 'px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container font-label-caps text-[10px]'
                    : 'px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-caps text-[10px]'
                }
                onClick={() => onPatch?.({ type: p.key })}
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
              <div className="flex-1">
                <input
                  className="w-full bg-transparent font-title-sm text-red-700 outline-none"
                  defaultValue={block.content}
                  onChange={(e) => onPatch?.({ content: e.target.value })}
                />
                <p className="text-xs text-red-500">微信支付</p>
              </div>
            </div>
          ) : (
            <textarea
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 font-chat-text text-chat-text outline-none focus:ring-1 focus:ring-primary h-20 resize-none"
              value={block.content}
              onChange={(e) => onPatch?.({ content: e.target.value })}
            />
          )}

          <div className="mt-3 flex items-center gap-3 text-[12px] text-on-surface-variant">
            <label className="flex items-center gap-2">
              <span>停留帧数</span>
              <input
                type="number"
                min={1}
                max={60 * 30}
                className="w-20 px-2 py-1 rounded border border-outline-variant bg-white outline-none focus:ring-1 focus:ring-primary"
                value={block.durationInFrames}
                onChange={(e) =>
                  onPatch?.({
                    durationInFrames: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </label>
            {block.sender === 'target' && (
              <label className="flex items-center gap-2">
                <span>「正在输入」帧数</span>
                <input
                  type="number"
                  min={0}
                  max={600}
                  className="w-16 px-2 py-1 rounded border border-outline-variant bg-white outline-none focus:ring-1 focus:ring-primary"
                  value={block.typingBefore ?? 0}
                  onChange={(e) =>
                    onPatch?.({
                      typingBefore: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
