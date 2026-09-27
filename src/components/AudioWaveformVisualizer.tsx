import React, { useEffect, useRef } from 'react';

interface AudioWaveformVisualizerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  accentColor?: string;
  height?: number;
  barCount?: number;
  interactive?: boolean;
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  isPlaying,
  currentTime,
  duration,
  onSeek,
  accentColor = '#6366f1', // elegant studio indigo default
  height = 56,
  barCount = 64,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const seedValuesRef = useRef<number[]>([]);

  // Generate deterministic bar heights for aesthetic waveform
  if (seedValuesRef.current.length !== barCount) {
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      // Natural speech envelope shape: tapered at ends, varied in middle
      const normalizedPos = i / (barCount - 1);
      const envelope = Math.sin(normalizedPos * Math.PI) * 0.75 + 0.25;
      const pseudoRandom = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const noise = (pseudoRandom - Math.floor(pseudoRandom)) * 0.5 + 0.5;
      bars.push(Math.max(0.12, envelope * noise));
    }
    seedValuesRef.current = bars;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, width, h);

      const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
      const barWidth = Math.max(2, (width / barCount) - 2);
      const gap = 2;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        const barProgress = i / barCount;
        const isPast = barProgress <= progress;

        let barHFactor = seedValuesRef.current[i] || 0.3;
        if (isPlaying && isPast) {
          // Dynamic wave ripple during playback
          const dynamicMod = Math.sin(frameCount * 0.15 + i * 0.4) * 0.18;
          barHFactor = Math.min(1, Math.max(0.15, barHFactor + dynamicMod));
        }

        const barHeight = Math.max(4, barHFactor * (h - 8));
        const y = (h - barHeight) / 2;

        // Draw rounded bar
        ctx.beginPath();
        const radius = barWidth / 2;
        ctx.roundRect(x, y, barWidth, barHeight, radius);

        if (isPast) {
          ctx.fillStyle = accentColor;
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        }
        ctx.fill();
      }

      // Draw playhead vertical line if active
      if (duration > 0) {
        const playheadX = progress * width;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, h);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(playheadX, h / 2, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      if (isPlaying) {
        frameCount++;
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, accentColor, barCount]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !onSeek || duration <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(clickRatio * duration);
  };

  return (
    <div className="relative w-full group cursor-pointer" style={{ height: `${height}px` }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full block rounded-md"
      />
    </div>
  );
};
