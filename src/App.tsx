import React, { useState, useRef, useEffect } from 'react';
import {
  PrebuiltVoiceName,
  VoiceStylePreset,
  ClonedVoiceProfile,
  SpeechGenerationRecord,
  SampleScript,
  UILanguage,
  OutputLanguage,
  ThemeMode,
} from './types';
import {
  PREBUILT_VOICES,
  VOICE_STYLE_PRESETS,
  VOCAL_BURSTS,
  SAMPLE_SCRIPTS,
  REFERENCE_SAMPLE_VOICES,
} from './constants/voices';
import { I18N } from './constants/i18n';
import { Navbar } from './components/Navbar';
import { VoiceSelector } from './components/VoiceSelector';
import { StyleSelector } from './components/StyleSelector';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { VoiceCloningLab } from './components/VoiceCloningLab';
import { ClonedVoicesLibrary } from './components/ClonedVoicesLibrary';
import { HistoryDrawer } from './components/HistoryDrawer';
import {
  Volume2,
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  Info,
  CheckCircle2,
  AlertCircle,
  Dna,
  Globe,
} from 'lucide-react';
import { processAudioWithDsp, isDspActive } from './utils/audioDsp';

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

  const [activeTab, setActiveTab] = useState<'studio' | 'cloning' | 'library' | 'history'>('studio');

  // Cloned Voice profiles list
  const [clonedVoices, setClonedVoices] = useState<ClonedVoiceProfile[]>(() => {
    try {
      const saved = localStorage.getItem('resona_cloned_voices');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
    const sample = REFERENCE_SAMPLE_VOICES[0];
    if (sample.preAnalyzedProfile) {
      return [
        {
          id: 'cloned_sample_eleanor',
          name: sample.preAnalyzedProfile.name || 'Prof. Eleanor Vance',
          gender: sample.preAnalyzedProfile.gender || 'Female',
          ageEstimate: sample.preAnalyzedProfile.ageEstimate || '40s',
          accent: sample.preAnalyzedProfile.accent || 'British RP',
          pitchRegister: sample.preAnalyzedProfile.pitchRegister || 'Mezzo-Soprano',
          fundamentalFreqHz: sample.preAnalyzedProfile.fundamentalFreqHz || 195,
          timbreDescription: sample.preAnalyzedProfile.timbreDescription || '',
          cadence: sample.preAnalyzedProfile.cadence || '',
          timbreScores: sample.preAnalyzedProfile.timbreScores || {
            warmth: 8,
            brightness: 7,
            gravel: 2,
            breathiness: 4,
            resonance: 8,
          },
          bestBaseVoice: sample.preAnalyzedProfile.bestBaseVoice || 'Kore',
          cloningStylePrompt: sample.preAnalyzedProfile.cloningStylePrompt || '',
          summary: sample.preAnalyzedProfile.summary || '',
          transcription: sample.preAnalyzedProfile.transcription || '',
          referenceAudioUrl: '',
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('resona_cloned_voices', JSON.stringify(clonedVoices));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }, [clonedVoices]);

  // Voice Selection State
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Kore');
  const [isClonedVoiceSelected, setIsClonedVoiceSelected] = useState<boolean>(false);
  const [currentClonedProfile, setCurrentClonedProfile] = useState<ClonedVoiceProfile | null>(null);

  // Style Selection State
  const [selectedStylePreset, setSelectedStylePreset] = useState<VoiceStylePreset>(VOICE_STYLE_PRESETS[0]);
  const [customStylePrompt, setCustomStylePrompt] = useState<string>('');
  const [isCustomStyleActive, setIsCustomStyleActive] = useState<boolean>(false);

  // Model Selection: Flash Lite (efficient) vs Flash (Voice Design & bursts)
  const [ttsModel, setTtsModel] = useState<'gemini-3.8-flash-lite-tts' | 'gemini-3.8-flash-tts'>(
    'gemini-3.8-flash-lite-tts'
  );

  // Text Composer State: default to Chinese or English based on outputLanguage
  const [speechText, setSpeechText] = useState<string>(
    '欢迎使用 Resona 智能语音工坊。<breath> 您可以输入任意中文或英文段落，自由选择不同的声音角色与演绎风格，并听到流利自然的发音。|yeah| 还可以进入音色克隆实验室，提取专属人声音色！'
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Switch initial speechText when outputLanguage switches
  const handleSelectOutputLanguage = (lang: OutputLanguage) => {
    setOutputLanguage(lang);
    if (lang === 'zh') {
      setSpeechText(
        '欢迎使用 Resona 智能语音工坊。<breath> 薄雾笼罩着寂静的松林，守灯人擦拭着铜镜，等待着远方归来的旅人。|yeah| 祝您创作愉快！'
      );
      // Auto-suggest Kore for Chinese if not custom
      if (!isClonedVoiceSelected && (selectedVoiceId === 'Puck' || selectedVoiceId === 'Charon')) {
        setSelectedVoiceId('Kore');
      }
    } else if (lang === 'en') {
      setSpeechText(
        'Welcome to Resona Studio. <breath> You can type any sentence, choose distinct voice personas, and hear natural speech synthesized in real time. |yeah| Try switching styles or explore our voice cloning lab!'
      );
      if (!isClonedVoiceSelected && selectedVoiceId === 'Kore') {
        setSelectedVoiceId('Puck');
      }
    }
  };

  // Synthesis Action & Output
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentAudioMetadata, setCurrentAudioMetadata] = useState<{ title: string; subtitle: string }>({
    title: '欢迎试听语音 (Welcome Speech)',
    subtitle: 'Kore · 🇨🇳 中文普通话 · 自然交谈',
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
      localStorage.setItem('resona_generation_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }, [history]);

  const handleSelectPrebuiltVoice = (voiceId: PrebuiltVoiceName) => {
    setSelectedVoiceId(voiceId);
    setIsClonedVoiceSelected(false);
    setCurrentClonedProfile(null);
  };

  const handleSelectClonedVoice = (clonedVoice: ClonedVoiceProfile) => {
    setSelectedVoiceId(clonedVoice.id);
    setIsClonedVoiceSelected(true);
    setCurrentClonedProfile(clonedVoice);
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

    setIsGenerating(true);
    setGenerationError(null);

    try {
      let finalAudioUrl = '';
      let durationSec = 0;
      let voiceDisplay = '';
      let styleDisplay = '';

      if (isClonedVoiceSelected && currentClonedProfile) {
        voiceDisplay = currentClonedProfile.name;
        styleDisplay = `Cloned Timbre (${currentClonedProfile.bestBaseVoice})`;

        const res = await fetch('/api/clone/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: speechText,
            clonedProfile: currentClonedProfile,
            outputLanguage,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to synthesize speech in cloned voice.');
        }

        let audioUrl = data.audioUrl;
        if (currentClonedProfile.dspConfig && isDspActive(currentClonedProfile.dspConfig)) {
          try {
            audioUrl = await processAudioWithDsp(audioUrl, currentClonedProfile.dspConfig);
          } catch (dspErr) {
            console.warn('DSP processing skipped, using synthesized audio directly:', dspErr);
          }
        }

        finalAudioUrl = audioUrl;
        durationSec = data.durationSec || 0;
      } else {
        const effectiveStylePrompt = isCustomStyleActive
          ? customStylePrompt
          : selectedStylePreset.stylePrompt;

        voiceDisplay = selectedVoiceId;
        styleDisplay = isCustomStyleActive
          ? (uiLang === 'zh' ? '自定义风格' : 'Custom Style')
          : (uiLang === 'zh' ? selectedStylePreset.nameZh : selectedStylePreset.name);

        const res = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: speechText,
            voiceName: selectedVoiceId,
            stylePrompt: effectiveStylePrompt,
            outputLanguage,
            model: ttsModel,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate speech.');
        }

        finalAudioUrl = data.audioUrl;
        durationSec = data.durationSec || 0;
      }

      const langLabel = outputLanguage === 'zh' ? '🇨🇳 中文普通话' : outputLanguage === 'en' ? '🇺🇸 英语' : '自动语言';

      setCurrentAudioUrl(finalAudioUrl);
      setCurrentAudioMetadata({
        title: `${voiceDisplay} · ${isClonedVoiceSelected ? (uiLang === 'zh' ? '克隆音色' : 'Cloned Voice') : styleDisplay}`,
        subtitle: `${langLabel} · ~${durationSec}s · ${speechText.length} ${t.charsLabel}`,
      });

      const newRecord: SpeechGenerationRecord = {
        id: `rec_${Date.now()}`,
        text: speechText,
        audioUrl: finalAudioUrl,
        durationSec,
        voiceName: voiceDisplay,
        isClonedVoice: isClonedVoiceSelected,
        clonedVoiceId: currentClonedProfile?.id,
        baseVoice: isClonedVoiceSelected ? currentClonedProfile?.bestBaseVoice : selectedVoiceId,
        outputLanguage,
        stylePrompt: isClonedVoiceSelected ? 'Cloned Voice' : (isCustomStyleActive ? 'Custom' : selectedStylePreset.name),
        model: isClonedVoiceSelected ? 'gemini-3.8-flash-tts' : ttsModel,
        createdAt: new Date().toISOString(),
      };

      setHistory((prev) => [newRecord, ...prev.slice(0, 49)]);
    } catch (err: any) {
      console.error('TTS Generation error:', err);
      setGenerationError(err.message || 'Failed to synthesize speech.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveClonedVoice = (newProfile: ClonedVoiceProfile) => {
    setClonedVoices((prev) => {
      const filtered = prev.filter((p) => p.id !== newProfile.id);
      return [newProfile, ...filtered];
    });
  };

  const handleUseClonedVoiceInStudio = (voice: ClonedVoiceProfile) => {
    handleSelectClonedVoice(voice);
    setActiveTab('studio');
  };

  const handleDeleteClonedVoice = (voiceId: string) => {
    setClonedVoices((prev) => prev.filter((v) => v.id !== voiceId));
    if (selectedVoiceId === voiceId) {
      handleSelectPrebuiltVoice('Kore');
    }
  };

  const relevantSampleScripts = SAMPLE_SCRIPTS.filter((s) => {
    if (outputLanguage === 'zh') return s.language === 'zh';
    if (outputLanguage === 'en') return s.language === 'en';
    return true;
  });

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors selection:bg-indigo-500/30 selection:text-indigo-700 dark:selection:text-indigo-200`}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        clonedCount={clonedVoices.length}
        historyCount={history.length}
        uiLang={uiLang}
        onToggleUiLang={toggleUiLang}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 1: Standard TTS Studio */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Editor & Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Output Language Selector Bar */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      {t.outputLangLabel}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {uiLang === 'zh' ? '(指定发音口音与音调)' : '(Pronunciation & Cadence)'}
                    </span>
                  </div>

                  {/* Language Buttons */}
                  <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSelectOutputLanguage('zh')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                        outputLanguage === 'zh'
                          ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 font-bold shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span>🇨🇳</span>
                      <span>{uiLang === 'zh' ? '中文普通话' : 'Chinese'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectOutputLanguage('en')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                        outputLanguage === 'en'
                          ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span>🇺🇸</span>
                      <span>{uiLang === 'zh' ? '英语' : 'English'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectOutputLanguage('auto')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-all ${
                        outputLanguage === 'auto'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                      }`}
                    >
                      <span>{t.outputLangAuto}</span>
                    </button>
                  </div>
                </div>

                {/* Helpful tip about voice suitability for selected language */}
                <div className="text-xs flex items-center justify-between text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span>
                      {outputLanguage === 'zh'
                        ? '🇨🇳 中文输出模式：已自动加载中文声调韵律，首推 Kore (温润清晰) 或 Zephyr (知性干练)'
                        : outputLanguage === 'en'
                        ? '🇺🇸 English Mode: Native English stress rhythm, Puck (Energetic) & Charon (Gravelly) recommended'
                        : '🌐 自动多语言模式：支持中英混合朗读'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Text Composer Card */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t.inputScriptLabel}
                    </span>
                    {isClonedVoiceSelected && currentClonedProfile && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-mono flex items-center gap-1">
                        <Dna className="w-3 h-3" />
                        {t.speakingWithCloned} {currentClonedProfile.name}
                      </span>
                    )}
                  </div>

                  {/* Sample Scripts Selector */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-zinc-500 hidden sm:inline">{t.presetsLabel}</span>
                    {relevantSampleScripts.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleLoadSampleScript(s)}
                        className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                        title={uiLang === 'zh' ? s.titleZh : s.title}
                      >
                        {uiLang === 'zh' ? s.titleZh : s.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Textarea */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={speechText}
                    onChange={(e) => setSpeechText(e.target.value)}
                    rows={6}
                    placeholder={t.textareaPlaceholder}
                    className="w-full bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-300 dark:border-zinc-700/80 rounded-lg p-4 text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed resize-y"
                  />
                </div>

                {/* Expressive Bursts Toolbar */}
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>{t.vocalBurstsLabel}</span>
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {speechText.length} {t.charsLabel} · ~{Math.max(1, Math.round(speechText.split(/\s+/).length / 2.5))}s
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {VOCAL_BURSTS.map((burst) => (
                      <button
                        key={burst.tag}
                        type="button"
                        onClick={() => handleInsertVocalBurst(burst.tag)}
                        className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 transition-all active:scale-95"
                        title={burst.desc}
                      >
                        {burst.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Synthesize Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateSpeech}
                    disabled={isGenerating || !speechText.trim()}
                    className="w-full py-3.5 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t.synthesizingState}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 fill-current" />
                        <span>
                          {uiLang === 'zh'
                            ? `朗读并输出语音 (${isClonedVoiceSelected && currentClonedProfile ? currentClonedProfile.name : selectedVoiceId} · ${outputLanguage === 'zh' ? '🇨🇳 中文' : outputLanguage === 'en' ? '🇺🇸 英语' : '多语言'})`
                            : `Synthesize Speech (${isClonedVoiceSelected && currentClonedProfile ? currentClonedProfile.name : selectedVoiceId} · ${outputLanguage === 'zh' ? 'Chinese' : 'English'})`}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {generationError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{generationError}</span>
                  </div>
                )}
              </div>

              {/* Master Output Audio Player */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  {t.outputStationLabel}
                </span>
                <AudioPlayerBar
                  audioUrl={currentAudioUrl}
                  title={currentAudioMetadata.title}
                  subtitle={currentAudioMetadata.subtitle}
                  outputLanguage={outputLanguage}
                  uiLang={uiLang}
                  autoPlay={true}
                />
              </div>
            </div>

            {/* Right Column: Voice Personas, Styles & Engine Settings (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Voice Selection Box */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm">
                <VoiceSelector
                  selectedVoiceId={selectedVoiceId}
                  isClonedVoiceSelected={isClonedVoiceSelected}
                  clonedVoices={clonedVoices}
                  onSelectPrebuiltVoice={handleSelectPrebuiltVoice}
                  onSelectClonedVoice={handleSelectClonedVoice}
                  uiLang={uiLang}
                  outputLanguage={outputLanguage}
                />
              </div>

              {/* Delivery Style & Tone Selector */}
              {!isClonedVoiceSelected && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm">
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
                </div>
              )}

              {/* Synthesis Engine Settings */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{t.neuralTierLabel}</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    24000 Hz Lossless WAV
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTtsModel('gemini-3.8-flash-lite-tts')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
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
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      ttsModel === 'gemini-3.8-flash-tts'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-semibold text-zinc-900 dark:text-zinc-200">{t.flashName}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{t.flashDesc}</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Voice Cloning Lab */}
        {activeTab === 'cloning' && (
          <VoiceCloningLab
            clonedVoices={clonedVoices}
            onSaveClonedVoice={handleSaveClonedVoice}
            onSelectForStudio={handleUseClonedVoiceInStudio}
            uiLang={uiLang}
          />
        )}

        {/* Tab 3: Cloned Voice Library */}
        {activeTab === 'library' && (
          <ClonedVoicesLibrary
            clonedVoices={clonedVoices}
            onSelectVoice={handleUseClonedVoiceInStudio}
            onDeleteVoice={handleDeleteClonedVoice}
            onGoToCloningLab={() => setActiveTab('cloning')}
            uiLang={uiLang}
          />
        )}

        {/* Tab 4: History Drawer */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto">
            <HistoryDrawer
              history={history}
              currentPlayingUrl={currentAudioUrl}
              onPlayItem={(item) => {
                setCurrentAudioUrl(item.audioUrl);
                setCurrentAudioMetadata({
                  title: `${item.voiceName} · ${item.stylePrompt}`,
                  subtitle: `${item.outputLanguage === 'zh' ? '🇨🇳 中文' : item.outputLanguage === 'en' ? '🇺🇸 英语' : 'Auto'} · ${new Date(item.createdAt).toLocaleTimeString()}`,
                });
                setActiveTab('studio');
              }}
              onLoadTextToEditor={(text) => {
                setSpeechText(text);
                setActiveTab('studio');
              }}
              onClearHistory={() => setHistory([])}
              uiLang={uiLang}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 py-6 text-center text-xs text-zinc-500 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-400">Resona Audio Studio</span>
            <span>·</span>
            <span>{uiLang === 'zh' ? '基于 Gemini 神经网络语音与声学分析' : 'Powered by Gemini Multimodal & Neural Speech Synthesis'}</span>
          </div>
          <div>
            <span>16-bit 24kHz Lossless Audio Streaming</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
