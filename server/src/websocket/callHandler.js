import { transcribeAudio, getSTTStatus } from '../services/sttService.js';
import { generateAgentReply } from '../services/llmService.js';
import { buildReport } from '../services/reportService.js';

const TARGET_SAMPLE_RATE = 16000;
const OPEN = 1;

export function createCallHandler(ws) {
  const session = {
    active: false, messages: [], language: null,
    audioQueue: [], processing: false, stopRequested: false,
  };

  ws.on('message', (data) => {
    let payload;
    try { payload = JSON.parse(data.toString()); }
    catch { sendError(ws, 'Invalid JSON payload'); return; }

    const { event } = payload;
    Promise.resolve().then(() => {
      switch (event) {
        case 'START_CALL':  return handleStartCall(ws, session);
        case 'AUDIO_CHUNK': return handleAudioChunk(ws, session, payload);
        case 'END_CALL':    return handleEndCall(ws, session);
        default:            sendError(ws, `Unknown event: ${event}`);
      }
    }).catch((err) => {
      console.error('[CallHandler] Handler error:', err);
      sendError(ws, err?.message || 'Internal error');
    });
  });

  ws.on('close', () => {
    session.active = false;
    session.stopRequested = true;
  });
}

async function handleStartCall(ws, session) {
  session.active = true; session.messages = []; session.language = null;
  session.audioQueue = []; session.processing = false; session.stopRequested = false;

  send(ws, 'STATUS', { status: 'THINKING', info: `STT: ${getSTTStatus()}` });
  const greeting = "Hello, I'm your preliminary health intake assistant. I'm not a doctor, but I'll ask a few quick questions to summarise your concern. To begin, what's your name?";
  session.messages.push({ role: 'assistant', content: greeting });
  send(ws, 'AGENT_TEXT', { text: greeting, language: 'en' });
  send(ws, 'STATUS', { status: 'SPEAKING' });
}

async function handleAudioChunk(ws, session, payload) {
  if (!session.active) return;
  const { audio, sampleRate } = payload;
  if (!Array.isArray(audio) || audio.length === 0) return;

  session.audioQueue.push({ audio: new Float32Array(audio), sampleRate: sampleRate || TARGET_SAMPLE_RATE });
  if (session.processing) return;

  session.processing = true;
  send(ws, 'STATUS', { status: 'TRANSCRIBING' });

  try {
    while (session.audioQueue.length > 0 && !session.stopRequested) {
      const item = session.audioQueue.shift();
      let pcm = item.audio;
      if (item.sampleRate !== TARGET_SAMPLE_RATE) pcm = resampleLinear(pcm, item.sampleRate, TARGET_SAMPLE_RATE);

      let transcript;
      try { transcript = await transcribeAudio(pcm); }
      catch (err) { sendError(ws, `Transcription failed: ${err.message}`); continue; }

      const text = (transcript?.text || '').trim();
      if (!text) {
        if (session.active && !session.stopRequested) send(ws, 'STATUS', { status: 'LISTENING' });
        continue;
      }

      if (transcript.language && transcript.language !== 'unknown') session.language = transcript.language;

      send(ws, 'TRANSCRIPT_UPDATE', { text, language: transcript.language, role: 'user' });
      send(ws, 'STATUS', { status: 'THINKING' });
      session.messages.push({ role: 'user', content: text });

      let agentReply;
      try { agentReply = await generateAgentReply(session.messages); }
      catch (err) {
        sendError(ws, `Assistant failed to respond: ${err.message}`);
        session.messages.pop();
        if (session.active && !session.stopRequested) send(ws, 'STATUS', { status: 'LISTENING' });
        continue;
      }

      session.messages.push({ role: 'assistant', content: agentReply });
      send(ws, 'AGENT_TEXT', { text: agentReply, language: session.language || 'en' });
      send(ws, 'STATUS', { status: 'SPEAKING' });
    }
  } catch (err) {
    sendError(ws, err?.message || 'Pipeline failure');
  } finally {
    session.processing = false;
  }
}

async function handleEndCall(ws, session) {
  session.active = false; session.stopRequested = true;
  send(ws, 'STATUS', { status: 'THINKING' });
  const report = await buildReport(session.messages);
  send(ws, 'FINAL_REPORT', report);
  send(ws, 'STATUS', { status: 'IDLE' });
}

function send(ws, event, data) {
  if (ws.readyState === OPEN) ws.send(JSON.stringify({ event, ...data }));
}
function sendError(ws, message) { send(ws, 'ERROR', { message }); }

function resampleLinear(input, fromRate, toRate) {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = idx - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}
