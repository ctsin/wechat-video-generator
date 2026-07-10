// Render status panel. Polls the relevant status endpoint until the job
// reaches "done" or "failed", then surfaces the output URL (download).
import { useEffect, useState } from 'react';
import { api, type JobDTO } from '../lib/api';

export type RenderKind = 'preview' | 'premium';

export interface RenderPanelProps {
  jobId: string | null;
  kind: RenderKind;
  onClose: () => void;
}

export const RenderPanel: React.FC<RenderPanelProps> = ({
  jobId,
  kind,
  onClose,
}) => {
  const [job, setJob] = useState<JobDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);

    const tick = async (): Promise<void> => {
      try {
        const { job } = await (kind === 'preview'
          ? api.getPreviewJob(jobId)
          : api.getPremiumJob(jobId));
        if (cancelled) return;
        setJob(job);
        if (job.status === 'done' || job.status === 'failed') return;
        setTimeout(tick, 800);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [jobId, kind]);

  if (!jobId) return null;

  const pct = Math.round((job?.progress ?? 0) * 100);
  const outputUrl = job?.outputUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-title-sm text-title-sm">
            {kind === 'preview' ? '预览生成中' : '高清下载'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface"
            aria-label="关闭"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
            <span>状态：{labelFor(job?.status)}</span>
            <span>{pct}%</span>
          </div>
        </div>

        {job?.watermark && (
          <div className="text-[12px] text-on-surface-variant bg-surface-container-low rounded-lg p-3">
            当前为免费版渲染：视频会带「ChatGen Studio」水印。升级后可生成 4K 去水印版本。
          </div>
        )}

        {error && (
          <div className="text-error text-[12px] bg-error-container/40 rounded-lg p-3">
            {error}
          </div>
        )}

        {job?.status === 'done' && outputUrl && (
          <a
            className="block text-center py-3 rounded-xl bg-primary text-white font-label-caps text-label-caps hover:shadow-lg"
            href={outputUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span className="material-symbols-outlined align-middle mr-2">
              download
            </span>
            下载 MP4
          </a>
        )}
        {job?.status === 'failed' && job.error && (
          <div className="text-[12px] text-error">失败原因：{job.error}</div>
        )}
      </div>
    </div>
  );
};

function labelFor(status: JobDTO['status'] | undefined): string {
  switch (status) {
    case 'queued':
      return '排队中';
    case 'rendering':
      return '渲染中';
    case 'done':
      return '完成';
    case 'failed':
      return '失败';
    default:
      return '等待中';
  }
}
