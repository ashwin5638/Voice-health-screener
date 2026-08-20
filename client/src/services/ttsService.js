let cachedVoices = [];
let onSpeechEndCb = null;

function isAvailable() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }
function loadVoices() {
  if (!isAvailable()) return [];
  const v = window.speechSynthesis.getVoices();
  if (v && v.length) cachedVoices = v;
  return cachedVoices;
}
if (isAvailable()) { loadVoices(); window.speechSynthesis.onvoiceschanged = () => { cachedVoices = window.speechSynthesis.getVoices(); }; }

function pickVoice(language) {
  const voices = loadVoices();
  if (!voices.length) return null;
  const isHindi = (l) => l === 'hi' || l === 'hi-IN' || l?.startsWith('hi');
  const prefs = isHindi(language) ? ['hi-IN', 'hi', 'hin-IN', 'hin'] : ['en-IN', 'en-GB', 'en-AU', 'en-US', 'en'];
  for (const p of prefs) { const exact = voices.find((v) => v.lang === p); if (exact) return exact; }
  for (const p of prefs) { const starts = voices.find((v) => v.lang?.startsWith(p)); if (starts) return starts; }
  return voices[0];
}

export function isTTSAvailable() { return isAvailable(); }
export function setOnSpeechEnd(cb) { onSpeechEndCb = cb; }

export function speakText(text, language = 'en-IN') {
  if (!isAvailable()) { onSpeechEndCb?.(); return; }
  try { window.speechSynthesis.cancel(); } catch {}
  const clean = (text || '').trim();
  if (!clean) { onSpeechEndCb?.(); return; }
  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice(language);
  if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
  else { utterance.lang = (language === 'hi' || language === 'hi-IN') ? 'hi-IN' : 'en-IN'; }
  utterance.rate = 0.95; utterance.pitch = 1.0; utterance.volume = 1.0;
  utterance.onend = () => onSpeechEndCb?.();
  utterance.onerror = (e) => { console.error('[TTS] Error:', e); onSpeechEndCb?.(); };
  try { window.speechSynthesis.resume(); window.speechSynthesis.speak(utterance); }
  catch (e) { console.error('[TTS] speak() threw:', e); onSpeechEndCb?.(); }
}
export function stopSpeaking() { if (!isAvailable()) return; try { window.speechSynthesis.cancel(); } catch {} }
