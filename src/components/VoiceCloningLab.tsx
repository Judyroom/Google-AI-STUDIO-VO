import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Mic,
  Square,
  Sparkles,
  Dna,
  ArrowRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
  BookmarkCheck,
  Headphones,
  Edit2,
  UserCheck,
  Play,
  RotateCcw,
  Info,
  Layers,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import {
  ClonedVoiceProfile,
  ReferenceVoiceSample,
  UILanguage,
  OutputLanguage,
  PrebuiltVoiceName,
} from '../types';
import { REFERENCE_SAMPLE_VOICES } from '../constants/voices';
import { I18N } from '../constants/i18n';
import {
  blobToBase64,
  createSyntheticSampleWav,
  formatTime,
  detectAudioPitchAndGender,
  DetectedAudioAcoustics,
} from '../utils/audio';
import {
  DspTuningConfig,
  DEFAULT_DSP_CONFIG,
  processAudioWithDsp,
  isDspActive,
} from '../utils/audioDsp';

interface VoiceCloningLabProps {
  clonedVoices: ClonedVoiceProfile[];
  onSaveClonedVoice: (voice: ClonedVoiceProfile) => void;
  onSelectForStudio: (voice: ClonedVoiceProfile) => void;
  uiLang: UILanguage;
}

export const VoiceCloningLab: React.FC<VoiceCloningLabProps> = ({
  clonedVoices,
  onSaveClonedVoice,
  onSelectForStudio,
  uiLang,
}) => {
  const t = I18N[uiLang];

  // Input source tabs: 'upload' | 'record' | 'samples'
  const [inputTab, setInputTab] = useState<'upload' | 'record' | 'samples'>('upload');

  // Audio input state
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string | null>(null);
  const [referenceAudioBase64, setReferenceAudioBase64] = useState<string | null>(null);
  const [referenceMimeType, setReferenceMimeType] = useState<string>('audio/wav');
  const [sampleFileName, setSampleFileName] = useState<string>('');

  // Speaker gender selection hint for precise recognition
  const [genderHint, setGenderHint] = useState<'Auto' | 'Female' | 'Male'>('Auto');

  // Acoustic pitch detection state directly measured via Web Audio API autocorrelation
  const [detectedAcoustics, setDetectedAcoustics] = useState<DetectedAudioAcoustics | null>(null);
  const [isDetectingPitch, setIsDetectingPitch] = useState<boolean>(false);

  // Cloned Comparison Preview Audio (for immediate A/B preview against source reference)
  const [clonedPreviewAudioUrl, setClonedPreviewAudioUrl] = useState<string | null>(null);
  const [isComparisonPreviewGenerating, setIsComparisonPreviewGenerating] = useState<boolean>(false);

  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<ClonedVoiceProfile | null>(null);
  const [customVoiceName, setCustomVoiceName] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  // Chosen base neural model (allows switching between Kore and Zephyr for females, Fenrir/Puck/Charon for males)
  const [chosenBaseVoice, setChosenBaseVoice] = useState<PrebuiltVoiceName>('Kore');

  // Real-time DSP Timbre Sculpting configuration
  const [dspTuning, setDspTuning] = useState<DspTuningConfig>({ ...DEFAULT_DSP_CONFIG });

  // Cloned TTS language & test text
  const [clonedOutputLang, setClonedOutputLang] = useState<OutputLanguage>(uiLang === 'zh' ? 'zh' : 'en');
  const [testText, setTestText] = useState<string>(
    uiLang === 'zh'
      ? '你好！这是通过声学解构与实时 DSP 音色塑形生成的个性化朗读演示。音高、温暖度与共鸣均已深度定制。'
      : 'Hello! This is a personalized text-to-speech demonstration synthesized with acoustic modeling and real-time DSP timbre sculpting.'
  );

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizeError, setSynthesizeError] = useState<string | null>(null);

  // Output audio state: stores both raw base audio and DSP-processed audio for instant A/B comparison
  const [rawOutputAudioUrl, setRawOutputAudioUrl] = useState<string | null>(null);
  const [dspOutputAudioUrl, setDspOutputAudioUrl] = useState<string | null>(null);
  const [activePlayMode, setActivePlayMode] = useState<'dsp' | 'raw'>('dsp');
  const [clonedOutputDuration, setClonedOutputDuration] = useState<number>(0);

  // Audio player reference for reference sample
  const refAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const [isRefPlaying, setIsRefPlaying] = useState(false);

  // Sync testText when language changes
  useEffect(() => {
    if (uiLang === 'zh') {
      setClonedOutputLang('zh');
      setTestText(
        '你好！这是通过声学解构与实时 DSP 音色塑形生成的个性化朗读演示。音高、温暖度与共鸣均已深度定制。'
      );
    } else {
      setClonedOutputLang('en');
      setTestText(
        'Hello! This is a personalized text-to-speech demonstration synthesized with acoustic modeling and real-time DSP timbre sculpting.'
      );
    }
  }, [uiLang]);

  // Sync customVoiceName & DSP when activeProfile changes
  useEffect(() => {
    if (activeProfile) {
      setCustomVoiceName(activeProfile.name);
      setChosenBaseVoice(activeProfile.bestBaseVoice);
      if (activeProfile.dspConfig) {
        setDspTuning({ ...activeProfile.dspConfig });
      } else if (activeProfile.recommendedTuning) {
        setDspTuning({
          pitchSemitones: activeProfile.recommendedTuning.pitchShiftSemitones || 0,
          speedMultiplier: activeProfile.recommendedTuning.speedMultiplier || 1.0,
          bassWarmthDb: activeProfile.recommendedTuning.eqBassBoostDb || 0,
          midPresenceDb: 0,
          trebleAirDb: activeProfile.recommendedTuning.eqTrebleBoostDb || 0,
        });
      }
    }
  }, [activeProfile?.id]);

  // Cleanup recording timer
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Synthesize speech in cloned voice and apply real-time Web Audio DSP engine
  const handleSynthesizeCloned = async (
    textToUse?: string,
    langToUse?: OutputLanguage,
    baseVoiceToUse?: PrebuiltVoiceName,
    profileToUse?: ClonedVoiceProfile | null
  ) => {
    const prof = profileToUse || activeProfile;
    if (!prof) {
      alert(uiLang === 'zh' ? '请先完成声音分析再进行朗读。' : 'Please analyze a voice first.');
      return;
    }

    const targetLang = langToUse || clonedOutputLang;
    let targetText = (textToUse !== undefined ? textToUse : testText).trim();
    if (!targetText) {
      targetText = targetLang === 'en'
        ? 'Hello! This is a personalized text-to-speech demonstration synthesized with acoustic modeling and real-time DSP timbre sculpting.'
        : '你好！这是通过声学解构与实时 DSP 音色塑形生成的个性化朗读演示。音高、温暖度与共鸣均已深度定制。';
      setTestText(targetText);
    }

    const targetBase = baseVoiceToUse || chosenBaseVoice;

    setIsSynthesizing(true);
    setIsComparisonPreviewGenerating(true);
    setSynthesizeError(null);

    try {
      const response = await fetch('/api/clone/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: targetText,
          clonedProfile: {
            ...prof,
            name: customVoiceName.trim() || prof.name,
            bestBaseVoice: targetBase,
          },
          outputLanguage: targetLang,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize cloned speech.');
      }

      const rawUrl = data.audioUrl;
      setRawOutputAudioUrl(rawUrl);
      setClonedOutputDuration(data.durationSec || 0);

      // Apply real DSP processing pipeline: pitch-shift, 3-band EQ, compressor
      let finalDspUrl = rawUrl;
      if (isDspActive(dspTuning)) {
        try {
          finalDspUrl = await processAudioWithDsp(rawUrl, dspTuning);
        } catch (dspErr) {
          console.warn('DSP processing fallback:', dspErr);
        }
      }

      setDspOutputAudioUrl(finalDspUrl);
      setClonedPreviewAudioUrl(finalDspUrl);
      setActivePlayMode('dsp');
    } catch (err: any) {
      console.error('Synthesize error:', err);
      setSynthesizeError(err.message || 'Error synthesizing speech in cloned voice.');
    } finally {
      setIsSynthesizing(false);
      setIsComparisonPreviewGenerating(false);
    }
  };

  const generateComparisonPreview = async (
    baseVoiceToUse: PrebuiltVoiceName,
    profileToUse?: ClonedVoiceProfile | null,
    langToUse?: OutputLanguage,
    textToUse?: string
  ) => {
    const prof = profileToUse || activeProfile;
    if (!prof) return;

    const lang = langToUse || clonedOutputLang;
    const defaultText = lang === 'en'
      ? 'Hello! This is a preview of your personalized cloned voice, synthesized with acoustic modeling and neural voice design.'
      : '您好，这是依据您提供的参考音频解构并克隆出的音色效果预览。';
    const text = textToUse || testText || defaultText;

    await handleSynthesizeCloned(text, lang, baseVoiceToUse, prof);
  };

  const handleSwitchLanguage = (newLang: OutputLanguage) => {
    setClonedOutputLang(newLang);
    const newText = newLang === 'en'
      ? 'Hello! This is a personalized text-to-speech demonstration synthesized with acoustic modeling and real-time DSP timbre sculpting.'
      : '你好！这是通过声学解构与实时 DSP 音色塑形生成的个性化朗读演示。音高、温暖度与共鸣均已深度定制。';
    setTestText(newText);
    if (activeProfile) {
      handleSynthesizeCloned(newText, newLang, chosenBaseVoice, activeProfile);
    }
  };

  const handleSelectBaseVoice = (newBase: PrebuiltVoiceName) => {
    setChosenBaseVoice(newBase);
    setIsSaved(false);
    if (activeProfile) {
      const updated = { ...activeProfile, bestBaseVoice: newBase };
      setActiveProfile(updated);
      handleSynthesizeCloned(testText, clonedOutputLang, newBase, updated);
    }
  };

  const loadReferenceSample = async (sample: ReferenceVoiceSample) => {
    const isFemale = sample.gender === 'Female' || sample.preAnalyzedProfile?.gender === 'Female';
    setGenderHint(isFemale ? 'Female' : 'Male');
    setDetectedAcoustics({
      fundamentalFreqHz: sample.preAnalyzedProfile?.fundamentalFreqHz || (isFemale ? 215 : 120),
      gender: isFemale ? 'Female' : 'Male',
      confidence: 0.95,
    });

    const sampleWavUrl = createSyntheticSampleWav(
      3.8,
      sample.preAnalyzedProfile?.fundamentalFreqHz || (isFemale ? 210 : 125),
      isFemale ? [1, 0.7, 0.4, 0.3, 0.15] : [1, 0.9, 0.6, 0.4, 0.2]
    );

    setReferenceAudioUrl(sampleWavUrl);
    setSampleFileName(`${sample.name}.wav`);
    setReferenceMimeType('audio/wav');

    const res = await fetch(sampleWavUrl);
    const blob = await res.blob();
    const base64WithHeader = await blobToBase64(blob);
    setReferenceAudioBase64(base64WithHeader.replace(/^data:[^;]+;base64,/, ''));

    if (sample.preAnalyzedProfile) {
      const isFem = isFemale;
      const initialBaseVoice = isFem ? 'Kore' : 'Fenrir';
      const initialDsp: DspTuningConfig = {
        pitchSemitones: isFem ? 2 : -2,
        speedMultiplier: 1.0,
        bassWarmthDb: isFem ? 1.5 : 3.0,
        midPresenceDb: 1.0,
        trebleAirDb: isFem ? 2.5 : 0.5,
      };

      const fullProfile: ClonedVoiceProfile = {
        id: `cloned_${sample.id}_${Date.now()}`,
        name: sample.preAnalyzedProfile.name || sample.name,
        gender: isFem ? 'Female' : 'Male',
        ageEstimate: sample.preAnalyzedProfile.ageEstimate || '20s-30s',
        accent: sample.preAnalyzedProfile.accent || 'Neutral',
        pitchRegister: sample.preAnalyzedProfile.pitchRegister || (isFem ? 'Mezzo-Soprano' : 'Baritone'),
        fundamentalFreqHz: sample.preAnalyzedProfile.fundamentalFreqHz || (isFem ? 210 : 120),
        timbreDescription: sample.preAnalyzedProfile.timbreDescription || '',
        cadence: sample.preAnalyzedProfile.cadence || '',
        timbreScores: sample.preAnalyzedProfile.timbreScores || {
          warmth: 8,
          brightness: isFem ? 8 : 6,
          gravel: isFem ? 1 : 4,
          breathiness: 4,
          resonance: 8,
        },
        bestBaseVoice: initialBaseVoice,
        cloningStylePrompt: sample.preAnalyzedProfile.cloningStylePrompt || (isFem
          ? 'Speaking in a warm, melodious female voice with gentle chest warmth and crisp feminine diction.'
          : 'Speaking in a deep, resonant male voice with commanding presence and smoky warmth.'),
        summary: sample.preAnalyzedProfile.summary || '',
        transcription: sample.preAnalyzedProfile.transcription || '',
        referenceAudioUrl: sampleWavUrl,
        dspConfig: initialDsp,
        createdAt: new Date().toISOString(),
      };
      setActiveProfile(fullProfile);
      setCustomVoiceName(fullProfile.name);
      setChosenBaseVoice(initialBaseVoice);
      setDspTuning(initialDsp);
      setIsSaved(false);
      setRawOutputAudioUrl(null);
      setDspOutputAudioUrl(null);
      setClonedPreviewAudioUrl(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSampleFileName(file.name);
    setReferenceMimeType(file.type || 'audio/wav');

    const audioUrl = URL.createObjectURL(file);
    setReferenceAudioUrl(audioUrl);

    // Instant client-side acoustic pitch detection via Web Audio API autocorrelation
    setIsDetectingPitch(true);
    detectAudioPitchAndGender(file).then((acoustics) => {
      setDetectedAcoustics(acoustics);
      setGenderHint(acoustics.gender);
      setIsDetectingPitch(false);
    });

    const base64 = await blobToBase64(file);
    setReferenceAudioBase64(base64.replace(/^data:[^;]+;base64,/, ''));
    setActiveProfile(null);
    setRawOutputAudioUrl(null);
    setDspOutputAudioUrl(null);
    setClonedPreviewAudioUrl(null);
    setIsSaved(false);
    setAnalysisError(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setReferenceAudioUrl(audioUrl);
        setSampleFileName(`录音样本_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`);
        setReferenceMimeType('audio/webm');

        // Instant client-side acoustic pitch detection
        setIsDetectingPitch(true);
        detectAudioPitchAndGender(audioBlob).then((acoustics) => {
          setDetectedAcoustics(acoustics);
          setGenderHint(acoustics.gender);
          setIsDetectingPitch(false);
        });

        const base64 = await blobToBase64(audioBlob);
        setReferenceAudioBase64(base64.replace(/^data:[^;]+;base64,/, ''));
        setActiveProfile(null);
        setRawOutputAudioUrl(null);
        setDspOutputAudioUrl(null);
        setClonedPreviewAudioUrl(null);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      alert(uiLang === 'zh' ? '无法访问麦克风，请在浏览器中允许麦克风权限。' : 'Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleToggleRefAudioPlay = () => {
    if (!refAudioElementRef.current && referenceAudioUrl) {
      refAudioElementRef.current = new Audio(referenceAudioUrl);
      refAudioElementRef.current.onended = () => setIsRefPlaying(false);
    }

    if (refAudioElementRef.current) {
      if (isRefPlaying) {
        refAudioElementRef.current.pause();
        setIsRefPlaying(false);
      } else {
        refAudioElementRef.current.currentTime = 0;
        refAudioElementRef.current.play().then(() => setIsRefPlaying(true)).catch(console.error);
      }
    }
  };

  const handleAnalyzeVoice = async () => {
    if (!referenceAudioBase64) {
      alert(uiLang === 'zh' ? '请先上传、录制或选择一个参考人声音频。' : 'Please provide reference audio first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/clone/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: referenceAudioBase64,
          mimeType: referenceMimeType,
          sampleName: sampleFileName ? sampleFileName.replace(/\.[^/.]+$/, '') : '',
          genderHint: genderHint,
          detectedGender: detectedAcoustics?.gender || (genderHint !== 'Auto' ? genderHint : 'Female'),
          detectedPitch: detectedAcoustics?.fundamentalFreqHz || (genderHint === 'Male' ? 120 : 215),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze voice timbre.');
      }

      const analyzedProfile: ClonedVoiceProfile = {
        ...data.profile,
        referenceAudioUrl: referenceAudioUrl || data.profile.referenceAudioUrl,
      };

      const defaultName = analyzedProfile.name || (
        analyzedProfile.gender === 'Female' ? '我的定制女声' : '我的定制男声'
      );

      analyzedProfile.name = defaultName;
      setActiveProfile(analyzedProfile);
      setCustomVoiceName(defaultName);
      setChosenBaseVoice(analyzedProfile.bestBaseVoice);

      if (analyzedProfile.dspConfig) {
        setDspTuning({ ...analyzedProfile.dspConfig });
      }
      setIsSaved(false);
      setRawOutputAudioUrl(null);
      setDspOutputAudioUrl(null);

      // Auto-generate the side-by-side comparison preview immediately!
      generateComparisonPreview(analyzedProfile.bestBaseVoice, analyzedProfile);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisError(err.message || 'Error analyzing voice timbre.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // User manually confirms or corrects gender (Female vs Male)
  const handleUpdateVoiceGender = (newGender: 'Female' | 'Male') => {
    if (!activeProfile) return;
    const isFemale = newGender === 'Female';
    const newBase = isFemale ? 'Kore' : 'Fenrir';
    const updated: ClonedVoiceProfile = {
      ...activeProfile,
      gender: newGender,
      bestBaseVoice: newBase,
      pitchRegister: isFemale ? 'Mezzo-Soprano' : 'Baritone',
      fundamentalFreqHz: isFemale ? 215 : 120,
      cloningStylePrompt: isFemale
        ? `Speaking in a clear, natural, and melodious female voice timbre with smooth feminine inflection and warm chest harmonics.`
        : `Speaking in an authentic, resonant, and confident male voice timbre with deep chest presence.`,
    };
    setActiveProfile(updated);
    setChosenBaseVoice(newBase);
    setIsSaved(false);
    generateComparisonPreview(newBase, updated);
  };

  // Reset DSP settings to AI recommendations
  const handleResetDspToAiRecommendation = () => {
    if (activeProfile?.dspConfig) {
      setDspTuning({ ...activeProfile.dspConfig });
    } else {
      setDspTuning({ ...DEFAULT_DSP_CONFIG });
    }
  };

  // Save cloned voice to library with user's customized name, base voice and DSP tuning
  const handleSaveCustomClonedVoice = () => {
    if (!activeProfile) return;
    const updated: ClonedVoiceProfile = {
      ...activeProfile,
      name: customVoiceName.trim() || activeProfile.name,
      bestBaseVoice: chosenBaseVoice,
      dspConfig: { ...dspTuning },
    };
    setActiveProfile(updated);
    onSaveClonedVoice(updated);
    setIsSaved(true);
  };

  // Re-apply DSP when tuning sliders change on existing synthesized audio
  const handleReapplyDsp = async () => {
    if (!rawOutputAudioUrl) return;
    setIsSynthesizing(true);
    try {
      const newDspUrl = await processAudioWithDsp(rawOutputAudioUrl, dspTuning);
      setDspOutputAudioUrl(newDspUrl);
      setActivePlayMode('dsp');
    } catch (err: any) {
      console.error('DSP re-apply error:', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const isFemale = activeProfile?.gender === 'Female' || genderHint === 'Female';

  return (
    <div className="space-y-8">
      {/* Introduction Banner with Technical Architecture Transparency */}
      <div className="border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/50 dark:from-indigo-950/40 dark:via-zinc-950/60 dark:to-violet-950/30 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Dna className="w-4 h-4" />
              <span>{t.cloningEngineTitle}</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {uiLang === 'zh' ? 'AI 声音设计与音色定制工坊' : 'AI Voice Design & Timbre Sculpting Studio'}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              {t.cloningEngineDesc}
            </p>
          </div>
        </div>

        {/* Honest Technical Reality & Innovation Notice */}
        <div className="p-3 rounded-lg bg-indigo-100/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">
              {uiLang === 'zh' ? '💡 技术原理与独创声学重塑说明：' : '💡 Architecture & Voice Sculpting Notice:'}
            </span>
            <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
              {uiLang === 'zh'
                ? 'Gemini 官方 TTS 底层提供 5 种官方神经网络底模（女声 Kore/Zephyr，男声 Fenrir/Puck/Charon），官方尚未开放直接克隆声带生理声纹的接口。为了打破单一原始 Kore 底模的单调感，本系统深度整合「声学特征解构 + 多底模自由切换 + Web Audio DSP 实时调音台（变调 ±8 半音、胸腔/头腔共鸣 EQ、语速变速）」，让您调教出真正区别于原底模的独特声音！'
                : 'Google Gemini TTS provides 5 prebuilt neural voice foundations. To break free from default timbre monotony, our platform combines Neural Timbre Extraction with base voice switching (Kore/Zephyr/Puck/Charon/Fenrir) and a real-time Web Audio DSP pipeline (pitch shift, 3-band formant EQ, tempo sculpting).'}
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Input Reference Audio */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
              {t.step1Title}
            </span>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {uiLang === 'zh' ? '上传、录制或选择人声音频样本' : 'Provide Reference Audio Sample'}
            </h3>
          </div>

          {/* Input Method Switcher */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setInputTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                inputTab === 'upload'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.tabUploadAudio}</span>
            </button>
            <button
              type="button"
              onClick={() => setInputTab('record')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                inputTab === 'record'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{t.tabRecordMic}</span>
            </button>
            <button
              type="button"
              onClick={() => setInputTab('samples')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                inputTab === 'samples'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.tabPresetVoices}</span>
            </button>
          </div>
        </div>

        {/* Automatic Acoustic Gender & Pitch Calibration Status */}
        <div className="bg-gradient-to-r from-indigo-50/90 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/20 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${genderHint === 'Female' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600' : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600'}`}>
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {uiLang === 'zh' ? '声学校准与底模自动匹配：' : 'Acoustic Calibration & Base Voice Mapping:'}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  genderHint === 'Female'
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                }`}>
                  {genderHint === 'Female' ? '👩 女声 (自动锁定 Kore/Zephyr 底模)' : '👨 男声 (自动锁定 Fenrir 底模)'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                {isDetectingPitch
                  ? (uiLang === 'zh' ? '正在通过 Web Audio 实时检测音频声带基频...' : 'Detecting pitch...')
                  : detectedAcoustics
                  ? (uiLang === 'zh'
                      ? `已通过 Web Audio 实测声带基频：${detectedAcoustics.fundamentalFreqHz} Hz（自动判定：${detectedAcoustics.gender === 'Female' ? '女声' : '男声'}，已自动绑定对应底模）`
                      : `Acoustic fundamental pitch: ${detectedAcoustics.fundamentalFreqHz} Hz (${detectedAcoustics.gender})`)
                  : (uiLang === 'zh' ? '系统将在载入音频后自动识别性别与声带基频，无需手动选择' : 'Automatically calibrated upon loading audio')}
              </p>
            </div>
          </div>

          {/* Quick toggle in case user wants to manually switch */}
          <div className="flex items-center gap-1 p-1 bg-white/90 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setGenderHint('Female')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                genderHint === 'Female'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <span>👩 女声</span>
            </button>
            <button
              type="button"
              onClick={() => setGenderHint('Male')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                genderHint === 'Male'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <span>👨 男声</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Upload File */}
        {inputTab === 'upload' && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group">
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.aac"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {t.dragUploadTitle}
              </span>
              <span className="text-xs text-zinc-500 mt-1">
                {t.dragUploadSubtitle}
              </span>
            </label>
          </div>
        )}

        {/* Tab 2: Record Microphone */}
        {inputTab === 'record' && (
          <div className="p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 flex flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t.recordTitle}
              </h4>
              <p className="text-xs text-zinc-500 max-w-md mt-1">
                {t.recordSubtitle}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm shadow-md shadow-rose-600/30 transition-all active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  <span>{t.startRecordBtn}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-rose-500 text-rose-300 font-medium text-sm transition-all animate-pulse"
                >
                  <Square className="w-4 h-4 fill-rose-500 text-rose-500" />
                  <span>{t.stopRecordBtn} ({formatTime(recordingSeconds)})</span>
                </button>
              )}
            </div>

            {isRecording && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-mono animate-pulse">
                {t.recordingInProgress}
              </p>
            )}
          </div>
        )}

        {/* Tab 3: Official Preset Samples */}
        {inputTab === 'samples' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              {t.presetAudioPrompt}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REFERENCE_SAMPLE_VOICES.map((sample) => {
                const isSelected = sampleFileName.startsWith(sample.name);
                const isFem = sample.gender === 'Female';

                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => loadReferenceSample(sample)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-950/70 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                      <span>{sample.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isFem ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {sample.gender}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                      {sample.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Reference Audio Preview & Start Recognition Action */}
        {referenceAudioUrl && (
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleRefAudioPlay}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isRefPlaying
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300'
                  }`}
                  title={isRefPlaying ? '暂停' : '试听已选音频'}
                >
                  {isRefPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {sampleFileName || '已载入音频样本'}
                    </span>
                    <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">
                      {referenceMimeType}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {uiLang === 'zh' ? '试听参考原声后，点击右侧按钮启动声学特征逆向解构' : 'Audition reference audio, then extract neural acoustic timbre'}
                  </p>
                </div>
              </div>

              {/* Start Extraction Button */}
              <button
                type="button"
                onClick={handleAnalyzeVoice}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all disabled:opacity-60 active:scale-95 shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isAnalyzing
                    ? (uiLang === 'zh' ? '正在解构声学特征...' : 'Deconstructing Timbre...')
                    : (uiLang === 'zh' ? '✨ 开始识别并提取声学特征' : 'Start Acoustic Analysis')}
                </span>
              </button>
            </div>

            {analysisError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Extracted Timbre Profile & Custom Voice Naming & Save Section */}
      {/* Appears IMMEDIATELY AFTER upload & recognition completes! */}
      {activeProfile && (
        <div className="rounded-xl border border-indigo-300 dark:border-indigo-500/40 bg-white dark:bg-zinc-900/70 p-6 space-y-6 shadow-md transition-all animate-fadeIn">
          {/* Top Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{uiLang === 'zh' ? '声学特征提取完成' : 'Analysis Complete'}</span>
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  Base Voice: {chosenBaseVoice}
                </span>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {uiLang === 'zh' ? '自定义音色命名、基础底模与保存' : 'Customize Voice Name, Base Model & Save'}
              </h3>
            </div>

            <div className="text-xs text-zinc-500">
              {uiLang === 'zh' ? '保存后即可在主界面【TTS 工坊】中直接调用此音色' : 'Save to use in TTS Studio directly'}
            </div>
          </div>

          {/* DEDICATED CUSTOM VOICE NAMING & BASE SELECTION & SAVE BAR */}
          <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-500/40 bg-indigo-50/50 dark:bg-zinc-950/90 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Voice Name Input (Col 5) */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t.customVoiceNameLabel} (自定义音色名称)</span>
                </label>
                <input
                  type="text"
                  value={customVoiceName}
                  onChange={(e) => {
                    setCustomVoiceName(e.target.value);
                    setIsSaved(false);
                  }}
                  placeholder={t.customVoiceNamePlaceholder}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Neural Base Model Switcher (Col 4) */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{uiLang === 'zh' ? '基础底模' : 'Base Neural Voice'}</span>
                </label>
                {activeProfile.gender === 'Female' ? (
                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSelectBaseVoice('Kore')}
                      className={`flex-1 py-1.5 rounded-md font-bold transition-all text-center ${
                        chosenBaseVoice === 'Kore'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                      title="温润柔美、治愈舒缓女声底模（默认推荐）"
                    >
                      🌸 Kore (温润柔美)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectBaseVoice('Zephyr')}
                      className={`flex-1 py-1.5 rounded-md font-bold transition-all text-center ${
                        chosenBaseVoice === 'Zephyr'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                      }`}
                      title="清亮现代、明快干练女声底模"
                    >
                      🍃 Zephyr (清亮现代)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSelectBaseVoice('Fenrir')}
                      className={`flex-1 py-1.5 rounded-md font-bold transition-all text-center ${
                        chosenBaseVoice === 'Fenrir'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Fenrir (沉稳厚重)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectBaseVoice('Puck')}
                      className={`flex-1 py-1.5 rounded-md font-bold transition-all text-center ${
                        chosenBaseVoice === 'Puck'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Puck (年轻阳光)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectBaseVoice('Charon')}
                      className={`flex-1 py-1.5 rounded-md font-bold transition-all text-center ${
                        chosenBaseVoice === 'Charon'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Charon (磁性成熟)
                    </button>
                  </div>
                )}
              </div>

              {/* Save Button (Col 3) */}
              <div className="md:col-span-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSaveCustomClonedVoice}
                  disabled={isSaved}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isSaved
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25 active:scale-95'
                  }`}
                >
                  {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Dna className="w-4 h-4" />}
                  <span>{isSaved ? t.savedSuccessMsg : t.saveClonedToLibraryBtn}</span>
                </button>
              </div>
            </div>

            {/* Automatic Gender Status & Studio Link */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">{uiLang === 'zh' ? '声学校准：' : 'Acoustic Calibration:'}</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {activeProfile.gender === 'Female' ? '👩 女声 (已根据参考音频自动匹配，无需手动设置)' : '👨 男声 (已自动匹配)'}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateVoiceGender(activeProfile.gender === 'Female' ? 'Male' : 'Female')}
                  className="text-[11px] text-zinc-400 hover:text-indigo-600 underline ml-1"
                >
                  {uiLang === 'zh' ? '手动切换' : 'Switch'}
                </button>
              </div>

              {isSaved && (
                <button
                  type="button"
                  onClick={() => onSelectForStudio({ ...activeProfile, bestBaseVoice: chosenBaseVoice, dspConfig: dspTuning })}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span>{uiLang === 'zh' ? '👉 立即前往【TTS 工坊】朗读' : 'Go to TTS Studio Now'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Timbre Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-zinc-500">{t.genderRegister}</span>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <span>{activeProfile.pitchRegister || 'Mezzo-Soprano'}</span>
                <span className="text-[11px] text-indigo-500 font-mono">({activeProfile.fundamentalFreqHz || 210} Hz)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-zinc-500">{t.harmonicWarmth}</span>
              <div className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                {activeProfile.timbreScores?.warmth || 8} / 10
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-zinc-500">{t.spectralBrightness}</span>
              <div className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                {activeProfile.timbreScores?.brightness || 7} / 10
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-zinc-500">{uiLang === 'zh' ? '基础声学模型' : 'Base Neural Voice'}</span>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                {chosenBaseVoice} ({activeProfile.gender === 'Female' ? '女声基底' : '男声基底'})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Reading Test & Real-time DSP Timbre Sculpting Console (Placed BEFORE preview) */}
      {activeProfile && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                {uiLang === 'zh' ? '第三步 · 朗读测试与声学塑形' : 'Step 3 · Audition Test & Timbre Sculpting'}
              </span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {uiLang === 'zh' ? `使用【${customVoiceName || activeProfile.name}】进行朗读测试与实时调音` : `Audition & Test ${customVoiceName || activeProfile.name}`}
              </h3>
            </div>

            <button
              type="button"
              onClick={handleResetDspToAiRecommendation}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{uiLang === 'zh' ? '恢复 AI 推荐调音参数' : 'Reset to AI Recommendation'}</span>
            </button>
          </div>

          {/* Test Text Input & Output Language */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {uiLang === 'zh' ? '输入或编辑想要朗读测试的文本：' : 'Enter Test Script:'}
              </label>

              {/* Language Switch: Changes script AND immediately triggers speech synthesis */}
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => handleSwitchLanguage('zh')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                    clonedOutputLang === 'zh'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <span>🇨🇳 中文普通话</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchLanguage('en')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                    clonedOutputLang === 'en'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <span>🇺🇸 English (英文)</span>
                </button>
              </div>
            </div>

            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={3}
              placeholder={uiLang === 'zh' ? '请输入想要朗读测试的中文或英文内容...' : 'Enter text for speech test...'}
              className="w-full bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-300 dark:border-zinc-700/80 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
            />

            {/* Quick Test Scripts */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-[11px] text-zinc-500 font-medium">
                {uiLang === 'zh' ? '💡 快速测试句：' : '💡 Sample Prompts:'}
              </span>
              {clonedOutputLang === 'zh' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const txt = '你好！这是通过声学解构与实时 DSP 音色塑形生成的个性化朗读演示。音高、温暖度与共鸣均已深度定制。';
                      setTestText(txt);
                      handleSynthesizeCloned(txt, 'zh', chosenBaseVoice);
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    🌸 欢迎问候 (中文)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const txt = '夜幕降临，微风吹拂过山谷，璀璨星空在苍穹下闪烁着宁静深邃的光芒。';
                      setTestText(txt);
                      handleSynthesizeCloned(txt, 'zh', chosenBaseVoice);
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    📖 诗意叙事 (中文)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const txt = '人工智能深度学习算法通过分析音高基频与泛音能量分布，精准重构个性化人声音色。';
                      setTestText(txt);
                      handleSynthesizeCloned(txt, 'zh', chosenBaseVoice);
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    🎙️ 科技讲解 (中文)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const txt = 'Hello! This is a personalized text-to-speech demonstration synthesized with acoustic modeling and real-time DSP timbre sculpting.';
                      setTestText(txt);
                      handleSynthesizeCloned(txt, 'en', chosenBaseVoice);
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    🇺🇸 English Greeting
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const txt = 'The evening breeze whispered through the silent valley as distant stars began to sparkle across the twilight sky.';
                      setTestText(txt);
                      handleSynthesizeCloned(txt, 'en', chosenBaseVoice);
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    📖 Story Narration
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const txt = 'By analyzing fundamental frequency and acoustic harmonic formant spectrums, our neural engine sculpts expressive customized speech.';
                      setTestText(txt);
                      handleSynthesizeCloned(txt, 'en', chosenBaseVoice);
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    ⚡ Tech Narration
                  </button>
                </>
              )}
            </div>
          </div>

          {/* REAL-TIME AUDIO DSP TIMBRE SCULPTOR CONSOLE */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-zinc-50 to-indigo-50/30 dark:from-zinc-950 dark:to-indigo-950/20 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span>{uiLang === 'zh' ? '🎛️ Web Audio 实时声学塑形调音台 (打破原底模音色限制)' : 'Web Audio DSP Timbre Sculptor'}</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {isDspActive(dspTuning) ? '● DSP 声学滤镜激活' : '○ 原声模式 (无滤波)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Pitch Shift Semitones */}
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 shadow-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">🎵 音调升降 (Pitch)</span>
                  <span className={`font-mono font-bold ${
                    dspTuning.pitchSemitones > 0 ? 'text-indigo-600 dark:text-indigo-400' : dspTuning.pitchSemitones < 0 ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-500'
                  }`}>
                    {dspTuning.pitchSemitones > 0 ? `+${dspTuning.pitchSemitones} 半音` : `${dspTuning.pitchSemitones} 半音`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="1"
                  value={dspTuning.pitchSemitones}
                  onChange={(e) => {
                    setDspTuning({ ...dspTuning, pitchSemitones: parseInt(e.target.value) });
                    setIsSaved(false);
                  }}
                  className="w-full accent-indigo-600"
                />
                <p className="text-[10px] text-zinc-400 leading-tight">
                  {dspTuning.pitchSemitones > 0 ? '偏清脆/年轻轻快声线' : dspTuning.pitchSemitones < 0 ? '偏深沉/知性御姐声线' : '基准标准音高'}
                </p>
              </div>

              {/* Chest Warmth EQ */}
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 shadow-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">🎚️ 胸腔温暖度 (Warmth)</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {dspTuning.bassWarmthDb > 0 ? `+${dspTuning.bassWarmthDb} dB` : `${dspTuning.bassWarmthDb} dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="0.5"
                  value={dspTuning.bassWarmthDb}
                  onChange={(e) => {
                    setDspTuning({ ...dspTuning, bassWarmthDb: parseFloat(e.target.value) });
                    setIsSaved(false);
                  }}
                  className="w-full accent-indigo-600"
                />
                <p className="text-[10px] text-zinc-400 leading-tight">
                  220Hz 低频谐波加厚，提升亲和力
                </p>
              </div>

              {/* Head Presence & Air EQ */}
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 shadow-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">✨ 头腔空气感 (Air)</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {dspTuning.trebleAirDb > 0 ? `+${dspTuning.trebleAirDb} dB` : `${dspTuning.trebleAirDb} dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="0.5"
                  value={dspTuning.trebleAirDb}
                  onChange={(e) => {
                    setDspTuning({ ...dspTuning, trebleAirDb: parseFloat(e.target.value) });
                    setIsSaved(false);
                  }}
                  className="w-full accent-indigo-600"
                />
                <p className="text-[10px] text-zinc-400 leading-tight">
                  6500Hz 清晰咬字与透气高频
                </p>
              </div>

              {/* Speed Multiplier */}
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 shadow-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">⚡ 语速节奏 (Tempo)</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {dspTuning.speedMultiplier.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={dspTuning.speedMultiplier}
                  onChange={(e) => {
                    setDspTuning({ ...dspTuning, speedMultiplier: parseFloat(e.target.value) });
                    setIsSaved(false);
                  }}
                  className="w-full accent-indigo-600"
                />
                <p className="text-[10px] text-zinc-400 leading-tight">
                  自然发音节奏与语速变速
                </p>
              </div>
            </div>

            {/* Re-apply DSP button if audio already generated */}
            {rawOutputAudioUrl && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleReapplyDsp}
                  disabled={isSynthesizing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
                  <span>{uiLang === 'zh' ? '应用新调音至当前试听音频' : 'Re-apply DSP Tuning to Current Audio'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Synthesize Button */}
          <button
            type="button"
            onClick={() => handleSynthesizeCloned()}
            disabled={isSynthesizing}
            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-md shadow-indigo-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isSynthesizing
                ? (uiLang === 'zh' ? '正在渲染并处理定制音色...' : 'Synthesizing with DSP...')
                : (uiLang === 'zh' ? '🎙️ 立即生成/更新定制朗读效果' : 'Synthesize in Customized Voice')}
            </span>
          </button>

          {synthesizeError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{synthesizeError}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Voice Timbre Preview & Source Comparison Player (Placed AFTER reading test) */}
      {activeProfile && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 dark:from-zinc-900/90 dark:via-zinc-900/70 dark:to-indigo-950/40 p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {uiLang === 'zh' ? '第四步 · 源文件原声 vs 克隆音色 对比预览' : 'Step 4 · Source Audio vs Cloned Voice Comparison'}
              </h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                clonedOutputLang === 'en'
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              }`}>
                {clonedOutputLang === 'en' ? '🇺🇸 英文朗读预览' : '🇨🇳 中文普通话朗读预览'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleSynthesizeCloned()}
              disabled={isComparisonPreviewGenerating || isSynthesizing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-700 shadow-sm transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isComparisonPreviewGenerating || isSynthesizing ? 'animate-spin' : ''}`} />
              <span>{isComparisonPreviewGenerating || isSynthesizing ? (uiLang === 'zh' ? '正在渲染克隆音色...' : 'Rendering Preview...') : (uiLang === 'zh' ? '重新渲染对比音频' : 'Regenerate Comparison')}</span>
            </button>
          </div>

          {/* Dual Track Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Track 1: Source Reference Audio */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {uiLang === 'zh' ? '【源文件原声参考】' : '【Source Reference】'}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                  {detectedAcoustics?.fundamentalFreqHz || activeProfile.fundamentalFreqHz || 220} Hz · {activeProfile.gender === 'Female' ? '女声' : '男声'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate">
                {sampleFileName || '参考音频原声样本'}
              </p>
              {referenceAudioUrl && (
                <audio src={referenceAudioUrl} controls className="w-full h-9" />
              )}
            </div>

            {/* Track 2: Cloned Synthesized Audio */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-indigo-200 dark:border-indigo-500/40 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{uiLang === 'zh' ? '【克隆后音色预览】' : '【Cloned Voice Preview】'}</span>
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                  底模: {chosenBaseVoice} · {clonedOutputLang === 'en' ? 'English' : '普通话'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate">
                {customVoiceName || activeProfile.name} · 声学特征与实时调音已注入
              </p>
              {isComparisonPreviewGenerating || isSynthesizing ? (
                <div className="h-9 flex items-center justify-center gap-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>正在生成克隆朗读对比音频...</span>
                </div>
              ) : (clonedPreviewAudioUrl || dspOutputAudioUrl) ? (
                <audio key={(clonedPreviewAudioUrl || dspOutputAudioUrl) + clonedOutputLang} src={(clonedPreviewAudioUrl || dspOutputAudioUrl) || undefined} controls autoPlay className="w-full h-9" />
              ) : (
                <button
                  type="button"
                  onClick={() => handleSynthesizeCloned()}
                  className="w-full h-9 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{uiLang === 'zh' ? '点击生成并试听克隆对比音频' : 'Generate & Audition Preview'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick A/B Audition Controls */}
          {(dspOutputAudioUrl || rawOutputAudioUrl) && (
            <div className="pt-3 border-t border-indigo-100 dark:border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {uiLang === 'zh' ? 'A/B 音色快速切换：' : 'A/B Audition Mode:'}
                </span>

                <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setActivePlayMode('dsp')}
                    className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                      activePlayMode === 'dsp'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{uiLang === 'zh' ? '定制声学音色 (DSP 调优)' : 'Customized DSP Voice'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePlayMode('raw')}
                    className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                      activePlayMode === 'raw'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{uiLang === 'zh' ? `原始纯底模 (${chosenBaseVoice})` : `Raw Base (${chosenBaseVoice})`}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {activePlayMode === 'dsp' ? `正在试听：定制音色【${customVoiceName || activeProfile.name}】` : `正在试听：官方原始底模【${chosenBaseVoice}】`}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {activePlayMode === 'dsp'
                      ? `Pitch: ${dspTuning.pitchSemitones > 0 ? '+' : ''}${dspTuning.pitchSemitones}st · Warmth: ${dspTuning.bassWarmthDb}dB`
                      : 'Raw Neural Base'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  {formatTime(clonedOutputDuration)}
                </span>
              </div>
            </div>
          )}

          <p className="text-[11px] text-indigo-800 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
            💡 提示：左侧为源文件参考原声，右侧为当前文本与语言（{clonedOutputLang === 'en' ? '英文' : '中文'}）合成的克隆音色。切换上方底模或语言时，对比音色将实时自动同步刷新。
          </p>
        </div>
      )}
    </div>
  );
};
