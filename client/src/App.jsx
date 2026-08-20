import { useCallback, useEffect, useRef, useState } from 'react';
import CallControls from './components/CallControls.jsx';
import StatusBadge from './components/StatusBadge.jsx';
import Transcript from './components/Transcript.jsx';
import HealthReport from './components/HealthReport.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useAudioRecorder } from './hooks/useAudioRecorder.js';
import { speakText, stopSpeaking, isTTSAvailable, setOnSpeechEnd } from './services/ttsService.js';

export default function App() {
  const [status, setStatus] = useState('IDLE');
  const [transcript, setTranscript] = useState([]);
  const [report, setReport] = useState(null);
  const [globalError, setGlobalError] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const speakingRef = useRef(false);
  const callActiveRef = useRef(false);
  callActiveRef.current = callActive;

  useEffect(() => {
    setOnSpeechEnd(() => {
      speakingRef.current = false;
      if (callActiveRef.current) setStatus((prev) => (prev === 'SPEAKING' ? 'LISTENING' : prev));
    });
    return () => { setOnSpeechEnd(null); stopSpeaking(); };
  }, []);

  const handleMessage = useCallback((msg) => {
    const { event, ...rest } = msg;
    switch (event) {
      case 'STATUS':
        if (rest.status === 'SPEAKING') { speakingRef.current = true; setStatus('SPEAKING'); }
        else if (rest.status === 'LISTENING') { if (!speakingRef.current) setStatus('LISTENING'); }
        else setStatus(rest.status);
        break;
      case 'TRANSCRIPT_UPDATE':
        setTranscript((prev) => [...prev, { role: 'user', text: rest.text, language: rest.language }]);
        break;
      case 'AGENT_TEXT':
        setTranscript((prev) => [...prev, { role: 'agent', text: rest.text, language: rest.language }]);
        speakingRef.current = true;
        setStatus('SPEAKING');
        if (isTTSAvailable()) speakText(rest.text, rest.language === 'hi' ? 'hi-IN' : 'en-IN');
        else setTimeout(() => { speakingRef.current = false; if (callActiveRef.current) setStatus('LISTENING'); }, Math.max(1500, rest.text?.length * 60));
        break;
      case 'FINAL_REPORT':
        setReport(rest); speakingRef.current = false; stopSpeaking();
        break;
      case 'ERROR':
        setGlobalError(rest.message || 'Unknown error');
        break;
      default: break;
    }
  }, []);

  const { ready: wsReady, send } = useWebSocket({ onMessage: handleMessage });

  const handleAudioUtterance = useCallback((pcm, sampleRate) => {
    if (speakingRef.current) return;
    send({ event: 'AUDIO_CHUNK', audio: Array.from(pcm), sampleRate });
  }, [send]);

  const recorder = useAudioRecorder({
    onUtterance: handleAudioUtterance,
    onStatus: (s) => setStatus((prev) => (['SPEAKING', 'THINKING', 'TRANSCRIBING'].includes(prev) ? prev : s)),
  });

  const toggleCall = useCallback(async () => {
    setGlobalError(null);
    if (callActive) {
      stopSpeaking(); await recorder.stop(); send({ event: 'END_CALL' });
      setCallActive(false); speakingRef.current = false; return;
    }
    if (!wsReady) { setGlobalError('Not connected to server yet.'); return; }
    setReport(null); setTranscript([]);
    send({ event: 'START_CALL' });
    const ok = await recorder.start();
    if (!ok) { setGlobalError(recorder.error || 'Failed to start mic'); return; }
    setCallActive(true);
  }, [callActive, recorder, send, wsReady]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 sm:text-4xl">Voice Health Screener</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-lg mx-auto">
            A preliminary AI intake assistant &mdash; not a substitute for professional medical advice.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-fit lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-6">
              <StatusBadge status={status} />
              <span className={`text-xs font-medium ${wsReady ? 'text-emerald-600' : 'text-red-500'}`}>
                {wsReady ? 'Connected' : 'Connecting\u2026'}
              </span>
            </div>

            <CallControls callActive={callActive} status={status} onToggleCall={toggleCall} disabled={!wsReady && !callActive} />

            {globalError && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {globalError}
              </div>
            )}
            {recorder.error && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {recorder.error}
              </div>
            )}

            <p className="mt-5 text-xs text-slate-400 leading-relaxed">
              Speak in <span className="font-semibold text-slate-600">English</span> or <span className="font-semibold text-slate-600">Hindi</span>. Pause briefly after each reply.
            </p>
          </section>

          <section className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col flex-1 min-h-[400px]">
              <Transcript messages={transcript} />
            </div>
            {report && <HealthReport report={report} />}
          </section>
        </main>

        <footer className="text-center mt-10 pb-6">
          <p className="text-xs text-slate-400">
            STT: Whisper Large-v3 Turbo (Transformers.js) &middot; LLM: OpenRouter &middot; TTS: Browser SpeechSynthesis
          </p>
        </footer>
      </div>
    </div>
  );
}
