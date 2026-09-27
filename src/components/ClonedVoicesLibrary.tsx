import React from 'react';
import { ClonedVoiceProfile, UILanguage } from '../types';
import { I18N } from '../constants/i18n';
import { Dna, ArrowRight, Trash2 } from 'lucide-react';

interface ClonedVoicesLibraryProps {
  clonedVoices: ClonedVoiceProfile[];
  onSelectVoice: (voice: ClonedVoiceProfile) => void;
  onDeleteVoice: (voiceId: string) => void;
  onGoToCloningLab: () => void;
  uiLang: UILanguage;
}

export const ClonedVoicesLibrary: React.FC<ClonedVoicesLibraryProps> = ({
  clonedVoices,
  onSelectVoice,
  onDeleteVoice,
  onGoToCloningLab,
  uiLang,
}) => {
  const t = I18N[uiLang];

  if (clonedVoices.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-12 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-600 dark:text-cyan-400">
          <Dna className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{t.noClonedYet}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            {t.noClonedDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToCloningLab}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs transition-colors shadow-md shadow-cyan-500/20"
        >
          <Dna className="w-4 h-4" />
          <span>{t.openLabBtn}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{t.clonedLibraryTitle}</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            {t.clonedLibrarySubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToCloningLab}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
        >
          <Dna className="w-3.5 h-3.5 text-cyan-500" />
          <span>{t.cloneNewVoiceBtn}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clonedVoices.map((voice) => (
          <div
            key={voice.id}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 flex flex-col justify-between space-y-4 hover:border-cyan-500 transition-all group shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{voice.name}</h4>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-mono">
                      CLONED
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {voice.gender} · {voice.pitchRegister} · {voice.accent}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteVoice(voice.id)}
                  className="text-zinc-400 hover:text-rose-500 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Delete voice profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-2">
                {voice.timbreDescription || voice.summary}
              </p>

              {/* Timbre Radar Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px]">
                <div className="bg-zinc-50 dark:bg-zinc-950/80 p-2 rounded border border-zinc-200 dark:border-zinc-800/80 text-center">
                  <div className="text-zinc-500 text-[10px]">{t.harmonicWarmth}</div>
                  <div className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{voice.timbreScores?.warmth || 8}/10</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950/80 p-2 rounded border border-zinc-200 dark:border-zinc-800/80 text-center">
                  <div className="text-zinc-500 text-[10px]">{t.spectralBrightness}</div>
                  <div className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{voice.timbreScores?.brightness || 7}/10</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950/80 p-2 rounded border border-zinc-200 dark:border-zinc-800/80 text-center">
                  <div className="text-zinc-500 text-[10px]">{t.vocalGravel}</div>
                  <div className="font-mono text-violet-600 dark:text-violet-400 font-semibold">{voice.timbreScores?.gravel || 3}/10</div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                <span>Base: {voice.bestBaseVoice}</span>
                {voice.dspConfig && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                    {voice.dspConfig.pitchSemitones > 0 ? `+${voice.dspConfig.pitchSemitones}st` : `${voice.dspConfig.pitchSemitones}st`}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSelectVoice(voice)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 text-xs font-semibold transition-colors"
              >
                <span>{t.useInStudioButton}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
