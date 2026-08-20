import OpenAI from 'openai';
import { env } from '../config/env.js';

const groq = new OpenAI({
  apiKey: env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

function pcmFloat32ToWavBlob(float32Array, sampleRate = 16000) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = int16.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  new Int16Array(buffer, 44).set(int16);

  return new File([buffer], 'audio.wav', { type: 'audio/wav' });
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

export async function transcribeAudio(audioBuffer) {
  if (!audioBuffer || audioBuffer.length === 0) return { text: '', language: 'unknown' };

  const wavFile = pcmFloat32ToWavBlob(audioBuffer, 16000);

  const result = await groq.audio.transcriptions.create({
    model: 'whisper-large-v3-turbo',
    file: wavFile,
    response_format: 'json',
  });

  const text = (result?.text || '').trim();
  return { text, language: 'en' };
}

export function getSTTStatus() {
  return env.GROQ_API_KEY ? 'ready' : 'no_api_key';
}
