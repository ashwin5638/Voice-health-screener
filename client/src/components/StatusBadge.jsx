const STATUS_CONFIG = {
  IDLE: { label: 'Idle', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', pulse: '' },
  LISTENING: { label: 'Listening', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', pulse: 'pulse-emerald' },
  TRANSCRIBING: { label: 'Transcribing', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', pulse: 'pulse-blue' },
  THINKING: { label: 'Thinking', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', pulse: 'pulse-amber' },
  SPEAKING: { label: 'Speaking', bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', pulse: 'pulse-violet' },
  ERROR: { label: 'Error', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', pulse: 'pulse-red' },
};

const PULSE_STYLE = {
  'pulse-emerald': { animation: 'pulse-ring 1.4s ease-in-out infinite' },
  'pulse-blue': { animation: 'pulse-ring-blue 1.4s ease-in-out infinite' },
  'pulse-amber': { animation: 'pulse-ring-amber 1.4s ease-in-out infinite' },
  'pulse-violet': { animation: 'pulse-ring-violet 1.4s ease-in-out infinite' },
  'pulse-red': { animation: 'pulse-ring-red 1.4s ease-in-out infinite' },
};

export default function StatusBadge({ status = 'IDLE' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${cfg.bg} ${cfg.text}`}>
      <span
        className={`w-2 h-2 rounded-full ${cfg.dot}`}
        style={cfg.pulse ? PULSE_STYLE[cfg.pulse] : undefined}
      />
      <span>{cfg.label}</span>
    </div>
  );
}
