import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Server-side initialization of Gemini SDK as required by system guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Utility to convert raw 16-bit little-endian PCM into a valid WAV audio file buffer.
 */
function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;
  const header = Buffer.alloc(44);

  // RIFF identifier
  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);

  // fmt subchunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Format audio response: ensure valid WAV data URL for immediate browser playback.
 */
function formatAudioResponse(base64Data: string, sampleRate: number = 24000): { audioUrl: string; durationSec: number } {
  const rawBuffer = Buffer.from(base64Data, 'base64');
  let wavBuffer: Buffer;

  // Check if it already has a RIFF/WAVE header
  if (
    rawBuffer.length >= 12 &&
    rawBuffer.toString('ascii', 0, 4) === 'RIFF' &&
    rawBuffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    wavBuffer = rawBuffer;
  } else {
    wavBuffer = pcmToWav(rawBuffer, sampleRate, 1, 16);
  }

  // Calculate approximate duration from PCM size (2 bytes per sample at 24000Hz mono)
  const pcmSize = wavBuffer.length > 44 ? wavBuffer.length - 44 : rawBuffer.length;
  const durationSec = Math.round((pcmSize / (sampleRate * 2)) * 100) / 100;

  return {
    audioUrl: `data:audio/wav;base64,${wavBuffer.toString('base64')}`,
    durationSec,
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

app.use('/api', (req, res, next) => {
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }
  next();
});

/**
 * POST /api/tts/generate
 * Standard text-to-speech with selectable voice styles and prebuilt voices.
 */
app.post('/api/tts/generate', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      stylePrompt,
      outputLanguage = 'auto',
      model = 'gemini-3.8-flash-lite-tts',
      customVoiceId,
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text content is required' });
      return;
    }

    const validVoiceNames = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoiceNames.includes(voiceName) ? voiceName : 'Kore';
    const useCustomVoice = typeof customVoiceId === 'string' && CUSTOM_VOICE_ID.test(customVoiceId);
    const voiceConfig = useCustomVoice
      ? { voice: customVoiceId }
      : { prebuiltVoiceConfig: { voiceName: chosenVoice } };
    const chosenModel = model === 'gemini-3.8-flash-tts' ? 'gemini-3.8-flash-tts' : 'gemini-3.8-flash-lite-tts';

    let combinedStyle = (stylePrompt && typeof stylePrompt === 'string') ? stylePrompt.trim() : '';

    if (outputLanguage === 'zh') {
      const zhDirective = 'Pronounced in authentic, fluent Standard Mandarin Chinese with natural tonal inflections and smooth cadence';
      combinedStyle = combinedStyle ? `${zhDirective}. ${combinedStyle}` : zhDirective;
    } else if (outputLanguage === 'en') {
      const enDirective = 'Pronounced in natural, fluent English with clear diction and authentic cadence';
      combinedStyle = combinedStyle ? `${enDirective}. ${combinedStyle}` : enDirective;
    }

    const partObj: { text: string; speechMetadata?: { style?: string } } = {
      text: text.trim(),
    };

    if (combinedStyle) {
      partObj.speechMetadata = {
        style: combinedStyle,
      };
    }

    const modelsToTry = [
      chosenModel,
      chosenModel === 'gemini-3.8-flash-lite-tts' ? 'gemini-3.8-flash-tts' : 'gemini-3.8-flash-lite-tts',
    ];

    let response: any = null;
    let actualModelUsed = chosenModel;

    for (const modelToAttempt of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelToAttempt,
          contents: [
            {
              role: 'user',
              parts: [partObj],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig },
          },
        });

        if (response?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)) {
          actualModelUsed = modelToAttempt;
          break;
        }
      } catch (err: any) {
        const errMsg = String(err?.message || '');
        const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota');
        if (isQuota) {
          console.log(`[TTS Info] Model ${modelToAttempt} quota busy, attempting alternative model...`);
          continue;
        }
        throw err;
      }
    }

    const candidate = response?.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData?.data);

    if (!response) {
      res.status(429).json({ error: 'Gemini TTS quota is busy on both models. Please wait a minute and try again.' });
      return;
    }

    if (!audioPart || !audioPart.inlineData?.data) {
      res.status(500).json({
        error: 'No audio stream returned from Gemini TTS. Please try a different voice or shorter text.',
      });
      return;
    }

    const base64Data = audioPart.inlineData.data;
    const { audioUrl, durationSec } = formatAudioResponse(base64Data, 24000);

    res.json({
      success: true,
      audioUrl,
      durationSec,
      voiceName: useCustomVoice ? customVoiceId : chosenVoice,
      model: actualModelUsed,
      outputLanguage: outputLanguage || 'auto',
      stylePrompt: stylePrompt || 'Natural',
      charCount: text.length,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/tts/generate:', error);
    res.status(500).json({
      error: googleErrorMessage(error) || 'Failed to generate speech. Please check your text and try again.',
    });
  }
});

/**
 * Cache for instant voice sample previews
 */
const previewCache = new Map<string, { audioUrl: string; durationSec: number }>();

const PREVIEW_SCRIPTS: Record<string, { zh: string; en: string }> = {
  Kore: {
    zh: '您好，我是 Kore。声音柔和温暖，希望为您的故事增添色彩。',
    en: 'Hello, I am Kore. Gentle, warm, and ready to bring your words to life.',
  },
  Fenrir: {
    zh: '这里是 Fenrir。沉稳深沉，适合庄重大气的叙事篇章。',
    en: 'This is Fenrir. Deep, resonant, and built for commanding storytelling.',
  },
  Puck: {
    zh: '哈喽，我是 Puck！充满活力的声音，让每个点子都跳跃起来！',
    en: 'Hey there, I am Puck! High energy, fast-paced, and full of enthusiasm!',
  },
  Zephyr: {
    zh: '您好，我是 Zephyr。发音清晰平衡，适合专业与科技讲解。',
    en: 'Hello, I am Zephyr. Clear, balanced, and articulate for professional narration.',
  },
  Charon: {
    zh: '我是 Charon。烟嗓磁性沉淀，讲述岁月沉淀下的故事。',
    en: 'I am Charon. Gritty, smoky, and seasoned with vintage warmth.',
  },
};

/**
 * POST /api/tts/preview
 * Plays a quick signature spoken sentence in the selected voice for immediate auditioning.
 */
app.post('/api/tts/preview', async (req, res) => {
  try {
    const { voiceName = 'Kore', lang = 'zh' } = req.body;
    const chosenVoice = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceName)
      ? voiceName
      : 'Kore';
    const chosenLang = lang === 'en' ? 'en' : 'zh';
    const cacheKey = `${chosenVoice}_${chosenLang}`;

    if (previewCache.has(cacheKey)) {
      const cached = previewCache.get(cacheKey)!;
      res.json({
        success: true,
        ...cached,
        voiceName: chosenVoice,
        lang: chosenLang,
      });
      return;
    }

    const scriptObj = PREVIEW_SCRIPTS[chosenVoice] || PREVIEW_SCRIPTS['Kore'];
    const previewText = chosenLang === 'en' ? scriptObj.en : scriptObj.zh;
    const stylePrompt = chosenLang === 'zh'
      ? 'Delivered in authentic, natural Standard Mandarin Chinese with warm expression'
      : 'Delivered in fluent, natural English with authentic expression';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: previewText,
              speechMetadata: {
                style: stylePrompt,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData?.data);

    if (!audioPart || !audioPart.inlineData?.data) {
      res.status(500).json({ error: 'Failed to synthesize voice preview' });
      return;
    }

    const { audioUrl, durationSec } = formatAudioResponse(audioPart.inlineData.data, 24000);
    previewCache.set(cacheKey, { audioUrl, durationSec });

    res.json({
      success: true,
      audioUrl,
      durationSec,
      voiceName: chosenVoice,
      lang: chosenLang,
      previewText,
    });
  } catch (error: any) {
    console.error('Error in /api/tts/preview:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate voice preview.',
    });
  }
});

const CUSTOM_VOICE_ID = /^voice_[A-Za-z0-9_-]{4,}$/;

/**
 * Pull the human-readable message out of a Gemini SDK error, whose message
 * embeds the raw JSON response body.
 */
function googleErrorMessage(err: any): string {
  const raw = String(err?.message || err || '');
  const match = raw.match(/"message":\s*"((?:[^"\\]|\\.)*)"/);
  return match ? match[1] : raw;
}

function isQuotaError(err: any): boolean {
  const msg = String(err?.message || '');
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
}

/**
 * Turn the sample_audio payload returned by voice creation into a playable WAV data URL.
 */
function sampleAudioToUrl(sample?: { data?: string; mime_type?: string }): string | undefined {
  if (!sample?.data) return undefined;
  const mime = (sample.mime_type || '').toLowerCase();
  if (mime.includes('wav') || mime.includes('pcm') || mime.includes('l16') || !mime) {
    return formatAudioResponse(sample.data, 24000).audioUrl;
  }
  return `data:${mime};base64,${sample.data}`;
}

const DESIGN_PREVIEW_TEXT: Record<'zh' | 'en', string> = {
  zh: '你好，这是根据你的描述设计出来的专属音色。希望你喜欢这个声音。',
  en: 'Hello, this is the voice you designed from your description. I hope you like how it sounds.',
};

/**
 * POST /api/voices/design
 * Creates a stored Gemini custom voice from a natural-language description
 * (Voice Design, type "prompted") and returns it with a short audio preview.
 */
app.post('/api/voices/design', async (req, res) => {
  const { prompt, name, languageCode = 'zh-CN', gender } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
    res.status(400).json({ error: 'Please describe the voice in at least a few words.' });
    return;
  }
  const displayName = (typeof name === 'string' && name.trim()) ? name.trim().slice(0, 60) : 'My Voice';
  const lang = languageCode === 'en-US' ? 'en-US' : 'zh-CN';

  let voice: any;
  try {
    voice = await ai.voices.create({
      store: true,
      voice: {
        type: 'prompted',
        display_name: displayName,
        language_code: lang,
        ...(gender === 'female' || gender === 'male' || gender === 'neutral' ? { gender } : {}),
        prompted: { input: prompt.trim().slice(0, 1000) },
      },
    });
  } catch (err: any) {
    console.error('Error in /api/voices/design (create):', err);
    const message = googleErrorMessage(err);
    res.status(isQuotaError(err) ? 429 : 500).json({
      error: /stored voice|voice quota/i.test(message)
        ? 'Stored voice limit reached. Delete some designed voices and try again.'
        : message || 'Failed to design voice.',
    });
    return;
  }

  if (!voice?.id) {
    res.status(500).json({ error: 'Gemini did not return a voice id.' });
    return;
  }

  // Prefer the preview Gemini returns; otherwise synthesize a short line with the new voice.
  let previewAudioUrl = sampleAudioToUrl(voice.sample_audio);
  if (!previewAudioUrl) {
    try {
      const preview = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [{ role: 'user', parts: [{ text: DESIGN_PREVIEW_TEXT[lang === 'en-US' ? 'en' : 'zh'] }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { voice: voice.id } },
        },
      });
      const part = preview.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      if (part?.inlineData?.data) {
        previewAudioUrl = formatAudioResponse(part.inlineData.data, 24000).audioUrl;
      }
    } catch (err: any) {
      console.warn('Voice created but preview synthesis failed:', googleErrorMessage(err));
    }
  }

  res.json({
    success: true,
    voice: {
      id: voice.id,
      name: voice.display_name || displayName,
      prompt: prompt.trim(),
      languageCode: voice.language_code || lang,
      gender: voice.gender,
      description: voice.description,
      expireTime: voice.expire_time,
      previewAudioUrl,
      createdAt: new Date().toISOString(),
    },
  });
});

/**
 * DELETE /api/voices/:id
 * Deletes a stored custom voice so it stops counting against the project quota.
 */
app.delete('/api/voices/:id', async (req, res) => {
  const { id } = req.params;
  if (!CUSTOM_VOICE_ID.test(id)) {
    res.status(400).json({ error: 'Invalid voice id.' });
    return;
  }
  try {
    await ai.voices.delete(id);
    res.json({ success: true });
  } catch (err: any) {
    const message = googleErrorMessage(err);
    // Already gone on Google's side: treat as deleted.
    if (/not found|NOT_FOUND|404/i.test(String(err?.message || ''))) {
      res.json({ success: true });
      return;
    }
    console.error('Error in DELETE /api/voices/:id:', err);
    res.status(500).json({ error: message || 'Failed to delete voice.' });
  }
});

// -------------------------------------------------------------
// Vite Dev Server / Static Hosting
// -------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Resona Audio Studio server running at http://0.0.0.0:${PORT}`);
});
