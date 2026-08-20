import { pipeline, env as transformersEnv } from '@huggingface/transformers';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

transformersEnv.allowLocalModels = false;

const MODEL_CACHE_DIR = join(
  transformersEnv.cacheDir || join(process.cwd(), 'node_modules', '@huggingface', 'transformers', '.cache'),
  'onnx-community',
  'whisper-large-v3-turbo',
);

let transcriber = null;
let loadingPromise = null;

async function clearModelCache() {
  try {
    await rm(MODEL_CACHE_DIR, { recursive: true, force: true });
    console.log('[STT] Cleared corrupted model cache.');
  } catch {
    console.warn('[STT] Could not clear model cache directory.');
  }
}

async function loadModel(attempt = 1, maxAttempts = 3) {
  if (transcriber) return transcriber;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    for (let i = attempt; i <= maxAttempts; i++) {
      try {
        console.log(`[STT] Loading whisper-large-v3-turbo (attempt ${i}/${maxAttempts})...`);
        transcriber = await pipeline(
          'automatic-speech-recognition',
          'onnx-community/whisper-large-v3-turbo',
          {
            dtype: {
              encoder_model: 'q8',
              decoder_model: 'q8',
              decoder_model_merged: 'q8',
            },
            device: 'cpu',
            progress_callback: (info) => {
              if (info?.status === 'progress') {
                console.log(`[STT] ${info.file}: ${(info.progress || 0).toFixed(1)}%`);
              }
            },
          }
        );
        console.log('[STT] Whisper model ready.');
        return transcriber;
      } catch (err) {
        const isCorrupt =
          err.message?.includes('Protobuf parsing failed') ||
          err.message?.includes('invalid') ||
          err.message?.includes('truncated');
        console.error(`[STT] Load attempt ${i} failed: ${err.message}`);
        if (isCorrupt && i < maxAttempts) {
          console.log('[STT] Model cache may be corrupted. Clearing and retrying...');
          transcriber = null;
          loadingPromise = null;
          await clearModelCache();
        } else if (i >= maxAttempts) {
          throw err;
        }
      }
    }
  })();

  return loadingPromise;
}

loadModel().catch((err) => {
  console.error('[STT] Background load failed; will retry on first request:', err.message);
  loadingPromise = null;
});

const LANG_NAME_TO_CODE = {
  english: 'en', hindi: 'hi', bengali: 'bn', tamil: 'ta', telugu: 'te',
  marathi: 'mr', gujarati: 'gu', kannada: 'kn', malayalam: 'ml', punjabi: 'pa',
  urdu: 'ur', spanish: 'es', french: 'fr', german: 'de', chinese: 'zh',
  arabic: 'ar', japanese: 'ja', russian: 'ru',
};

function detectLanguageFromText(text) {
  if (!text) return 'unknown';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/^[A-Za-z0-9\s.,!?'"'-]+$/.test(text)) return 'en';
  return 'unknown';
}

function normalizeLanguage(lang) {
  if (!lang) return 'unknown';
  const k = String(lang).toLowerCase();
  if (LANG_NAME_TO_CODE[k]) return LANG_NAME_TO_CODE[k];
  if (k.length >= 2) return k.slice(0, 2);
  return 'unknown';
}

export async function transcribeAudio(audioBuffer) {
  if (!audioBuffer || audioBuffer.length === 0) return { text: '', language: 'unknown' };
  try {
    const pipe = await loadModel();
    const output = await pipe(audioBuffer, {
      language: null,
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
      frequency_penalty: 0.0,
      condition_on_previous_text: false,
    });
    const text = (output?.text || '').trim();
    let language = normalizeLanguage(output?.language);
    if (language === 'unknown' || !language) language = detectLanguageFromText(text);
    return { text, language };
  } catch (err) {
    const isModelLoadErr = err.message?.includes('Protobuf parsing failed') || err.message?.includes('Load model');
    if (isModelLoadErr) {
      console.error('[STT] Model load failed during transcription, clearing state for retry:', err.message);
      transcriber = null;
      loadingPromise = null;
    }
    console.error('[STT] Transcription error:', err);
    throw new Error(`Transcription failed: ${err.message}`);
  }
}

export function getSTTStatus() {
  if (transcriber) return 'ready';
  if (loadingPromise) return 'loading';
  return 'idle';
}
