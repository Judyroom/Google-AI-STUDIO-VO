import React, { useState, useRef, useEffect } from 'react';
import { PREBUILT_VOICES } from '../constants/voices';
import { PrebuiltVoiceName, DesignedVoice, UILanguage, OutputLanguage } from '../types';
import { I18N } from '../constants/i18n';
import { parseApiResponse } from '../utils/api';
import { claimPlayback } from '../utils/playback';
import { Wand2, Play, Pause, Loader2, CheckCircle2, Plus } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  isCustomVoiceSelected: boolean;
  designedVoices: DesignedVoice[];
  onSelectPrebuiltVoice: (voiceId: PrebuiltVoiceName) => void;
  onSelectDesignedVoice: (voice: DesignedVoice) => void;
  onGoToDesign: () => void;
  uiLang: UILanguage;
  outputLanguage: OutputLanguage;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  isCustomVoiceSelected,
  designedVoices,
  onSelectPrebuiltVoice,
  onSelectDesignedVoice,
  onGoToDesign,
  uiLang,
  outputLanguage,
}) => {
  const t = I18N[uiLang];
  const [langFilter, setLangFilter] = useState<'all' | 'zh' | 'en'>('all');

  // Preview language: voice filter first, then speech language, then UI language.
  const previewLang: 'zh' | 'en' =
    langFilter !== 'all' ? langFilter : outputLanguage !== 'auto' ? outputLanguage : uiLang;

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

        const data = await parseApiResponse<{ audioUrl: string }>(res, uiLang);
        audioUrl = data.audioUrl;
        previewCacheRef.current[cacheKey] = audioUrl;
      }

      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio();
      }

      const audio = previewAudioRef.current;
      audio.src = audioUrl;
      audio.onended = () => setPlayingVoiceId(null);
      audio.onpause = () => setPlayingVoiceId(null);

      claimPlayback(audio);
      await audio.play();
      setPlayingVoiceId(voiceName);
    } catch (err) {
      console.error('Error previewing voice:', err);
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const handleToggleDesignedPreview = (e: React.MouseEvent, voice: DesignedVoice) => {
    e.stopPropagation();
    if (playingVoiceId === voice.id) {
      previewAudioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }
    if (!voice.previewAudioUrl) return;
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
    }
    const audio = previewAudioRef.current;
    audio.src = voice.previewAudioUrl;
    audio.onended = () => setPlayingVoiceId(null);
    audio.onpause = () => setPlayingVoiceId(null);
    claimPlayback(audio);
    audio.play().then(() => setPlayingVoiceId(voice.id)).catch(console.error);
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
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.voicePersonaLabel}</h2>

        <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-950 rounded-lg text-xs">
          {([
            ['all', uiLang === 'zh' ? '全部' : 'All'],
            ['zh', uiLang === 'zh' ? '适合中文' : 'Chinese'],
            ['en', uiLang === 'zh' ? '适合英语' : 'English'],
          ] as ['all' | 'zh' | 'en', string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setLangFilter(id)}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                langFilter === id
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Designed Voices */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400">
            <Wand2 className="w-3.5 h-3.5" />
            {uiLang === 'zh' ? '我设计的音色' : 'My designed voices'}
          </span>
          <button
            type="button"
            onClick={onGoToDesign}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            {uiLang === 'zh' ? '设计新音色' : 'Design new'}
          </button>
        </div>

        {designedVoices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {designedVoices.map((voice) => {
              const isSelected = isCustomVoiceSelected && selectedVoiceId === voice.id;
              const isPlayingThis = playingVoiceId === voice.id;
              return (
                <div
                  key={voice.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectDesignedVoice(voice)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectDesignedVoice(voice);
                    }
                  }}
                  title={voice.prompt}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    isSelected
                      ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-500 ring-1 ring-violet-500'
                      : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0" />
                      )}
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{voice.name}</span>
                    </div>
                    {voice.previewAudioUrl && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleDesignedPreview(e, voice)}
                        className={`shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          isPlayingThis
                            ? 'bg-violet-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                        }`}
                      >
                        {isPlayingThis ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                        <span>{isPlayingThis ? t.previewPlayingBtn : t.previewVoiceBtn}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">{voice.prompt}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prebuilt Standard Neural Voices */}
      <div className="space-y-2.5">
        {outputLanguage !== 'auto' && (
          <p className="pt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {outputLanguage === 'zh'
              ? '中文朗读推荐 Kore（温润）或 Zephyr（知性）'
              : 'For English, try Puck (energetic), Fenrir (epic) or Charon (gritty)'}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredVoices.map((voice) => {
            const isSelected = !isCustomVoiceSelected && selectedVoiceId === voice.id;
            const isPlayingThis = playingVoiceId === voice.id;
            const isLoadingThis = loadingVoiceId === voice.id;
            const genderLabel =
              uiLang === 'zh'
                ? voice.gender === 'Feminine' ? '女声' : voice.gender === 'Masculine' ? '男声' : '中性'
                : voice.gender === 'Feminine' ? 'Female' : voice.gender === 'Masculine' ? 'Male' : 'Neutral';
            const isBilingual = voice.recommendedLanguages.includes('zh') && voice.recommendedLanguages.includes('en');

            return (
              <div
                key={voice.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectPrebuiltVoice(voice.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectPrebuiltVoice(voice.id);
                  }
                }}
                title={uiLang === 'zh' ? voice.suitabilityDescriptionZh : voice.suitabilityDescriptionEn}
                className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0" />
                    )}
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{voice.name}</span>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">{genderLabel}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleTogglePreview(e, voice.id)}
                    className={`shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      isPlayingThis
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300'
                    }`}
                    title={
                      uiLang === 'zh'
                        ? `试听 ${voice.name} ${previewLang === 'en' ? '英文' : '中文'}样句`
                        : `Preview ${voice.name} (${previewLang === 'en' ? 'English' : 'Chinese'})`
                    }
                  >
                    {isLoadingThis ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isPlayingThis ? (
                      <Pause className="w-3 h-3 fill-current" />
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                    <span>{isPlayingThis ? t.previewPlayingBtn : t.previewVoiceBtn}</span>
                  </button>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                  {uiLang === 'zh' ? voice.timbreDescriptionZh : voice.timbreDescription}
                </p>

                <div className="flex flex-wrap gap-1">
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded ${
                      isBilingual
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {isBilingual ? (uiLang === 'zh' ? '中英双语' : 'Bilingual') : (uiLang === 'zh' ? '英语优先' : 'English first')}
                  </span>
                  {(uiLang === 'zh' ? voice.toneZh : voice.tone).slice(0, 2).map((tone) => (
                    <span
                      key={tone}
                      className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded"
                    >
                      {tone}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
