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

export interface DesignedVoice {
  /** Gemini stored voice id, e.g. voice_abc123 */
  id: string;
  name: string;
  /** The natural-language description the voice was designed from */
  prompt: string;
  languageCode: string;
  gender?: string;
  description?: string;
  previewAudioUrl?: string;
  expireTime?: string;
  createdAt: string;
}

export interface SpeechGenerationRecord {
  id: string;
  text: string;
  audioUrl: string;
  durationSec: number;
  voiceName: string;
  isCustomVoice?: boolean;
  customVoiceId?: string;
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
