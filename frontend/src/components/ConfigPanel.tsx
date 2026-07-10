// 视频配置卡（移植自 stitch/_1）。本版为展示态，控件暂不接状态。
export const ConfigPanel: React.FC = () => {
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
            defaultValue="新视频项目 - Elena 交互"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">
            分辨率
          </label>
          <select
            className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 font-body-sm outline-none"
            defaultValue="4K 高清"
          >
            <option>1080P 全高清</option>
            <option>4K 高清</option>
          </select>
        </div>
        <div className="flex items-center justify-between bg-white border border-outline-variant rounded-lg px-4 py-2">
          <span className="font-body-sm">60 FPS 流畅</span>
          <button className="w-10 h-6 bg-primary rounded-full relative p-1 transition-colors">
            <div className="w-4 h-4 bg-white rounded-full ml-auto" />
          </button>
        </div>
        <div className="col-span-2">
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">
            背景音乐 (BGM)
          </label>
          <div className="w-full border-2 border-dashed border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center hover:bg-surface-container transition-colors cursor-pointer group">
            <span className="material-symbols-outlined text-primary mb-2 group-hover:scale-110 transition-transform">
              cloud_upload
            </span>
            <span className="font-body-sm text-on-surface-variant">
              点击上传或拖拽 .mp3 / .wav 文件
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
