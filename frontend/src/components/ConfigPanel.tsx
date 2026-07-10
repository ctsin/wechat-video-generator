// 视频配置卡：本版接入了状态。分辨率、60FPS 切换、BGM URL 都会通过
// onChange 冒泡到 App，由父级把脚本写入 useState。
import type {
  DialogueScript,
  PhoneModel,
} from '../types';
import { useRef, type ChangeEvent } from 'react';

export interface ConfigPanelProps {
  title: string;
  onTitleChange: (title: string) => void;
  script: DialogueScript;
  onPatch: (patch: Partial<DialogueScript>) => void;
  onBgmUpload: (file: File) => Promise<void>;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  title,
  onTitleChange,
  script,
  onPatch,
  onBgmUpload,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadError = useRef<string | null>(null);

  const onPick = () => fileRef.current?.click();

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      uploadError.current = null;
      await onBgmUpload(f);
    } catch (err) {
      uploadError.current = err instanceof Error ? err.message : String(err);
    }
  };

  const fps = script.fps;
  const phoneModel: PhoneModel = script.phoneModel;

  return (
    <div className="p-6 border-b border-outline-variant bg-surface-container-low">
      <h2 className="font-title-sm text-title-sm mb-4">视频配置</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">
            项目标题
          </label>
          <input
            className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 font-body-sm focus:ring-2 focus:ring-primary outline-none"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">
            分辨率
          </label>
          <select
            className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 font-body-sm outline-none"
            value={phoneModel === 'iphone17pro' ? '4K 高清' : '1080P 全高清'}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '4K 高清') {
                onPatch({
                  phoneModel: 'iphone17pro',
                  width: 720,
                  height: 1280,
                });
              } else {
                onPatch({
                  phoneModel: 'standard',
                  width: 720,
                  height: 1280,
                });
              }
            }}
          >
            <option>1080P 全高清</option>
            <option>4K 高清</option>
          </select>
        </div>
        <div className="flex items-center justify-between bg-white border border-outline-variant rounded-lg px-4 py-2">
          <span className="font-body-sm">60 FPS 流畅</span>
          <button
            type="button"
            className={
              'w-10 h-6 rounded-full relative p-1 transition-colors ' +
              (fps === 60 ? 'bg-primary' : 'bg-outline-variant')
            }
            onClick={() => onPatch({ fps: fps === 60 ? 30 : 60 })}
            aria-label="切换帧率"
          >
            <div
              className={
                'w-4 h-4 bg-white rounded-full transition-all ' +
                (fps === 60 ? 'ml-auto' : '')
              }
            />
          </button>
        </div>
        <div className="col-span-2">
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">
            背景音乐 (BGM)
          </label>
          <button
            type="button"
            onClick={onPick}
            className="w-full border-2 border-dashed border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center hover:bg-surface-container transition-colors group"
          >
            <span className="material-symbols-outlined text-primary mb-2 group-hover:scale-110 transition-transform">
              cloud_upload
            </span>
            <span className="font-body-sm text-on-surface-variant">
              点击上传或拖拽 .mp3 / .wav 文件
            </span>
            {script.bgMusic && (
              <span className="mt-2 text-[12px] text-primary truncate max-w-full">
                已选：{script.bgMusic.split('/').pop()}
              </span>
            )}
            {uploadError.current && (
              <span className="mt-1 text-[12px] text-error">
                {uploadError.current}
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/x-wav"
            className="hidden"
            onChange={onFile}
          />
        </div>
      </div>
    </div>
  );
};
