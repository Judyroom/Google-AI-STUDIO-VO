import React, { useState, useRef, useEffect } from 'react';
import { PREBUILT_VOICES } from '../constants/voices';
import { PrebuiltVoiceName, ClonedVoiceProfile, UILanguage, OutputLanguage } from '../types';
import { I18N } from '../constants/i18n';
import { Dna, Volume2, Play, Pause, Loader2 } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  isClonedVoiceSelected: boolean;
  clonedVoices: ClonedVoiceProfile[];
  onSelectPrebuiltVoice: (voiceId: PrebuiltVoiceName) => void;
  onSelectClonedVoice: (clonedVoice: ClonedVoiceProfile) => void;
  uiLang: UILanguage;
  outputLanguage: OutputLanguage;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  isClonedVoiceSelected,
  clonedVoices,
  onSelectPrebuiltVoice,
  onSelectClonedVoice,
  uiLang,
  outputLanguage,
}) => {
  const t = I18N[uiLang];
  const [langFilter, setLangFilter] = useState<'all' | 'zh' | 'en'>('all');

  // Preview audio playback state
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const previewCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  const handleTogglePreview = async (e: React.MouseEvent, voiceName: PrebuiltVoiceName) => {
    e.stopPropagation(); // prevent selecting the card

    // If already playing this voice, stop it
    if (playingVoiceId === voiceName) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    const previewLang = outputLanguage === 'en' ? 'en' : 'zh';
    const cacheKey = `${voiceName}_${previewLang}`;

    setLoadingVoiceId(voiceName);

    try {
      let audioUrl = previewCacheRef.current[cacheKey];

      if (!audioUrl) {
        const res = await fetch('/api/tts/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voiceName,
            lang: previewLang,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch preview audio');
        }

        audioUrl = data.audioUrl;
        previewCacheRef.current[cacheKey] = audioUrl;
      }

      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio();
      }

      const audio = previewAudioRef.current;
      audio.src = audioUrl;
      audio.onended = () => {
        setPlayingVoiceId(null);
      };

      await audio.play();
      setPlayingVoiceId(voiceName);
    } catch (err) {
      console.error('Error previewing voice:', err);
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const handleToggleClonedPreview = (e: React.MouseEvent, clonedVoice: ClonedVoiceProfile) => {
    e.stopPropagation();

    if (playingVoiceId === clonedVoice.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    if (!clonedVoice.referenceAudioUrl) {
      return;
    }

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
    }

    const audio = previewAudioRef.current;
    audio.src = clonedVoice.referenceAudioUrl;
    audio.onended = () => {
      setPlayingVoiceId(null);
    };

    audio.play().then(() => {
      setPlayingVoiceId(clonedVoice.id);
    }).catch(console.error);
  };

  const filteredVoices = PREBUILT_VOICES.filter((voice) => {
    if (langFilter === 'zh') return voice.recommendedLanguages.includes('zh');
    if (langFilter === 'en') return voice.recommendedLanguages.includes('en');
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          {t.voicePersonaLabel}
        </label>

        {/* Language suitability filter tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px]">
          <button
            type="button"
            onClick={() => setLangFilter('all')}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              langFilter === 'all'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            {uiLang === 'zh' ? '全部音色' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setLangFilter('zh')}
            className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
              langFilter === 'zh'
                ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 font-medium shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <span>🇨🇳</span>
            <span>{uiLang === 'zh' ? '更适中文' : 'For Chinese'}</span>
          </button>
          <button
            type="button"
            onClick={() => setLangFilter('en')}
            className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
              langFilter === 'en'
                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-medium shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <span>🇺🇸</span>
            <span>{uiLang === 'zh' ? '更适英语' : 'For English'}</span>
          </button>
        </div>
      </div>

      {/* Cloned Voices section if any exist */}
      {clonedVoices.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
            <Dna className="w-3.5 h-3.5" />
            <span>{uiLang === 'zh' ? '已提取保存的克隆音色' : 'Your Cloned Voice Profiles'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {clonedVoices.map((cloned) => {
              const isSelected = isClonedVoiceSelected && selectedVoiceId === cloned.id;
              const isPlayingThisCloned = playingVoiceId === cloned.id;

              return (
                <div
                  key={cloned.id}
                  onClick={() => onSelectClonedVoice(cloned)}
                  className={`relative text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/20'
                      : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{cloned.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-mono">
                          CLONED
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-1">
                        {cloned.timbreDescription || cloned.summary}
                      </p>
                    </div>

                    {/* Preview Button for Cloned Voice */}
                    {cloned.referenceAudioUrl && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleClonedPreview(e, cloned)}
                        className={`p-1.5 rounded-full transition-colors shrink-0 ${
                          isPlayingThisCloned
                            ? 'bg-cyan-500 text-zinc-950'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                        title={isPlayingThisCloned ? '停止播放' : t.previewClonedSample}
                      >
                        {isPlayingThisCloned ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                    <span>{cloned.gender}</span>
                    <span>·</span>
                    <span>{cloned.pitchRegister}</span>
                    <span>·</span>
                    <span>Base: {cloned.bestBaseVoice}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prebuilt Standard Neural Voices */}
      <div>
        <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t.standardNeuralVoices}</span>
          </div>
          {outputLanguage !== 'auto' && (
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
              {outputLanguage === 'zh'
                ? '💡 中文输出首推 Kore (柔和)、Zephyr (知性)'
                : '💡 English: Puck (Energetic), Fenrir (Epic), Charon (Gritty)'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredVoices.map((voice) => {
            const isSelected = !isClonedVoiceSelected && selectedVoiceId === voice.id;
            const isPlayingThis = playingVoiceId === voice.id;
            const isLoadingThis = loadingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                onClick={() => onSelectPrebuiltVoice(voice.id)}
                className={`relative text-left p-3.5 rounded-lg border transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
                    : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {voice.name}
                      </span>
                      <span className="text-[11px] font-normal text-zinc-500">
                        ({uiLang === 'zh' ? (voice.gender === 'Feminine' ? '女声' : voice.gender === 'Masculine' ? '男声' : '中性') : voice.gender})
                      </span>
                    </div>

                    {/* Interactive Voice Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => handleTogglePreview(e, voice.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        isPlayingThis
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 animate-pulse'
                          : 'bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                      }`}
                      title={uiLang === 'zh' ? `试听 ${voice.name} 朗读样句` : `Audition ${voice.name} sample sentence`}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isPlayingThis ? (
                        <Pause className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      <span className="text-[11px]">
                        {isPlayingThis ? t.previewPlayingBtn : t.previewVoiceBtn}
                      </span>
                    </button>
                  </div>

                  {/* Language Suitability Tag */}
                  <div className="mt-2">
                    <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      voice.recommendedLanguages.includes('zh') && voice.recommendedLanguages.includes('en')
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                    }`}>
                      {uiLang === 'zh' ? voice.suitabilityTagZh : voice.suitabilityTagEn}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-2 leading-relaxed">
                    {uiLang === 'zh' ? voice.timbreDescriptionZh : voice.timbreDescription}
                  </p>

                  <p className="text-[11px] text-zinc-500 mt-1 italic">
                    {uiLang === 'zh' ? voice.suitabilityDescriptionZh : voice.suitabilityDescriptionEn}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {(uiLang === 'zh' ? voice.toneZh : voice.tone).slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {isSelected && (
                    <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                      {uiLang === 'zh' ? '当前选择' : 'Selected'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
