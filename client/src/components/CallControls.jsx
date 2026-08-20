import { useEffect, useRef } from 'react';

const STATUS_COLOR = {
  LISTENING: '#10b981', SPEAKING: '#8b5cf6', TRANSCRIBING: '#3b82f6', THINKING: '#f59e0b', IDLE: '#94a3b8',
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
      const amp = active ? 1 : 0.15;
      ctx.lineWidth = 2.5; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.beginPath();
      const bars = 36;
      for (let i = 0; i < bars; i++) {
        const x = (i + 0.5) * (w / bars);
        const phase = i * 0.32 + t;
        const height = amp * (Math.sin(phase) * 0.5 + 0.5) * h * 0.4 + 2;
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
    <div className="flex flex-col gap-4">
      <button
        className={`w-full px-6 py-4 text-base font-semibold rounded-full border-none cursor-pointer text-white transition-all duration-200 ${
          callActive
            ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/25'
            : 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/25'
        } ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none' : ''}`}
        onClick={onToggleCall}
        disabled={disabled}
      >
        {callActive ? '■ End Call' : '● Start Call'}
      </button>
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
        <canvas ref={canvasRef} width={300} height={56} className="w-full h-14" />
      </div>
    </div>
  );
}
