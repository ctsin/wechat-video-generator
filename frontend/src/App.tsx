import { sampleScript } from './data/sampleScript';
import { TopNav } from './components/TopNav';
import { SideNav } from './components/SideNav';
import { ConfigPanel } from './components/ConfigPanel';
import { TimelineEditor } from './components/TimelineEditor';
import { PhonePreview } from './components/PhonePreview';

function App() {
  // 本版用静态脚本驱动预览；后续接入编辑状态时改为 useState 即可。
  const script = sampleScript;

  return (
    <>
      <TopNav />
      <SideNav />

      {/* 主区：左编辑 / 右预览 两栏 */}
      <main className="flex-1 mt-16 lg:ml-sidebar-width flex overflow-hidden">
        {/* 左栏：脚本编辑 */}
        <section className="flex-1 flex flex-col bg-white border-r border-outline-variant overflow-hidden">
          <ConfigPanel />
          <TimelineEditor timeline={script.timeline} />
          {/* 底部操作条 */}
          <div className="p-6 border-t border-outline-variant bg-surface flex gap-4">
            <button className="flex-1 py-4 border-2 border-primary text-primary font-bold rounded-xl hover:bg-primary-fixed transition-colors">
              生成带水印预览
            </button>
            <button className="flex-1 py-4 bg-primary-container text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">download</span>
              下载超清 MP4
            </button>
          </div>
        </section>

        {/* 右栏：手机模拟预览 */}
        <PhonePreview script={script} />
      </main>

      {/* 底栏 */}
      <footer className="flex justify-between items-center px-gutter py-4 w-full bg-surface border-t border-outline-variant relative z-10">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          © 2024 ChatGen Studio. 版权所有.
        </p>
        <div className="flex gap-6">
          <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            隐私政策
          </a>
          <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            服务条款
          </a>
          <a className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            联系支持
          </a>
        </div>
      </footer>
    </>
  );
}

export default App;
