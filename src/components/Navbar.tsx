import React from 'react';
import { Volume2, Wand2, History, Mic, Sun, Moon, Github } from 'lucide-react';
import { UILanguage, ThemeMode } from '../types';
import { I18N } from '../constants/i18n';

type TabId = 'studio' | 'design' | 'history';

interface NavbarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  designedCount: number;
  historyCount: number;
  uiLang: UILanguage;
  onToggleUiLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  designedCount,
  historyCount,
  uiLang,
  onToggleUiLang,
  theme,
  onToggleTheme,
}) => {
  const t = I18N[uiLang];

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'studio', label: t.tabStudio, icon: <Mic className="w-3.5 h-3.5" /> },
    { id: 'design', label: t.tabDesign, icon: <Wand2 className="w-3.5 h-3.5" />, count: designedCount },
    { id: 'history', label: t.tabHistory, icon: <History className="w-3.5 h-3.5" />, count: historyCount },
  ];

  const iconButton =
    'flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium transition-colors';

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white">
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[15px] tracking-tight text-zinc-900 dark:text-zinc-100">Resona</div>
            <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400">{t.brandSubtitle}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="order-last sm:order-none w-full sm:w-auto flex items-center gap-0.5 sm:gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-sm">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 sm:flex-none min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {!!tab.count && (
                  <span className="text-[10px] font-mono px-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Global Controls: GitHub, Language & Theme */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://github.com/Judyroom/Google-AI-STUDIO-VO"
            target="_blank"
            rel="noopener noreferrer"
            className={iconButton}
            title={uiLang === 'zh' ? '在 GitHub 查看项目' : 'View project on GitHub'}
          >
            <Github className="w-4 h-4" />
            <span className="hidden md:inline">GitHub</span>
          </a>

          <button
            type="button"
            onClick={onToggleUiLang}
            className={iconButton}
            title="Switch Language / 切换界面语言"
          >
            {uiLang === 'zh' ? 'EN' : '中文'}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className={`${iconButton} w-8 px-0`}
            title={theme === 'dark' ? t.themeLight : t.themeDark}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
