import { UILanguage } from '../types';

export const I18N = {
  zh: {
    // Brand
    brandSubtitle: '基于 Gemini 的语音合成工作台',

    // Nav
    tabStudio: '语音合成',
    tabDesign: '音色设计',
    tabHistory: '生成历史',

    // Theme & Lang
    themeLight: '浅色模式',
    themeDark: '深色模式',

    // Output language selector
    outputLangLabel: '发音语言',
    outputLangAuto: '自动识别',

    // Studio Left Column
    inputScriptLabel: '朗读文本',
    presetsLabel: '示例：',
    textareaPlaceholder: '在此输入您想要朗读的文本内容...',
    vocalBurstsLabel: '插入语气标记',
    charsLabel: '字符',
    synthesizingState: '正在生成语音…',
    outputStationLabel: '试听与下载',

    // Studio Right Column
    voicePersonaLabel: '选择音色',
    previewVoiceBtn: '试听',
    previewPlayingBtn: '停止',
    deliveryStyleLabel: '演绎风格',
    writeCustomStyle: '编写自定义风格',
    usingCustomStyle: '当前使用自定义风格',
    cancelCustom: '取消自定义',
    customStylePlaceholder: '例如：像一位资深播音员，语气温和而坚定，尾音带着自然的亲切感...',
    neuralTierLabel: '合成模型',
    flashLiteName: 'Flash Lite 极速语音',
    flashLiteDesc: '低延迟、高响应速度，日常朗读首选',
    flashName: 'Flash Flagship 旗舰语音',
    flashDesc: '声音设计、双语韵律与自然语气气声支持',

    // Library & History
    generationHistoryTitle: '语音生成历史',
    clearHistoryBtn: '清空历史',
    noHistoryTitle: '暂无生成记录',
    noHistoryDesc: '所有合成的语音片段都将保存在这里，支持即时回放、下载或重载文本。',
    downloadWavBtn: '下载 WAV 音频',
    reorderTextBtn: '重新填入文本框',
  },

  en: {
    // Brand
    brandSubtitle: 'Gemini-powered text-to-speech studio',

    // Nav
    tabStudio: 'Studio',
    tabDesign: 'Voice Design',
    tabHistory: 'History',

    // Theme & Lang
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',

    // Output language selector
    outputLangLabel: 'Speech language',
    outputLangAuto: 'Auto Detect',

    // Studio Left Column
    inputScriptLabel: 'Script',
    presetsLabel: 'Samples:',
    textareaPlaceholder: 'Enter the text you want the voice to speak aloud...',
    vocalBurstsLabel: 'Insert expressive tags',
    charsLabel: 'chars',
    synthesizingState: 'Generating speech…',
    outputStationLabel: 'Playback',

    // Studio Right Column
    voicePersonaLabel: 'Voice',
    previewVoiceBtn: 'Preview',
    previewPlayingBtn: 'Stop',
    deliveryStyleLabel: 'Delivery style',
    writeCustomStyle: 'Write Custom Style',
    usingCustomStyle: 'Using Custom Style',
    cancelCustom: 'Cancel custom',
    customStylePlaceholder: 'e.g. Whispering mysteriously like a 1940s noir detective in a rain-soaked alley...',
    neuralTierLabel: 'Model',
    flashLiteName: 'Flash Lite TTS',
    flashLiteDesc: 'Low-latency, high-efficiency daily narration',
    flashName: 'Flash Flagship TTS',
    flashDesc: 'Voice design, dual-language nuance & vocal bursts',

    // Library & History
    generationHistoryTitle: 'Generation History',
    clearHistoryBtn: 'Clear History',
    noHistoryTitle: 'No Generated Clips Yet',
    noHistoryDesc: 'Synthesized speeches will appear here so you can re-listen, download, or reuse scripts anytime.',
    downloadWavBtn: 'Download WAV',
    reorderTextBtn: 'Load to Editor',
  },
};
