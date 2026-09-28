import React, { useEffect, useRef, useState } from 'react';
import { Wand2, Play, Pause, Trash2, Mic, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { DesignedVoice, UILanguage } from '../types';
import { parseApiResponse } from '../utils/api';
import { claimPlayback } from '../utils/playback';

interface VoiceDesignLabProps {
  designedVoices: DesignedVoice[];
  onVoiceCreated: (voice: DesignedVoice) => void;
  onDeleteVoice: (voice: DesignedVoice) => Promise<void>;
  onUseVoice: (voice: DesignedVoice) => void;
  uiLang: UILanguage;
}

type Gender = 'auto' | 'female' | 'male' | 'neutral';

const EXAMPLE_PROMPTS: { labelZh: string; labelEn: string; lang: 'zh-CN' | 'en-US'; text: string }[] = [
  {
    labelZh: '深夜电台',
    labelEn: 'Night radio host',
    lang: 'zh-CN',
    text: '温暖治愈的年轻女声，二十多岁，语速偏慢，声音柔软、带一点气声，像深夜电台主播在轻声聊天。',
  },
  {
    labelZh: '纪录片旁白',
    labelEn: 'Documentary narrator',
    lang: 'zh-CN',
    text: '沉稳有磁性的中年男声，四十岁左右，低音浑厚，吐字清晰，语调平稳克制，适合自然纪录片旁白。',
  },
  {
    labelZh: '元气少女',
    labelEn: 'Cheerful teen',
    lang: 'zh-CN',
    text: '活泼元气的少女声，十七八岁，声音明亮清脆，语调上扬，说话带着好奇和笑意。',
  },
  {
    labelZh: '老船长（英文）',
    labelEn: 'Old sea captain',
    lang: 'en-US',
    text: 'A gravelly old sea captain in his sixties, warm and weathered, speaking slowly with a hint of a chuckle.',
  },
  {
    labelZh: '科技博主（英文）',
    labelEn: 'Tech reviewer',
    lang: 'en-US',
    text: 'A bright, upbeat young tech reviewer in their twenties, fast-paced, crisp and enthusiastic.',
  },
];

export const VoiceDesignLab: React.FC<VoiceDesignLabProps> = ({
  designedVoices,
  onVoiceCreated,
  onDeleteVoice,
  onUseVoice,
  uiLang,
}) => {
  const zh = uiLang === 'zh';
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [languageCode, setLanguageCode] = useState<'zh-CN' | 'en-US'>('zh-CN');
  const [gender, setGender] = useState<Gender>('auto');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestVoiceId, setLatestVoiceId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const togglePreview = (voice: DesignedVoice) => {
    if (!voice.previewAudioUrl) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    if (playingId === voice.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    audio.src = voice.previewAudioUrl;
    audio.onended = () => setPlayingId(null);
    audio.onpause = () => setPlayingId(null);
    claimPlayback(audio);
    audio.play().then(() => setPlayingId(voice.id)).catch(console.error);
  };

  const handleCreate = async () => {
    if (prompt.trim().length < 5) {
      setError(zh ? '请多描述几句你想要的声音。' : 'Please describe the voice in a bit more detail.');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/voices/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          name: name.trim() || (zh ? '我的音色' : 'My Voice'),
          languageCode,
          gender: gender === 'auto' ? undefined : gender,
        }),
      });
      const data = await parseApiResponse<{ voice: DesignedVoice }>(res, uiLang);
      const voice = data.voice;
      onVoiceCreated(voice);
      setLatestVoiceId(voice.id);
      setName('');
      if (voice.previewAudioUrl) {
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = voice.previewAudioUrl;
        audioRef.current.onended = () => setPlayingId(null);
        audioRef.current.onpause = () => setPlayingId(null);
        claimPlayback(audioRef.current);
        audioRef.current.play().then(() => setPlayingId(voice.id)).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to design voice.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (voice: DesignedVoice) => {
    if (!window.confirm(zh ? `删除音色「${voice.name}」？删除后无法恢复。` : `Delete "${voice.name}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(voice.id);
    try {
      if (playingId === voice.id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
      await onDeleteVoice(voice);
    } catch (err: any) {
      setError(err.message || 'Failed to delete voice.');
    } finally {
      setDeletingId(null);
    }
  };

  const segmented = (active: boolean) =>
    `px-3 py-1 rounded-md whitespace-nowrap transition-all ${
      active
        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm'
        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
    }`;
  const card = 'rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm';
  const fieldLabel = 'text-xs font-medium text-zinc-600 dark:text-zinc-400';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Designer */}
      <section className={`${card} lg:col-span-7 space-y-5`}>
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <Wand2 className="w-4 h-4 text-violet-500" />
            {zh ? '用一段文字设计一个声音' : 'Design a voice from a description'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {zh
              ? '描述你想要的声音，Gemini 会生成一个全新的 AI 音色，保存后可以在语音合成里反复使用。不基于任何真人声音。'
              : 'Describe the voice you want and Gemini creates a brand-new AI voice you can reuse in the studio. It is not based on any real person.'}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel} htmlFor="voice-prompt">
            {zh ? '声音描述' : 'Voice description'}
          </label>
          <textarea
            id="voice-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder={
              zh
                ? '例如：温暖治愈的年轻女声，语速偏慢，声音柔软、带一点气声，像深夜电台主播在轻声聊天。'
                : 'e.g. A warm, soft-spoken young woman, speaking slowly with a slightly breathy tone, like a late-night radio host.'
            }
            className="w-full bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-[15px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 leading-relaxed resize-y"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              {zh ? '可以写：性别与年龄、音色质感、语速语调、使用场景' : 'Try covering: gender & age, texture, pace & tone, use case'}
            </p>
            <span className="text-xs text-zinc-400 font-mono">{prompt.length}/1000</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-violet-500" />
            {zh ? '试试：' : 'Try:'}
          </span>
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex.labelEn}
              type="button"
              onClick={() => {
                setPrompt(ex.text);
                setLanguageCode(ex.lang);
                setName(zh ? ex.labelZh.replace(/（英文）$/, '') : ex.labelEn);
              }}
              className="text-xs px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-300 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              {zh ? ex.labelZh : ex.labelEn}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={fieldLabel} htmlFor="voice-name">
              {zh ? '音色名称' : 'Voice name'}
            </label>
            <input
              id="voice-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder={zh ? '例如：深夜电台' : 'e.g. Night Radio'}
              className="w-full h-9 bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <span className={fieldLabel}>{zh ? '主要语言' : 'Primary language'}</span>
            <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-950 rounded-lg text-xs w-fit">
              <button type="button" className={segmented(languageCode === 'zh-CN')} onClick={() => setLanguageCode('zh-CN')}>
                {zh ? '中文' : 'Chinese'}
              </button>
              <button type="button" className={segmented(languageCode === 'en-US')} onClick={() => setLanguageCode('en-US')}>
                {zh ? '英语' : 'English'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className={fieldLabel}>{zh ? '声音性别（可选）' : 'Gender (optional)'}</span>
          <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-950 rounded-lg text-xs w-fit">
            {([
              ['auto', zh ? '按描述' : 'From description'],
              ['female', zh ? '女声' : 'Female'],
              ['male', zh ? '男声' : 'Male'],
              ['neutral', zh ? '中性' : 'Neutral'],
            ] as [Gender, string][]).map(([id, label]) => (
              <button key={id} type="button" className={segmented(gender === id)} onClick={() => setGender(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || prompt.trim().length < 5}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[15px] shadow-lg shadow-violet-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {zh ? '正在设计音色，大约需要十几秒…' : 'Designing your voice…'}
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              {zh ? '生成音色' : 'Design voice'}
            </>
          )}
        </button>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Library */}
      <section className={`${card} lg:col-span-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{zh ? '我的音色' : 'My voices'}</h2>
          <span className="text-xs text-zinc-500">{designedVoices.length}</span>
        </div>

        {designedVoices.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
            <Wand2 className="w-6 h-6 mx-auto text-zinc-300 dark:text-zinc-600" />
            <p>{zh ? '还没有设计过音色' : 'No designed voices yet'}</p>
            <p className="text-xs">{zh ? '在左边写一段描述，生成你的第一个音色。' : 'Write a description on the left to create your first one.'}</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {designedVoices.map((voice) => {
              const isPlaying = playingId === voice.id;
              const isNew = latestVoiceId === voice.id;
              return (
                <li
                  key={voice.id}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    isNew
                      ? 'border-violet-400 bg-violet-50/60 dark:bg-violet-950/20'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{voice.name}</span>
                      <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                        {voice.languageCode === 'en-US' ? (zh ? '英语' : 'English') : (zh ? '中文' : 'Chinese')}
                      </span>
                      {isNew && (
                        <span className="text-[10px] px-1.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300">
                          {zh ? '新' : 'New'}
                        </span>
                      )}
                    </div>
                    {voice.previewAudioUrl && (
                      <button
                        type="button"
                        onClick={() => togglePreview(voice)}
                        className={`shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          isPlaying
                            ? 'bg-violet-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                        {isPlaying ? (zh ? '停止' : 'Stop') : (zh ? '试听' : 'Preview')}
                      </button>
                    )}
                  </div>

                  <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2" title={voice.prompt}>
                    {voice.prompt}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onUseVoice(voice)}
                      className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                    >
                      <Mic className="w-3 h-3" />
                      {zh ? '用它朗读' : 'Use in studio'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(voice)}
                      disabled={deletingId === voice.id}
                      className="flex items-center gap-1 h-7 px-2 rounded-lg text-xs text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                      title={zh ? '删除音色' : 'Delete voice'}
                    >
                      {deletingId === voice.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      {zh ? '删除' : 'Delete'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          {zh
            ? '音色保存在 Gemini 项目中，列表记录在当前浏览器里。每个项目可保存的音色数量有上限，不用的可以删掉。'
            : 'Voices are stored in the Gemini project; this list lives in your browser. Projects have a stored-voice limit, so delete ones you no longer need.'}
        </p>
      </section>
    </div>
  );
};
