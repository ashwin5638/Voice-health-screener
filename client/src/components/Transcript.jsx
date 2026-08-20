export default function Transcript({ messages = [] }) {
  return (
    <div className="transcript">
      <h3>Live Transcript</h3>
      <div className="transcript-list">
        {messages.length === 0 && <div className="transcript-empty">Start a call to begin the conversation…</div>}
        {messages.map((m, i) => (
          <div key={i} className={`message message-${m.role}`}>
            <span className="message-role">{m.role === 'user' ? 'You' : 'Assistant'}</span>
            <span className="message-text">{m.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
