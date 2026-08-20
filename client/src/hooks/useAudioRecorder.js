import { useCallback, useRef, useState } from 'react';

const TARGET_SAMPLE_RATE = 16000;
const VAD_THRESHOLD = 0.012;
const SILENCE_END_MS = 700;
const MIN_SPEECH_MS = 350;
const MAX_UTTERANCE_MS = 15000;

export function useAudioRecorder({ onUtterance, onStatus } = {}) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(null);
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const processorRef = useRef(null);
  const bufferRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const speechStartRef = useRef(0);
  const lastSpeechRef = useRef(0);

  const cleanup = useCallback(() => {
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch {} processorRef.current = null; }
    if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch {} analyserRef.current = null; }
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch {} sourceRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    bufferRef.current = [];
    isSpeakingRef.current = false;
  }, []);

  const flush = useCallback(() => {
    const chunks = bufferRef.current;
    bufferRef.current = [];
    if (!chunks.length) return;
    const sampleRate = audioCtxRef.current?.sampleRate || 44100;
    const pcm16 = resampleAndConcat(chunks, sampleRate, TARGET_SAMPLE_RATE);
    if (pcm16.length > 0) onUtterance?.(pcm16, TARGET_SAMPLE_RATE);
  }, [onUtterance]);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) { setError('Microphone API not supported.'); return false; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      await audioCtx.resume();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      source.connect(analyser); analyser.connect(processor); processor.connect(audioCtx.destination);
      
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const chunk = new Float32Array(input.length);
        chunk.set(input);
        let sum = 0;
        for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
        const rms = Math.sqrt(sum / chunk.length);
        const now = performance.now();

        if (rms > VAD_THRESHOLD) {
          if (!isSpeakingRef.current) { isSpeakingRef.current = true; speechStartRef.current = now; }
          lastSpeechRef.current = now;
          bufferRef.current.push(chunk);
        } else if (isSpeakingRef.current) {
          bufferRef.current.push(chunk);
          const speechDuration = now - speechStartRef.current;
          const silenceAfterSpeech = now - lastSpeechRef.current;
          if (silenceAfterSpeech >= SILENCE_END_MS && speechDuration >= MIN_SPEECH_MS) {
            isSpeakingRef.current = false; flush();
          } else if (speechDuration > MAX_UTTERANCE_MS) {
            isSpeakingRef.current = false; flush();
          }
        }
      };
      setRecording(true);
      onStatus?.('LISTENING');
      return true;
    } catch (err) {
      console.error('[AudioRecorder] start failed:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') setError('Microphone permission denied. Please allow mic access and try again.');
      else if (err?.name === 'NotFoundError') setError('No microphone found. Please connect a microphone (headset, earbuds, or built-in mic) and try again.');
      else if (err?.name === 'NotReadableError') setError('Microphone is already in use by another app.');
      else if (window.location.protocol !== 'https:') setError('Microphone requires HTTPS. Please use the deployed URL.');
      else setError(err?.message || 'Failed to start microphone.');
      cleanup();
      return false;
    }
  }, [cleanup, flush, onStatus]);

  const stop = useCallback(() => {
    if (isSpeakingRef.current) flush();
    isSpeakingRef.current = false;
    cleanup();
    setRecording(false);
    onStatus?.('IDLE');
  }, [cleanup, flush, onStatus]);

  return { recording, error, start, stop };
}

function resampleAndConcat(chunks, fromRate, toRate) {
  if (!chunks.length) return new Float32Array(0);
  let total = 0;
  for (const c of chunks) total += c.length;
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) { merged.set(c, offset); offset += c.length; }
  if (fromRate === toRate) return merged;
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.floor(merged.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, merged.length - 1);
    const frac = idx - i0;
    out[i] = merged[i0] * (1 - frac) + merged[i1] * frac;
  }
  return out;
}
