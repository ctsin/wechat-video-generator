import { useEffect, useMemo, useState } from 'react';
import { sampleScript } from './data/sampleScript';
import { TopNav } from './components/TopNav';
import { SideNav } from './components/SideNav';
import { ConfigPanel } from './components/ConfigPanel';
import { TimelineEditor } from './components/TimelineEditor';
import { PhonePreview } from './components/PhonePreview';
import {
  RenderPanel,
  type RenderKind,
} from './components/RenderPanel';
import { UpgradeDialog } from './components/UpgradeDialog';
import { api } from './lib/api';
import {
  useSession,
  useSessionStore,
} from './lib/session';
import type { DialogueScript, MessageBlock } from './types';

function genId(prefix = 'b'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function newBlock(type: MessageBlock['type']): MessageBlock {
  const base: MessageBlock = {
    id: genId(),
    type,
    sender: 'me',
    content: '',
    durationInFrames: 30,
  };
  if (type === 'pat') {
    base.sender = 'me';
    base.content = '我 拍了拍 Elena';
  } else if (type === 'red_packet') {
    base.content = '恭喜发财，大吉大利';
    base.redPacketSkin = 'classic_red';
  } else {
    base.content = '新消息';
  }
  return base;
}

function App() {
  const session = useSession();

  const [title, setTitle] = useState('新视频项目 - Elena 交互');
  const [script, setScript] = useState<DialogueScript>(sampleScript);
  const [activeId, setActiveId] = useState<string>(sampleScript.timeline[0]?.id);

  const [renderJob, setRenderJob] = useState<{ id: string; kind: RenderKind } | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Bootstrap: always have a free-tier JWT so the front-end can call any
  // route that requires a bearer.
  useEffect(() => {
    if (session.token) return;
    void (async () => {
      try {
        const res = await api.anonymous(session.clientId);
        useSessionStore.setToken(res.token, res.user);
      } catch (err) {
        console.warn('anonymous token failed', err);
      }
    })();
  }, [session.token, session.clientId]);

  // Auto-save once we have a token. Debounced through a ref-less effect.
  useEffect(() => {
    if (!session.token) return;
    const t = setTimeout(() => {
      void save({ quiet: true });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, script, session.token]);

  const patch = (p: Partial<DialogueScript>) =>
    setScript((prev) => ({ ...prev, ...p }));

  const onPatchBlock = (id: string, p: Partial<MessageBlock>) =>
    setScript((prev) => ({
      ...prev,
      timeline: prev.timeline.map((b) =>
        b.id === id ? { ...b, ...p } : b,
      ),
    }));

  const onDeleteBlock = (id: string) =>
    setScript((prev) => ({
      ...prev,
      timeline: prev.timeline.filter((b) => b.id !== id),
    }));

  const onDuplicateBlock = (id: string) =>
    setScript((prev) => {
      const src = prev.timeline.find((b) => b.id === id);
      if (!src) return prev;
      const clone: MessageBlock = { ...src, id: genId(src.type[0]) };
      const i = prev.timeline.findIndex((b) => b.id === id);
      const next = [...prev.timeline];
      next.splice(i + 1, 0, clone);
      return { ...prev, timeline: next };
    });

  const onAddBlock = (kind: MessageBlock['type']) =>
    setScript((prev) => {
      const block = newBlock(kind);
      return { ...prev, timeline: [...prev.timeline, block] };
    });

  const onBgmUpload = async (file: File) => {
    const { file: f } = await api.uploadBgm(file);
    patch({ bgMusic: f.url });
  };

  const save = async ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (!session.token) return;
    setSaving(true);
    try {
      if (projectId) {
        await api.updateProject(projectId, { title, script });
      } else {
        const res = await api.createProject(title, script);
        setProjectId(res.project.id);
      }
      if (!quiet) setBanner({ kind: 'ok', msg: '已保存' });
    } catch (err) {
      setBanner({
        kind: 'err',
        msg: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
    try {
      const { job } = await api.previewRender(script);
      setRenderJob({ id: job.id, kind: 'preview' });
    } catch (err) {
      setBanner({
        kind: 'err',
        msg: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const download = async () => {
    if (!session.user || session.user.tier !== 'premium') {
      setUpgradeOpen(true);
      return;
    }
    try {
      const { job } = await api.premiumRender(script);
      setRenderJob({ id: job.id, kind: 'premium' });
    } catch (err) {
      setBanner({
        kind: 'err',
        msg: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const upgraded = (token: string) => {
    // Re-fetch /me using the new token for the user payload.
    api.me().then((res) => useSessionStore.setToken(token, res.user)).catch(() => {
      useSessionStore.setToken(token, {
        id: '',
        tier: 'premium',
      });
    });
    setBanner({ kind: 'ok', msg: '升级成功！现在可以下载 4K 视频了。' });
  };

  const lastSaved = useMemo(() => (saving ? '保存中…' : '已自动保存'), [saving]);

  return (
    <>
      <TopNav />

      <SideNav />

      {/* 主区：左编辑 / 右预览 两栏 */}
      <main className="flex-1 mt-16 lg:ml-sidebar-width flex overflow-hidden">
        {/* 左栏：脚本编辑 */}
        <section className="flex-1 flex flex-col bg-white border-r border-outline-variant overflow-hidden">
          <ConfigPanel
            title={title}
            onTitleChange={setTitle}
            script={script}
            onPatch={patch}
            onBgmUpload={onBgmUpload}
          />
          <TimelineEditor
            timeline={script.timeline}
            activeId={activeId}
            onActiveChange={setActiveId}
            onPatch={onPatchBlock}
            onDelete={onDeleteBlock}
            onDuplicate={onDuplicateBlock}
            onAdd={onAddBlock}
          />
          {/* 底部操作条 */}
          <div className="p-6 border-t border-outline-variant bg-surface flex flex-col gap-3">
            <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
              <span>
                {session.user
                  ? `已登录 · ${session.user.tier === 'premium' ? '专业版' : '免费版'}`
                  : '未登录'}
                {' · '}
                {lastSaved}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void save()}
                  className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant"
                >
                  保存
                </button>
                {session.user?.tier !== 'premium' && (
                  <button
                    type="button"
                    onClick={() => setUpgradeOpen(true)}
                    className="px-3 py-1.5 rounded-full bg-primary text-white"
                  >
                    升级专业版
                  </button>
                )}
              </div>
            </div>
            {banner && (
              <div
                className={
                  'rounded-lg px-3 py-2 text-[12px] ' +
                  (banner.kind === 'ok'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700')
                }
                onClick={() => setBanner(null)}
                role="status"
              >
                {banner.msg}
              </div>
            )}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => void preview()}
                className="flex-1 py-4 border-2 border-primary text-primary font-bold rounded-xl hover:bg-primary-fixed transition-colors"
              >
                生成带水印预览
              </button>
              <button
                type="button"
                onClick={() => void download()}
                className="flex-1 py-4 bg-primary-container text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">download</span>
                {session.user?.tier === 'premium'
                  ? '下载超清 MP4'
                  : '升级并下载超清'}
              </button>
            </div>
          </div>
        </section>

        {/* 右栏：手机模拟预览 */}
        <PhonePreview script={script} />
      </main>

      {/* 渲染状态弹窗 */}
      <RenderPanel
        jobId={renderJob?.id ?? null}
        kind={renderJob?.kind ?? 'preview'}
        onClose={() => setRenderJob(null)}
      />

      {/* 升级弹窗 */}
      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onUpgraded={upgraded}
      />

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
