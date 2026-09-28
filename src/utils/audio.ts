/**
 * Audio helper utilities for playback and download.
 */

/**
 * Format duration in seconds to M:SS or MM:SS
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Trigger immediate download of a base64 or blob audio file.
 */
export function downloadAudio(audioUrl: string, filename: string = 'resona-speech.wav') {
  const link = document.createElement('a');
  link.href = audioUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Build a download filename from a display label, keeping CJK characters.
 */
export function audioFilename(label: string): string {
  const slug = label
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s*·\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `resona-${slug || 'speech'}-${Date.now()}.wav`;
}
