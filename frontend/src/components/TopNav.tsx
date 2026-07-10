// 顶部导航栏（移植自 stitch/_1）
export const TopNav: React.FC = () => {
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-gutter h-16 bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-8">
        <span className="font-headline-md text-headline-md font-bold text-primary">
          ChatGen Studio
        </span>
        <nav className="hidden md:flex gap-6">
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            项目
          </a>
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            模板
          </a>
          <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            素材
          </a>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button className="material-symbols-outlined text-on-surface-variant cursor-pointer active:opacity-80">
          dark_mode
        </button>
        <button className="material-symbols-outlined text-on-surface-variant cursor-pointer active:opacity-80">
          notifications
        </button>
        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-sm font-bold">
          U
        </div>
      </div>
    </header>
  );
};
