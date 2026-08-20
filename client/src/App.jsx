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
    <div className="app">
      <header className="app-header">
        <h1>🩺 Voice Health Screener</h1>
        <p className="app-subtitle">A preliminary AI intake assistant — not a substitute for professional medical advice.</p>
      </header>
      <main className="app-main">
        <section className="left-panel">
          <div className="control-row">
            <StatusBadge status={status} />
            <span className={`ws-indicator ${wsReady ? 'ok' : 'bad'}`}>{wsReady ? 'WS: connected' : 'WS: connecting…'}</span>
          </div>
          <CallControls callActive={callActive} status={status} onToggleCall={toggleCall} disabled={!wsReady && !callActive} />
          {globalError && <div className="error-banner">{globalError}</div>}
          {recorder.error && <div className="error-banner">{recorder.error}</div>}
          <p className="hint">Speak in <strong>English</strong> or <strong>Hindi</strong>. Pause briefly after each reply.</p>
        </section>
        <section className="right-panel">
          <Transcript messages={transcript} />
          {report && <HealthReport report={report} />}
        </section>
      </main>
      <footer className="app-footer"><small>STT: Whisper Large-v3 Turbo (Transformers.js) · LLM: OpenRouter · TTS: Browser SpeechSynthesis</small></footer>
    </div>
  );
}
