export type PrebuiltVoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export type UILanguage = 'zh' | 'en';
export type OutputLanguage = 'zh' | 'en' | 'auto';
export type ThemeMode = 'dark' | 'light';

export interface PrebuiltVoice {
  id: PrebuiltVoiceName;
  name: string;
  gender: 'Feminine' | 'Masculine' | 'Neutral';
  timbreDescription: string;
  timbreDescriptionZh: string;
  bestFor: string;
  bestForZh: string;
  tone: string[];
  toneZh: string[];
  pitchGuide: string;
  pitchGuideZh: string;
  recommendedLanguages: ('en' | 'zh')[];
  suitabilityTagZh: string;
  suitabilityTagEn: string;
  suitabilityDescriptionZh: string;
  suitabilityDescriptionEn: string;
}

export interface VoiceStylePreset {
  id: string;
  name: string;
  nameZh: string;
  icon: string;
  description: string;
  descriptionZh: string;
  stylePrompt: string;
  category: 'Broadcast' | 'Story' | 'Commercial' | 'Emotion' | 'Casual';
}

export interface TimbreScores {
  warmth: number; // 1-10
  brightness: number; // 1-10
  gravel: number; // 1-10
  breathiness: number; // 1-10
  resonance: number; // 1-10
}

export interface DspTuningConfig {
  pitchSemitones: number;
  speedMultiplier: number;
  bassWarmthDb: number;
  midPresenceDb: number;
  trebleAirDb: number;
}

export interface ClonedVoiceProfile {
  id: string;
  name: string;
  gender: string;
  ageEstimate: string;
  accent: string;
  pitchRegister: string;
  fundamentalFreqHz?: number;
  timbreDescription: string;
  cadence: string;
  timbreScores: TimbreScores;
  bestBaseVoice: PrebuiltVoiceName;
  cloningStylePrompt: string;
  recommendedTuning?: {
    pitchShiftSemitones?: number;
    speedMultiplier?: number;
    eqBassBoostDb?: number;
    eqTrebleBoostDb?: number;
  };
  dspConfig?: DspTuningConfig;
  transcription?: string;
  summary: string;
  referenceAudioUrl: string;
  createdAt: string;
}

export interface SpeechGenerationRecord {
  id: string;
  text: string;
  audioUrl: string;
  durationSec: number;
  voiceName: string;
  isClonedVoice?: boolean;
  clonedVoiceId?: string;
  baseVoice?: string;
  outputLanguage?: OutputLanguage;
  stylePrompt: string;
  model: string;
  createdAt: string;
}

export interface SampleScript {
  id: string;
  title: string;
  titleZh: string;
  category: string;
  categoryZh: string;
  language: 'zh' | 'en';
  text: string;
  suggestedStyleId?: string;
  suggestedVoice?: PrebuiltVoiceName;
}

export interface ReferenceVoiceSample {
  id: string;
  name: string;
  description: string;
  descriptionZh: string;
  speakerInfo: string;
  speakerInfoZh: string;
  gender: string;
  accent: string;
  audioUrl: string;
  preAnalyzedProfile?: Partial<ClonedVoiceProfile>;
}
