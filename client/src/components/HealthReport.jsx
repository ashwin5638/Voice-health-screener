export default function HealthReport({ report }) {
  if (!report) return null;
  const r = report.report || {};

  const fields = [
    { label: 'Patient Name', value: r.patient_name },
    { label: 'Chief Complaint', value: r.chief_complaint },
    { label: 'Duration', value: r.duration },
    { label: 'Severity', value: r.severity },
    { label: 'Associated Symptoms', value: r.associated_symptoms },
    { label: 'Summary', value: r.summary },
    { label: 'Recommendation', value: r.recommendation },
    { label: 'Language', value: r.language },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Intake Summary</h3>

      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm mb-4">
        <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <span>This is an automated intake summary, <strong>NOT</strong> a medical diagnosis.</span>
      </div>

      {r.red_flag === true && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-800 font-semibold text-sm mb-4">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span>Red-flag symptom detected &mdash; seek immediate emergency medical care.</span>
        </div>
      )}

      {report.ok === false && (
        <div className="text-amber-600 text-sm mb-4">
          Report generation failed; showing fallback summary.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <dt className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</dt>
            <dd className="text-sm text-slate-800">{f.value || '\u2014'}</dd>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-400 text-right">
        Generated at: {new Date(report.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
