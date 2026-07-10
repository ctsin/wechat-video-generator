// Pay / upgrade dialog. Hits /api/auth/upgrade (dev-mode shortcut) to flip
// the JWT into premium tier without leaving the page.

import { useEffect, useState } from 'react';
import { api, type PayOrderDTO } from '../lib/api';

export const UpgradeDialog: React.FC<{ open: boolean; onClose: () => void; onUpgraded: (token: string) => void }> = ({ open, onClose, onUpgraded }) => {
  const [order, setOrder] = useState<PayOrderDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setOrder(null);
    api
      .createOrder({ openid: 'demo_openid_' + Math.random().toString(36).slice(2, 8), amount: 9900 })
      .then(setOrder)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [open]);

  if (!open) return null;

  const upgrade = async () => {
    setPending(true);
    setErr(null);
    try {
      const res = await api.upgrade();
      onUpgraded(res.token);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-title-sm text-title-sm">升级到专业版</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface"
            aria-label="关闭"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          解锁 4K 渲染、60FPS、无限节点、无水印、动态岛机型等高级能力。
        </p>

        <div className="rounded-xl border border-outline-variant p-4 bg-surface-container-low">
          <div className="flex items-center justify-between">
            <span className="font-body-sm">订单金额</span>
            <span className="font-headline-md">¥{(9900 / 100).toFixed(2)}</span>
          </div>
          {order && (
            <div className="mt-3 space-y-1 text-[12px] text-on-surface-variant break-all">
              <div>订单号：{order.orderId}</div>
              <div>二维码：{order.qrCode}</div>
              <div className="truncate">开发快捷链接：
                <a className="text-primary hover:underline" href={order.simulateSuccessUrl}>
                  模拟支付成功
                </a>
              </div>
            </div>
          )}
        </div>

        {err && (
          <div className="text-error text-[12px] bg-error-container/40 rounded-lg p-3">
            {err}
          </div>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={upgrade}
          className="w-full py-3 rounded-xl bg-primary text-white font-label-caps text-label-caps disabled:opacity-60"
        >
          {pending ? '处理中…' : '立即升级（开发模拟）'}
        </button>
      </div>
    </div>
  );
};
