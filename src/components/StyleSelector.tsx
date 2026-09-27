import React from 'react';
import { VOICE_STYLE_PRESETS } from '../constants/voices';
import { VoiceStylePreset, UILanguage } from '../types';
import { I18N } from '../constants/i18n';
import {
  MessageSquare,
  Radio,
  BookOpen,
  Film,
  Sparkles,
  Zap,
  Moon,
  Smile,
  Edit3,
} from 'lucide-react';

interface StyleSelectorProps {
  selectedStyleId: string;
  customStylePrompt: string;
  isCustomActive: boolean;
  onSelectPreset: (preset: VoiceStylePreset) => void;
  onCustomPromptChange: (prompt: string) => void;
  onToggleCustom: () => void;
  uiLang: UILanguage;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyleId,
  customStylePrompt,
  isCustomActive,
  onSelectPreset,
  onCustomPromptChange,
  onToggleCustom,
  uiLang,
}) => {
  const t = I18N[uiLang];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Radio':
        return <Radio className="w-3.5 h-3.5 text-indigo-500" />;
      case 'BookOpen':
        return <BookOpen className="w-3.5 h-3.5 text-violet-500" />;
      case 'Film':
        return <Film className="w-3.5 h-3.5 text-rose-500" />;
      case 'Sparkles':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />;
      case 'Zap':
        return <Zap className="w-3.5 h-3.5 text-indigo-500" />;
      case 'Moon':
        return <Moon className="w-3.5 h-3.5 text-cyan-500" />;
      case 'Smile':
        return <Smile className="w-3.5 h-3.5 text-pink-500" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.deliveryStyleLabel}</h2>
        <button
          type="button"
          onClick={onToggleCustom}
          className={`flex items-center gap-1 text-xs font-medium transition-colors ${
            isCustomActive
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isCustomActive ? t.usingCustomStyle : t.writeCustomStyle}</span>
        </button>
      </div>

      {isCustomActive ? (
        <div className="p-3.5 rounded-lg border border-indigo-500/50 bg-indigo-50/50 dark:bg-zinc-900/90 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span>
              {uiLang === 'zh'
                ? '给 Gemini 语音模型的声学生成指导指令：'
                : 'Acoustic style prompt for Gemini Speech Synthesis:'}
            </span>
            <button
              type="button"
              onClick={onToggleCustom}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            >
              {t.cancelCustom}
            </button>
          </div>
          <textarea
            value={customStylePrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            placeholder={t.customStylePlaceholder}
            rows={2}
            className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700/80 rounded-md p-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-sans resize-none"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {VOICE_STYLE_PRESETS.map((preset) => {
            const isSelected = !isCustomActive && selectedStyleId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 w-full">
                  {getIcon(preset.icon)}
                  <span className="text-xs font-semibold truncate">
                    {uiLang === 'zh' ? preset.nameZh : preset.name}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                  {uiLang === 'zh' ? preset.descriptionZh : preset.description}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
