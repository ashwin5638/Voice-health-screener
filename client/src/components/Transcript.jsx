export default function Transcript({ messages = [] }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Live Transcript</h3>
      <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
        {messages.length === 0 && (
          <div className="text-slate-400 italic text-center py-12">
            Start a call to begin the conversation&hellip;
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] leading-relaxed text-sm ${
              m.role === 'user'
                ? 'self-end'
                : 'self-start'
            }`}
          >
            <span className={`inline-block text-[0.6rem] font-semibold uppercase tracking-wider mb-1 ${
              m.role === 'user' ? 'text-blue-500' : 'text-violet-500'
            }`}>
              {m.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <div className={`px-4 py-3 rounded-2xl ${
              m.role === 'user'
                ? 'bg-blue-50 border border-blue-200 text-blue-900 rounded-br-sm'
                : 'bg-violet-50 border border-violet-200 text-violet-900 rounded-bl-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
