import React from 'react';
import { SpeechGenerationRecord, UILanguage } from '../types';
import { Play, Download, Trash2, RotateCcw, Clock } from 'lucide-react';
import { formatTime, downloadAudio } from '../utils/audio';
import { I18N } from '../constants/i18n';

interface HistoryDrawerProps {
  history: SpeechGenerationRecord[];
  onPlayItem: (item: SpeechGenerationRecord) => void;
  onLoadTextToEditor: (text: string) => void;
  onClearHistory: () => void;
  currentPlayingUrl?: string | null;
  uiLang: UILanguage;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onPlayItem,
  onLoadTextToEditor,
  onClearHistory,
  currentPlayingUrl,
  uiLang,
}) => {
  const t = I18N[uiLang];

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-10 text-center space-y-2 shadow-sm">
        <Clock className="w-8 h-8 mx-auto text-zinc-400 dark:text-zinc-600" />
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">{t.noHistoryTitle}</h4>
        <p className="text-xs text-zinc-500">
          {t.noHistoryDesc}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.generationHistoryTitle}</h3>
          <span className="text-xs text-zinc-500 font-mono">({history.length})</span>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          className="text-xs text-zinc-500 hover:text-rose-500 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t.clearHistoryBtn}</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {history.map((item) => {
          const isCurrent = currentPlayingUrl === item.audioUrl;
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-lg border transition-all ${
                isCurrent
                  ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 shadow-sm'
                  : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-200">{item.voiceName}</span>
                    {item.isCustomVoice && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300">
                        {uiLang === 'zh' ? '设计音色' : 'Designed'}
                      </span>
                    )}
                    {/* Language Badge */}
                    {item.outputLanguage && item.outputLanguage !== 'auto' && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        item.outputLanguage === 'zh'
                          ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                          : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      }`}>
                        {item.outputLanguage === 'zh' ? '中文' : 'EN'}
                      </span>
                    )}
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-500 dark:text-zinc-400 font-mono">{formatTime(item.durationSec)}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-500">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                    "{item.text}"
                  </p>

                  <div className="text-[11px] text-zinc-500">
                    Style: <span className="text-zinc-600 dark:text-zinc-400">{item.stylePrompt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPlayItem(item)}
                    className="p-2 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 transition-colors"
                    title="Play Audio"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onLoadTextToEditor(item.text)}
                    className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                    title={t.reorderTextBtn}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadAudio(item.audioUrl, `speech-${item.voiceName.toLowerCase()}-${item.id}.wav`)}
                    className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                    title={t.downloadWavBtn}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
