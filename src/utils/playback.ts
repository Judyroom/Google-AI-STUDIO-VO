/**
 * Ensures only one audio source plays at a time across the app
 * (main player, voice previews, designed-voice previews).
 */
let current: HTMLAudioElement | null = null;

export function claimPlayback(audio: HTMLAudioElement) {
  if (current && current !== audio && !current.paused) {
    current.pause();
  }
  current = audio;
}
