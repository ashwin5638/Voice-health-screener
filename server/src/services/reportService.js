import { synthesizeReport } from './llmService.js';

export async function buildReport(messages) {
  const generatedAt = new Date().toISOString();
  try {
    const report = await synthesizeReport(messages);
    return { ok: true, generatedAt, report };
  } catch (err) {
    console.error('[Report] Generation failed:', err);
    return {
      ok: false, generatedAt, error: err.message,
      report: {
        patient_name: 'unknown', chief_complaint: 'unknown', duration: 'unknown',
        severity: 'unknown', associated_symptoms: 'unknown',
        summary: 'Report generation failed. Please consult a healthcare professional.',
        language: 'unknown', red_flag: false,
        recommendation: 'Please consult a licensed healthcare provider.',
      },
    };
  }
}
