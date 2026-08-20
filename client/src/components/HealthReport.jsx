export default function HealthReport({ report }) {
  if (!report) return null;
  const r = report.report || {};
  return (
    <div className="health-report">
      <h3>Intake Summary</h3>
      <p className="report-disclaimer">⚠️ This is an automated intake summary, NOT a medical diagnosis.</p>
      {r.red_flag === true && <div className="red-flag">🚨 Red-flag symptom detected — seek immediate emergency medical care.</div>}
      {report.ok === false && <div className="warn">⚠️ Report generation failed; showing fallback summary.</div>}
      <dl className="report-grid">
        <dt>Patient Name</dt><dd>{r.patient_name || '—'}</dd>
        <dt>Chief Complaint</dt><dd>{r.chief_complaint || '—'}</dd>
        <dt>Duration</dt><dd>{r.duration || '—'}</dd>
        <dt>Severity</dt><dd>{r.severity || '—'}</dd>
        <dt>Associated Symptoms</dt><dd>{r.associated_symptoms || '—'}</dd>
        <dt>Summary</dt><dd>{r.summary || '—'}</dd>
        <dt>Recommendation</dt><dd>{r.recommendation || '—'}</dd>
        <dt>Language</dt><dd>{r.language || '—'}</dd>
      </dl>
      <p className="report-timestamp">Generated at: {new Date(report.generatedAt).toLocaleString()}</p>
    </div>
  );
}
