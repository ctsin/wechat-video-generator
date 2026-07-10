// 侧边导航（移植自 stitch/_1）
const items = [
  { icon: 'edit_note', label: '编辑器', active: true },
  { icon: 'auto_stories', label: '脚本编排', active: false },
  { icon: 'group', label: '角色管理', active: false },
  { icon: 'folder_open', label: '媒体库', active: false },
  { icon: 'settings', label: '设置', active: false },
];

export const SideNav: React.FC = () => {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-sidebar-width flex-col p-4 bg-surface-container-low border-r border-outline-variant hidden lg:flex">
      <div className="flex items-center gap-3 px-4 py-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-white">
          <span className="material-symbols-outlined">movie_edit</span>
        </div>
        <div>
          <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
            新视频项目
          </h3>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
            草稿 - 2分钟前
          </p>
        </div>
      </div>
      <div className="space-y-1">
        {items.map((it) => (
          <div
            key={it.label}
            className={
              it.active
                ? 'bg-primary-container text-on-primary-container flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer'
                : 'text-on-surface-variant hover:bg-surface-variant flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all'
            }
          >
            <span className="material-symbols-outlined">{it.icon}</span>
            <span className="font-label-caps text-label-caps">{it.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-6 border-t border-outline-variant">
        <button className="w-full py-3 px-4 bg-primary text-white rounded-xl font-label-caps text-label-caps mb-4">
          升级到专业版
        </button>
        <div className="text-on-surface-variant hover:bg-surface-variant flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all">
          <span className="material-symbols-outlined">help_outline</span>
          <span className="font-label-caps text-label-caps">帮助中心</span>
        </div>
      </div>
    </aside>
  );
};
