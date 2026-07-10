import type { MessageBlock } from '../types';
import { BlockCard } from './BlockCard';

// 对话时间轴列表（移植自 stitch/_1）。本版支持添加/编辑/删除/复制。
export const TimelineEditor: React.FC<{
  timeline: MessageBlock[];
  onPatch: (id: string, patch: Partial<MessageBlock>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAdd: (blockType: MessageBlock['type']) => void;
  activeId?: string;
  onActiveChange: (id: string) => void;
}> = ({
  timeline,
  onPatch,
  onDelete,
  onDuplicate,
  onAdd,
  activeId,
  onActiveChange,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-background">
      <div className="flex items-center justify-between">
        <h2 className="font-title-sm text-title-sm">对话时间轴</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAdd('text')}
            className="text-primary font-label-caps text-label-caps flex items-center gap-1 hover:underline"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            添加文本
          </button>
          <button
            type="button"
            onClick={() => onAdd('pat')}
            className="text-on-surface-variant font-label-caps text-label-caps flex items-center gap-1 hover:underline"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            拍一拍
          </button>
          <button
            type="button"
            onClick={() => onAdd('red_packet')}
            className="text-error font-label-caps text-label-caps flex items-center gap-1 hover:underline"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            红包
          </button>
        </div>
      </div>
      {timeline.length === 0 && (
        <div className="text-center text-on-surface-variant py-12 border border-dashed border-outline-variant rounded-xl">
          空时间轴。从右上角添加一条消息开始吧。
        </div>
      )}
      {timeline.map((block) => (
        <div key={block.id} onClick={() => onActiveChange(block.id)}>
          <BlockCard
            block={block}
            active={block.id === activeId}
            onPatch={(patch) => onPatch(block.id, patch)}
            onDelete={() => onDelete(block.id)}
            onDuplicate={() => onDuplicate(block.id)}
          />
        </div>
      ))}
    </div>
  );
};
