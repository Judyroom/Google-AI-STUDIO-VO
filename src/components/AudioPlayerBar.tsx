import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Download,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Sparkles,
  Globe,
} from 'lucide-react';
import { formatTime, downloadAudio } from '../utils/audio';
import { AudioWaveformVisualizer } from './AudioWaveformVisualizer';
import { OutputLanguage, UILanguage } from '../types';

interface AudioPlayerBarProps {
  audioUrl: string | null;
  title?: string;
  subtitle?: string;
  outputLanguage?: OutputLanguage;
  uiLang?: UILanguage;
  onDownload?: () => void;
  autoPlay?: boolean;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  audioUrl,
  title = 'Synthesized Speech',
  subtitle,
  outputLanguage,
  uiLang = 'zh',
  autoPlay = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    const audio = audioRef.current;
    audio.src = audioUrl;
    audio.playbackRate = playbackRate;
    setCurrentTime(0);

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      if (autoPlay) {
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (newTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 0.85];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.wav`;
    downloadAudio(audioUrl, filename);
  };

  const handleCopyLink = () => {
    if (!audioUrl) return;
    navigator.clipboard.writeText(audioUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!audioUrl) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/60 p-6 text-center text-zinc-500">
        <Sparkles className="w-6 h-6 mx-auto mb-2 text-zinc-400 dark:text-zinc-600" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {uiLang === 'zh' ? '音频播放器就绪' : 'Audio player standby'}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">
          {uiLang === 'zh'
            ? '在上方输入文本并点击生成，即可在此听到自然流利的真实语音'
            : 'Type your text above and click synthesize to listen to the generated speech'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-500/30 dark:border-indigo-500/20 bg-white dark:bg-gradient-to-b dark:from-zinc-900/90 dark:to-zinc-950 p-5 shadow-lg dark:shadow-2xl transition-colors">
      <audio ref={audioRef} preload="auto" />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h4>
            {/* Output Language indicator badge */}
            {outputLanguage && outputLanguage !== 'auto' && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                outputLanguage === 'zh'
                  ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                  : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
              }`}>
                {outputLanguage === 'zh'
                  ? (uiLang === 'zh' ? '中文输出' : 'Chinese')
                  : (uiLang === 'zh' ? '英语输出' : 'English')}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
              <span>{subtitle}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Playback speed toggle */}
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="px-2 py-1 text-xs font-mono font-medium rounded-md bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            title="Cycle playback speed"
          >
            {playbackRate}x
          </button>

          {/* Mute button */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Copy Audio URL"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Download WAV */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-500/30 transition-colors"
            title="Download high-fidelity WAV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{uiLang === 'zh' ? '下载 WAV' : 'Download WAV'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Waveform Visualizer */}
      <div className="my-2 bg-zinc-100 dark:bg-zinc-950/80 rounded-lg p-2 border border-zinc-200 dark:border-zinc-800/60">
        <AudioWaveformVisualizer
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          accentColor="#6366f1"
          height={60}
        />
      </div>

      {/* Transport Controls & Time */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
        <div className="flex items-center gap-2">
          {/* Skip back 5s */}
          <button
            type="button"
            onClick={() => handleSkip(-5)}
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg transition-colors"
            title="Rewind 5 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Primary Play / Pause button */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 transition-all font-bold"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Skip forward 5s */}
          <button
            type="button"
            onClick={() => handleSkip(5)}
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg transition-colors"
            title="Skip forward 5 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Time display */}
        <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
          <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{formatTime(currentTime)}</span>
          <span className="mx-1 text-zinc-400">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
