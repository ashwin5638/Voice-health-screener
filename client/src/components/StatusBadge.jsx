const STATUS_CONFIG = {
  IDLE: { label: 'Idle', color: '#6b7280' },
  LISTENING: { label: 'Listening', color: '#10b981' },
  TRANSCRIBING: { label: 'Transcribing', color: '#3b82f6' },
  THINKING: { label: 'Thinking', color: '#f59e0b' },
  SPEAKING: { label: 'Speaking', color: '#8b5cf6' },
  ERROR: { label: 'Error', color: '#ef4444' },
};

export default function StatusBadge({ status = 'IDLE' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE;
  const isLive = ['LISTENING', 'TRANSCRIBING', 'THINKING', 'SPEAKING'].includes(status);
  return (
    <div className="status-badge" style={{ '--status-color': cfg.color }}>
      <span className={`status-dot ${isLive ? 'pulse' : ''}`} />
      <span className="status-label">{cfg.label}</span>
    </div>
  );
}
