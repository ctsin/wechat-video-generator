import { Player } from '@remotion/player';
import { WeChatChat } from '../remotion/WeChatChat';
import { totalDuration } from '../remotion/timeline';
import type { DialogueScript } from '../types';

// 右栏预览：iPhone 边框内嵌 @remotion/player。
// 边框高度改为与合成同比（720:1280 = 9:16），使 WeChat 画面全幅无黑边。
export const PhonePreview: React.FC<{ script: DialogueScript }> = ({
  script,
}) => {
  const duration = totalDuration(script.timeline);
  const aspectHeight = Math.round(375 * (script.height / script.width));

  return (
    <section className="w-inspector-width lg:w-[500px] bg-surface flex items-center justify-center p-8 overflow-y-auto">
      <div className="iphone-x" style={{ height: aspectHeight }}>
        <div className="iphone-notch" />
        <Player
          component={WeChatChat}
          inputProps={{ script }}
          durationInFrames={duration}
          fps={script.fps}
          compositionWidth={script.width}
          compositionHeight={script.height}
          style={{ width: '100%', height: '100%' }}
          loop
          autoPlay
          controls
        />
      </div>
    </section>
  );
};
