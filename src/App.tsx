import React, { useState, useRef, useEffect } from 'react';
import {
  PrebuiltVoiceName,
  VoiceStylePreset,
  DesignedVoice,
  SpeechGenerationRecord,
  SampleScript,
  UILanguage,
  OutputLanguage,
  ThemeMode,
} from './types';
import {
  VOICE_STYLE_PRESETS,
  VOCAL_BURSTS,
  SAMPLE_SCRIPTS,
} from './constants/voices';
import { I18N } from './constants/i18n';
import { Navbar } from './components/Navbar';
import { VoiceSelector } from './components/VoiceSelector';
import { StyleSelector } from './components/StyleSelector';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { VoiceDesignLab } from './components/VoiceDesignLab';
import { HistoryDrawer } from './components/HistoryDrawer';
import { Volume2, Sparkles, AlertCircle } from 'lucide-react';
import { saveAudio, loadAudio, deleteAudio, historyAudioKey, voicePreviewKey } from './utils/audioStore';
import { parseApiResponse, MAX_TEXT_LENGTH } from './utils/api';

const DEFAULT_TEXT_INITIAL =
  '欢迎使用 Resona 智能语音工坊。<breath> 您可以输入任意中文或英文段落，自由选择不同的声音角色与演绎风格，并听到流利自然的发音。|yeah| 还可以用一段文字描述，设计一个专属音色！';
const DEFAULT_TEXT_ZH =
  '欢迎使用 Resona 智能语音工坊。<breath> 薄雾笼罩着寂静的松林，守灯人擦拭着铜镜，等待着远方归来的旅人。|yeah| 祝您创作愉快！';
const DEFAULT_TEXT_EN =
  'Welcome to Resona Studio. <breath> You can type any sentence, choose distinct voice personas, and hear natural speech synthesized in real time. |yeah| Try switching voices and delivery styles!';
const BUILT_IN_TEXTS = new Set([DEFAULT_TEXT_INITIAL, DEFAULT_TEXT_ZH, DEFAULT_TEXT_EN, ...SAMPLE_SCRIPTS.map((s) => s.text)]);

export default function App() {
  // Theme mode: 'dark' | 'light' (default to dark, but toggleable to light)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('resona_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return 'dark';
  });

  // UI Language: 'zh' | 'en' (default to 'zh' as requested)
  const [uiLang, setUiLang] = useState<UILanguage>(() => {
    try {
      const saved = localStorage.getItem('resona_ui_lang');
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) {}
    return 'zh';
  });

  // Output Speech Language: 'zh' | 'en' | 'auto'
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>('zh');

  const t = I18N[uiLang];

  // Apply theme to document root and body
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem('resona_theme', theme);
    } catch (e) {}
  }, [theme]);

  // Persist UI Language
  useEffect(() => {
    document.documentElement.lang = uiLang === 'zh' ? 'zh-CN' : 'en';
    try {
      localStorage.setItem('resona_ui_lang', uiLang);
    } catch (e) {}
  }, [uiLang]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      if (next === 'dark') {
        root.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }
      try {
        localStorage.setItem('resona_theme', next);
      } catch (e) {}
      return next;
    });
  };

  const toggleUiLang = () => {
    setUiLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  };

  const [activeTab, setActiveTab] = useState<'studio' | 'design' | 'history'>('studio');

  // Voices designed with Gemini Voice Design (stored on Google, listed per browser)
  const [designedVoices, setDesignedVoices] = useState<DesignedVoice[]>(() => {
    try {
      const saved = localStorage.getItem('resona_designed_voices');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      const meta = designedVoices.map(({ previewAudioUrl, ...rest }) => rest);
      localStorage.setItem('resona_designed_voices', JSON.stringify(meta));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }, [designedVoices]);

  // Voice Selection State
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Kore');
  const [selectedCustomVoice, setSelectedCustomVoice] = useState<DesignedVoice | null>(null);
  const isCustomVoiceSelected = selectedCustomVoice !== null;

  // Style Selection State
  const [selectedStylePreset, setSelectedStylePreset] = useState<VoiceStylePreset>(VOICE_STYLE_PRESETS[0]);
  const [customStylePrompt, setCustomStylePrompt] = useState<string>('');
  const [isCustomStyleActive, setIsCustomStyleActive] = useState<boolean>(false);

  // Model Selection: Flash Lite (efficient) vs Flash (Voice Design & bursts)
  const [ttsModel, setTtsModel] = useState<'gemini-3.8-flash-lite-tts' | 'gemini-3.8-flash-tts'>(
    'gemini-3.8-flash-lite-tts'
  );

  // Text Composer State: default to Chinese or English based on outputLanguage
  const [speechText, setSpeechText] = useState<string>(DEFAULT_TEXT_INITIAL);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Swap in a matching sample text when the speech language changes, but only
  // while the editor still holds built-in text, so user input is never lost.
  const handleSelectOutputLanguage = (lang: OutputLanguage) => {
    setOutputLanguage(lang);
    const canReplaceText = !speechText.trim() || BUILT_IN_TEXTS.has(speechText);
    if (lang === 'zh') {
      if (canReplaceText) setSpeechText(DEFAULT_TEXT_ZH);
      // Auto-suggest Kore for Chinese if not custom
      if (!isCustomVoiceSelected && (selectedVoiceId === 'Puck' || selectedVoiceId === 'Charon')) {
        setSelectedVoiceId('Kore');
      }
    } else if (lang === 'en') {
      if (canReplaceText) setSpeechText(DEFAULT_TEXT_EN);
      if (!isCustomVoiceSelected && selectedVoiceId === 'Kore') {
        setSelectedVoiceId('Puck');
      }
    }
  };

  // Synthesis Action & Output
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [playRequestId, setPlayRequestId] = useState(0);
  const [currentAudioMetadata, setCurrentAudioMetadata] = useState<{ title: string; subtitle: string }>({
    title: '欢迎试听语音 (Welcome Speech)',
    subtitle: 'Kore · 中文普通话 · 自然交谈',
  });

  // Generation History
  const [history, setHistory] = useState<SpeechGenerationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('resona_generation_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read history from localStorage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      const meta = history.map(({ audioUrl, ...rest }) => ({ ...rest, audioUrl: '' }));
      localStorage.setItem('resona_generation_history', JSON.stringify(meta));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }, [history]);

  // On load: move audio left in localStorage by older versions into IndexedDB,
  // then fill in audio for records that only have metadata.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([
        ...history.filter((r) => r.audioUrl).map((r) => saveAudio(historyAudioKey(r.id), r.audioUrl)),
        ...designedVoices
          .filter((v) => v.previewAudioUrl)
          .map((v) => saveAudio(voicePreviewKey(v.id), v.previewAudioUrl!)),
      ]);
      const historyAudio = await loadAudio(history.filter((r) => !r.audioUrl).map((r) => historyAudioKey(r.id)));
      const voiceAudio = await loadAudio(designedVoices.filter((v) => !v.previewAudioUrl).map((v) => voicePreviewKey(v.id)));
      if (cancelled) return;
      setHistory((prev) => prev.map((r) => (r.audioUrl ? r : { ...r, audioUrl: historyAudio[historyAudioKey(r.id)] || '' })));
      setDesignedVoices((prev) =>
        prev.map((v) => (v.previewAudioUrl ? v : { ...v, previewAudioUrl: voiceAudio[voicePreviewKey(v.id)] }))
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPrebuiltVoice = (voiceId: PrebuiltVoiceName) => {
    setSelectedVoiceId(voiceId);
    setSelectedCustomVoice(null);
  };

  const handleSelectDesignedVoice = (voice: DesignedVoice) => {
    setSelectedVoiceId(voice.id);
    setSelectedCustomVoice(voice);
  };

  const handleInsertVocalBurst = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setSpeechText((prev) => `${prev} ${tag} `);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const newText = current.substring(0, start) + ` ${tag} ` + current.substring(end);
    setSpeechText(newText);

    if (ttsModel !== 'gemini-3.8-flash-tts') {
      setTtsModel('gemini-3.8-flash-tts');
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
    }, 10);
  };

  const handleLoadSampleScript = (script: SampleScript) => {
    setSpeechText(script.text);
    if (script.language) {
      setOutputLanguage(script.language);
    }
    if (script.suggestedVoice) {
      handleSelectPrebuiltVoice(script.suggestedVoice);
    }
    if (script.suggestedStyleId) {
      const matched = VOICE_STYLE_PRESETS.find((s) => s.id === script.suggestedStyleId);
      if (matched) {
        setSelectedStylePreset(matched);
        setIsCustomStyleActive(false);
      }
    }
  };

  const handleGenerateSpeech = async () => {
    if (!speechText.trim()) {
      alert(uiLang === 'zh' ? '请输入想要朗读的文本。' : 'Please enter text to synthesize.');
      return;
    }
    if (speechText.length > MAX_TEXT_LENGTH) {
      setGenerationError(
        uiLang === 'zh'
          ? `文本最多 ${MAX_TEXT_LENGTH} 字符，请分段生成。`
          : `Text is limited to ${MAX_TEXT_LENGTH} characters. Please split it up.`
      );
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const effectiveStylePrompt = isCustomStyleActive
        ? customStylePrompt
        : selectedStylePreset.stylePrompt;

      const voiceDisplay = selectedCustomVoice ? selectedCustomVoice.name : selectedVoiceId;
      const styleDisplay = isCustomStyleActive
        ? (uiLang === 'zh' ? '自定义风格' : 'Custom Style')
        : (uiLang === 'zh' ? selectedStylePreset.nameZh : selectedStylePreset.name);

      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: speechText,
          voiceName: selectedCustomVoice ? undefined : selectedVoiceId,
          customVoiceId: selectedCustomVoice?.id,
          stylePrompt: effectiveStylePrompt,
          outputLanguage,
          model: ttsModel,
        }),
      });

      const data = await parseApiResponse(res, uiLang);

      const finalAudioUrl: string = data.audioUrl;
      const durationSec: number = data.durationSec || 0;

      const langLabel = outputLanguage === 'zh' ? '中文普通话' : outputLanguage === 'en' ? '英语' : '自动语言';

      setCurrentAudioUrl(finalAudioUrl);
      setCurrentAudioMetadata({
        title: `${voiceDisplay} · ${styleDisplay}`,
        subtitle: `${langLabel} · ~${durationSec}s · ${speechText.length} ${t.charsLabel}`,
      });

      const newRecord: SpeechGenerationRecord = {
        id: `rec_${Date.now()}`,
        text: speechText,
        audioUrl: finalAudioUrl,
        durationSec,
        voiceName: voiceDisplay,
        isCustomVoice: isCustomVoiceSelected,
        customVoiceId: selectedCustomVoice?.id,
        baseVoice: selectedCustomVoice ? undefined : selectedVoiceId,
        outputLanguage,
        stylePrompt: isCustomStyleActive ? 'Custom' : selectedStylePreset.name,
        model: data.model || ttsModel,
        createdAt: new Date().toISOString(),
      };

      saveAudio(historyAudioKey(newRecord.id), finalAudioUrl);
      setHistory((prev) => {
        const dropped = prev.slice(49);
        if (dropped.length) deleteAudio(dropped.map((r) => historyAudioKey(r.id)));
        return [newRecord, ...prev.slice(0, 49)];
      });
    } catch (err: any) {
      console.error('TTS Generation error:', err);
      setGenerationError(err.message || 'Failed to synthesize speech.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoiceDesigned = (voice: DesignedVoice) => {
    if (voice.previewAudioUrl) saveAudio(voicePreviewKey(voice.id), voice.previewAudioUrl);
    setDesignedVoices((prev) => [voice, ...prev.filter((v) => v.id !== voice.id)]);
  };

  const handleUseDesignedVoice = (voice: DesignedVoice) => {
    handleSelectDesignedVoice(voice);
    setActiveTab('studio');
  };

  const handleDeleteDesignedVoice = async (voice: DesignedVoice) => {
    const res = await fetch(`/api/voices/${encodeURIComponent(voice.id)}`, { method: 'DELETE' });
    await parseApiResponse(res, uiLang);
    deleteAudio([voicePreviewKey(voice.id)]);
    setDesignedVoices((prev) => prev.filter((v) => v.id !== voice.id));
    if (selectedCustomVoice?.id === voice.id) {
      handleSelectPrebuiltVoice('Kore');
    }
  };

  const relevantSampleScripts = SAMPLE_SCRIPTS.filter((s) => {
    if (outputLanguage === 'zh') return s.language === 'zh';
    if (outputLanguage === 'en') return s.language === 'en';
    return true;
  });

  const cardClass =
    'rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4 shadow-sm';
  const cardTitleClass = 'text-sm font-semibold text-zinc-900 dark:text-zinc-100';
  const activeVoiceName = selectedCustomVoice ? selectedCustomVoice.name : selectedVoiceId;
  const outputLangShort =
    outputLanguage === 'zh'
      ? (uiLang === 'zh' ? '中文' : 'Chinese')
      : outputLanguage === 'en'
      ? (uiLang === 'zh' ? '英语' : 'English')
      : t.outputLangAuto;

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors selection:bg-indigo-500/30 selection:text-indigo-700 dark:selection:text-indigo-200`}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        designedCount={designedVoices.length}
        historyCount={history.length}
        uiLang={uiLang}
        onToggleUiLang={toggleUiLang}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tab 1: Standard TTS Studio (kept mounted so audio keeps playing on other tabs) */}
        <div className={activeTab === 'studio' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Editor & Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Text Composer Card */}
              <section className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className={cardTitleClass}>{t.inputScriptLabel}</h2>

                  {/* Output Language Segmented Control */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.outputLangLabel}</span>
                    <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-950 rounded-lg text-xs">
                      {([
                        ['zh', uiLang === 'zh' ? '中文' : 'Chinese'],
                        ['en', uiLang === 'zh' ? '英语' : 'English'],
                        ['auto', t.outputLangAuto],
                      ] as [OutputLanguage, string][]).map(([lang, label]) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleSelectOutputLanguage(lang)}
                          className={`px-3 py-1 rounded-md whitespace-nowrap transition-all ${
                            outputLanguage === lang
                              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sample Scripts */}
                {relevantSampleScripts.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-zinc-500">{t.presetsLabel}</span>
                    {relevantSampleScripts.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleLoadSampleScript(s)}
                        className="text-xs px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 text-zinc-600 dark:text-zinc-300 transition-colors"
                      >
                        {uiLang === 'zh' ? s.titleZh : s.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Textarea */}
                <textarea
                  ref={textareaRef}
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  rows={7}
                  maxLength={MAX_TEXT_LENGTH}
                  placeholder={t.textareaPlaceholder}
                  className="w-full bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-[15px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed resize-y"
                />

                {/* Expressive Bursts Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 text-xs text-zinc-500 mr-1">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      {t.vocalBurstsLabel}
                    </span>
                    {VOCAL_BURSTS.map((burst) => (
                      <button
                        key={burst.tag}
                        type="button"
                        onClick={() => handleInsertVocalBurst(burst.tag)}
                        className="px-2 py-0.5 text-xs font-mono rounded-md bg-zinc-100 dark:bg-zinc-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 transition-colors active:scale-95"
                        title={burst.desc}
                      >
                        {burst.tag}
                      </button>
                    ))}
                  </div>
                  <span className={`text-xs font-mono ${speechText.length >= MAX_TEXT_LENGTH ? 'text-rose-500' : 'text-zinc-500'}`}>
                    {speechText.length}/{MAX_TEXT_LENGTH} {t.charsLabel}
                  </span>
                </div>

                {/* Primary Synthesize Button */}
                <button
                  type="button"
                  onClick={handleGenerateSpeech}
                  disabled={isGenerating || !speechText.trim()}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[15px] shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t.synthesizingState}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>{uiLang === 'zh' ? '生成语音' : 'Generate speech'}</span>
                      <span className="text-indigo-200 font-normal text-sm">
                        · {activeVoiceName} · {outputLangShort}
                      </span>
                    </>
                  )}
                </button>

                {generationError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{generationError}</span>
                  </div>
                )}
              </section>

              {/* Master Output Audio Player */}
              <div className="space-y-2">
                <h2 className={`${cardTitleClass} px-1`}>{t.outputStationLabel}</h2>
                <AudioPlayerBar
                  audioUrl={currentAudioUrl}
                  title={currentAudioMetadata.title}
                  subtitle={currentAudioMetadata.subtitle}
                  outputLanguage={outputLanguage}
                  uiLang={uiLang}
                  autoPlay={true}
                  playRequestId={playRequestId}
                />
              </div>
            </div>

            {/* Right Column: Voice Personas, Styles & Engine Settings (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Voice Selection Box */}
              <section className={cardClass}>
                <VoiceSelector
                  selectedVoiceId={selectedVoiceId}
                  isCustomVoiceSelected={isCustomVoiceSelected}
                  designedVoices={designedVoices}
                  onSelectPrebuiltVoice={handleSelectPrebuiltVoice}
                  onSelectDesignedVoice={handleSelectDesignedVoice}
                  onGoToDesign={() => setActiveTab('design')}
                  uiLang={uiLang}
                  outputLanguage={outputLanguage}
                />
              </section>

              {/* Delivery Style & Tone Selector */}
              <section className={cardClass}>
                <StyleSelector
                  selectedStyleId={selectedStylePreset.id}
                  customStylePrompt={customStylePrompt}
                  isCustomActive={isCustomStyleActive}
                  onSelectPreset={(preset) => {
                    setSelectedStylePreset(preset);
                    setIsCustomStyleActive(false);
                  }}
                  onCustomPromptChange={setCustomStylePrompt}
                  onToggleCustom={() => setIsCustomStyleActive(!isCustomStyleActive)}
                  uiLang={uiLang}
                />
              </section>

              {/* Synthesis Engine Settings */}
              <section className={cardClass}>
                <div className="flex items-center justify-between">
                  <h2 className={cardTitleClass}>{t.neuralTierLabel}</h2>
                  <span className="text-[11px] text-zinc-500 font-mono">24 kHz WAV</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTtsModel('gemini-3.8-flash-lite-tts')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      ttsModel === 'gemini-3.8-flash-lite-tts'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-semibold text-zinc-900 dark:text-zinc-200">{t.flashLiteName}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{t.flashLiteDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTtsModel('gemini-3.8-flash-tts')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      ttsModel === 'gemini-3.8-flash-tts'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-semibold text-zinc-900 dark:text-zinc-200">{t.flashName}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{t.flashDesc}</div>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Tab 2: Voice Design Lab */}
        {activeTab === 'design' && (
          <VoiceDesignLab
            designedVoices={designedVoices}
            onVoiceCreated={handleVoiceDesigned}
            onDeleteVoice={handleDeleteDesignedVoice}
            onUseVoice={handleUseDesignedVoice}
            uiLang={uiLang}
          />
        )}

        {/* Tab 3: History Drawer */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto">
            <HistoryDrawer
              history={history}
              currentPlayingUrl={currentAudioUrl}
              onPlayItem={(item) => {
                setCurrentAudioUrl(item.audioUrl);
                setPlayRequestId((n) => n + 1);
                setCurrentAudioMetadata({
                  title: `${item.voiceName} · ${item.stylePrompt}`,
                  subtitle: `${item.outputLanguage === 'zh' ? '中文' : item.outputLanguage === 'en' ? '英语' : 'Auto'} · ${new Date(item.createdAt).toLocaleTimeString()}`,
                });
                setActiveTab('studio');
              }}
              onLoadTextToEditor={(text) => {
                setSpeechText(text);
                setActiveTab('studio');
              }}
              onClearHistory={() => {
                if (!window.confirm(uiLang === 'zh' ? '清空全部生成历史？此操作无法撤销。' : 'Clear all history? This cannot be undone.')) return;
                deleteAudio(history.map((r) => historyAudioKey(r.id)));
                setHistory([]);
              }}
              uiLang={uiLang}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 py-6 text-center text-xs text-zinc-500 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-400">Resona Audio Studio</span>
            <span>·</span>
            <span>{uiLang === 'zh' ? '基于 Gemini 语音合成与 Voice Design' : 'Powered by Gemini TTS & Voice Design'}</span>
          </div>
          <div>
            <span>16-bit 24kHz Lossless Audio Streaming</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
