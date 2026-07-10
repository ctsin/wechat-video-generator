import type { MessageBlock } from '../types';
import { BlockCard } from './BlockCard';

// 对话时间轴列表（移植自 stitch/_1）。
export const TimelineEditor: React.FC<{ timeline: MessageBlock[] }> = ({
  timeline,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-background">
      <div className="flex items-center justify-between">
        <h2 className="font-title-sm text-title-sm">对话时间轴</h2>
        <button className="text-primary font-label-caps text-label-caps flex items-center gap-1 hover:underline">
          <span className="material-symbols-outlined text-sm">add_circle</span>
          添加区块
        </button>
      </div>
      {timeline.map((block, i) => (
        <BlockCard key={block.id} block={block} active={i === 0} />
      ))}
    </div>
  );
};
