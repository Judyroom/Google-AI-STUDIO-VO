import React from 'react';
import { Volume2, Dna, History, Library, Mic, Sun, Moon, Globe, Download } from 'lucide-react';
import { UILanguage, ThemeMode } from '../types';
import { I18N } from '../constants/i18n';

interface NavbarProps {
  activeTab: 'studio' | 'cloning' | 'library' | 'history';
  onTabChange: (tab: 'studio' | 'cloning' | 'library' | 'history') => void;
  clonedCount: number;
  historyCount: number;
  uiLang: UILanguage;
  onToggleUiLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  clonedCount,
  historyCount,
  uiLang,
  onToggleUiLang,
  theme,
  onToggleTheme,
}) => {
  const t = I18N[uiLang];

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white font-bold">
            <Volume2 className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
                Resona
              </span>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                {uiLang === 'zh' ? '语音工坊' : 'Audio Studio'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block">
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-zinc-800/80 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => onTabChange('studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              activeTab === 'studio'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/25'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{t.tabStudio}</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('cloning')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              activeTab === 'cloning'
                ? 'bg-cyan-500 text-zinc-950 font-semibold shadow-sm shadow-cyan-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            <span>{t.tabCloning}</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('library')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              activeTab === 'library'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.tabLibrary}</span>
            {clonedCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300">
                {clonedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.tabHistory}</span>
            {historyCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                {historyCount}
              </span>
            )}
          </button>
        </nav>

        {/* Global Controls: Download, Language & Theme */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Download Source Code ZIP */}
          <a
            href="/api/export/download-zip"
            download="resona-ai-studio-voice.zip"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold shadow-xs transition-colors"
            title={uiLang === 'zh' ? '一键打包下载全部源码 ZIP 压缩包' : 'Download Complete Source Code ZIP'}
          >
            <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{uiLang === 'zh' ? '下载源码 ZIP' : 'Download ZIP'}</span>
          </a>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={onToggleUiLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-indigo-500 text-xs font-medium transition-colors"
            title="Switch Language / 切换界面语言"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>{uiLang === 'zh' ? '中 / EN' : 'EN / 中'}</span>
          </button>

          {/* Theme Switcher Segmented Toggle */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => theme !== 'light' && onToggleTheme()}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                theme === 'light'
                  ? 'bg-white text-zinc-900 font-bold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
              title={t.themeLight}
            >
              <Sun className="w-3.5 h-3.5 text-yellow-500" />
              <span className="hidden sm:inline text-[11px]">{uiLang === 'zh' ? '浅色' : 'Light'}</span>
            </button>
            <button
              type="button"
              onClick={() => theme !== 'dark' && onToggleTheme()}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                theme === 'dark'
                  ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
              title={t.themeDark}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline text-[11px]">{uiLang === 'zh' ? '深色' : 'Dark'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
