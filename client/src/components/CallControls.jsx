import { useEffect, useRef } from 'react';

const STATUS_COLOR = {
  LISTENING: '#10b981', SPEAKING: '#8b5cf6', TRANSCRIBING: '#3b82f6', THINKING: '#f59e0b', IDLE: '#6b7280',
};

export default function CallControls({ callActive, status, onToggleCall, disabled }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf; let t = 0;
    const draw = () => {
      const w = canvas.width; const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const active = callActive && ['LISTENING', 'SPEAKING', 'TRANSCRIBING', 'THINKING'].includes(status);
      const color = STATUS_COLOR[status] || STATUS_COLOR.IDLE;
      const amp = active ? 1 : 0.18;
      ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.beginPath();
      const bars = 36;
      for (let i = 0; i < bars; i++) {
        const x = (i + 0.5) * (w / bars);
        const phase = i * 0.32 + t;
        const height = amp * (Math.sin(phase) * 0.5 + 0.5) * h * 0.42 + 2;
        ctx.moveTo(x, h / 2 - height); ctx.lineTo(x, h / 2 + height);
      }
      ctx.stroke();
      t += 0.18;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [callActive, status]);

  return (
    <div className="call-controls">
      <button className={`call-btn ${callActive ? 'active' : ''}`} onClick={onToggleCall} disabled={disabled}>
        {callActive ? '■ End Call' : '● Start Call'}
      </button>
      <canvas ref={canvasRef} width={320} height={64} className="visualizer" />
    </div>
  );
}
