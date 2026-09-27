/**
 * Resona Audio DSP Engine
 * 
 * Provides real-time and offline digital signal processing (DSP) for voice timbre sculpting,
 * including pitch-shifting, 3-band parametric EQ (warmth/presence/air), dynamic compression,
 * and audio rendering to clean 16-bit PCM WAV.
 */

export interface DspTuningConfig {
  pitchSemitones: number; // -12 to +12 semitones
  speedMultiplier: number; // 0.75x to 1.5x
  bassWarmthDb: number; // -12dB to +12dB
  midPresenceDb: number; // -12dB to +12dB
  trebleAirDb: number; // -12dB to +12dB
}

export const DEFAULT_DSP_CONFIG: DspTuningConfig = {
  pitchSemitones: 0,
  speedMultiplier: 1.0,
  bassWarmthDb: 0,
  midPresenceDb: 0,
  trebleAirDb: 0,
};

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM WAV Blob.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const numSamples = buffer.length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = buffer.getChannelData(channel)[i];
      // Soft clamp
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Decodes an audio URL or Data URL to an AudioBuffer.
 */
export async function decodeAudioFromUrl(
  audioUrl: string,
  audioContext: BaseAudioContext
): Promise<AudioBuffer> {
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();
  // decodeAudioData requires a clone or direct ArrayBuffer
  return await audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Checks if a DSP config introduces any active acoustic transformations.
 */
export function isDspActive(config?: Partial<DspTuningConfig> | null): boolean {
  if (!config) return false;
  return (
    (config.pitchSemitones !== undefined && Math.abs(config.pitchSemitones) > 0.05) ||
    (config.speedMultiplier !== undefined && Math.abs(config.speedMultiplier - 1.0) > 0.03) ||
    (config.bassWarmthDb !== undefined && Math.abs(config.bassWarmthDb) > 0.5) ||
    (config.midPresenceDb !== undefined && Math.abs(config.midPresenceDb) > 0.5) ||
    (config.trebleAirDb !== undefined && Math.abs(config.trebleAirDb) > 0.5)
  );
}

/**
 * Applies full DSP signal chain using OfflineAudioContext and returns a new playable WAV Blob URL.
 */
export async function processAudioWithDsp(
  inputAudioUrl: string,
  config: DspTuningConfig
): Promise<string> {
  // If no transformations, return the original audio URL directly
  if (!isDspActive(config)) {
    return inputAudioUrl;
  }

  // Temporary AudioContext for decoding input
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let decodedBuffer: AudioBuffer;
  try {
    decodedBuffer = await decodeAudioFromUrl(inputAudioUrl, tempCtx);
  } finally {
    tempCtx.close().catch(() => {});
  }

  const pitchShift = config.pitchSemitones || 0;
  const speed = Math.max(0.6, Math.min(1.8, config.speedMultiplier || 1.0));
  
  // Effective playback rate multiplier combining pitch shift and speed adjustment
  // 1 semitone = 2^(1/12)
  const pitchRatio = Math.pow(2, pitchShift / 12);
  const effectiveRate = pitchRatio * speed;

  const originalDuration = decodedBuffer.duration;
  const targetDuration = originalDuration / effectiveRate;
  const targetLength = Math.max(1, Math.ceil(targetDuration * decodedBuffer.sampleRate));

  const offlineCtx = new OfflineAudioContext(
    decodedBuffer.numberOfChannels,
    targetLength,
    decodedBuffer.sampleRate
  );

  // Audio source node
  const source = offlineCtx.createBufferSource();
  source.buffer = decodedBuffer;
  source.playbackRate.value = effectiveRate;

  // 1. Low-shelf Filter (Warmth & Chest Resonance: 200 Hz)
  const bassFilter = offlineCtx.createBiquadFilter();
  bassFilter.type = 'lowshelf';
  bassFilter.frequency.value = 220;
  bassFilter.gain.value = Math.max(-12, Math.min(12, config.bassWarmthDb || 0));

  // 2. Peaking Filter (Vocal Presence & Formant Closeness: 2200 Hz)
  const midFilter = offlineCtx.createBiquadFilter();
  midFilter.type = 'peaking';
  midFilter.frequency.value = 2200;
  midFilter.Q.value = 1.1;
  midFilter.gain.value = Math.max(-12, Math.min(12, config.midPresenceDb || 0));

  // 3. High-shelf Filter (Airiness & Diction Crispness: 6500 Hz)
  const trebleFilter = offlineCtx.createBiquadFilter();
  trebleFilter.type = 'highshelf';
  trebleFilter.frequency.value = 6500;
  trebleFilter.gain.value = Math.max(-12, Math.min(12, config.trebleAirDb || 0));

  // 4. Studio Dynamics Compressor (prevents clipping, adds broadcast polish)
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 8;
  compressor.ratio.value = 2.8;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.2;

  // Connect chain: source -> bass -> mid -> treble -> compressor -> destination
  source.connect(bassFilter);
  bassFilter.connect(midFilter);
  midFilter.connect(trebleFilter);
  trebleFilter.connect(compressor);
  compressor.connect(offlineCtx.destination);

  source.start(0);

  // Render processed buffer
  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer);

  return URL.createObjectURL(wavBlob);
}
