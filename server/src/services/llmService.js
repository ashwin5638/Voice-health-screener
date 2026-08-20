import OpenAI from 'openai';
import { env } from '../config/env.js';

// Gemini client (primary)
const geminiClient = new OpenAI({
  baseURL: env.GEMINI_BASE_URL,
  apiKey: env.GEMINI_API_KEY,
});

// OpenRouter client (fallback)
const openrouterClient = new OpenAI({
  baseURL: env.OPENROUTER_BASE_URL,
  apiKey: env.OPENROUTER_API_KEY,
  defaultHeaders: { 'HTTP-Referer': env.CLIENT_URL, 'X-Title': 'Voice Health Screener' },
});

// Provider priority: Gemini first, then OpenRouter
const providers = [
  { name: 'Gemini', client: geminiClient, model: env.GEMINI_MODEL, key: env.GEMINI_API_KEY },
  { name: 'OpenRouter', client: openrouterClient, model: env.OPENROUTER_MODEL, key: env.OPENROUTER_API_KEY },
];

const SYSTEM_PROMPT = `You are SwasthSaathi, an empathetic preliminary voice-based health intake assistant.

# Your Role
- You are a SCREENING assistant.
- You collect information to help a human clinician later; you NEVER diagnose and NEVER prescribe.
- Be warm, calm, respectful, and brief.

# Language Rules
- The user may speak in English or Hindi (Devanagari or romanized).
- ALWAYS reply in the SAME language AND script the user just used.
- If they switch languages mid-conversation, you switch with them on the very next turn.

# Conversation Rules
- Ask ONLY ONE question at a time.
- Keep every reply SHORT: 1-2 short sentences max, because the reply is spoken aloud.
- Briefly acknowledge what the user said, then ask the next question.
- If an answer is vague (e.g. "some days", "a lot"), ask ONE focused follow-up.
- Do NOT read from a fixed script; adapt to the user's actual words.
- Do NOT use markdown, asterisks, bullet points, parentheses, or stage directions.
- Do NOT prefix replies with "Assistant:" or any label.

# Information to collect (adapt order if needed, but cover all)
1. Patient's name
2. Main concern / chief complaint
3. Onset / duration (when it started, how long)
4. Severity (mild / moderate / severe, or a 1-10 number)
5. Any other associated symptoms

# Closing
- Once you have all five pieces, give a 1-sentence summary and tell the user the intake is complete and a report will be shown.
- Do not generate the structured report yourself; the server does that.

# Safety / Red Flags
- Never claim to diagnose.
- If the user describes RED FLAG symptoms -- chest pain, difficulty breathing, severe bleeding, loss of consciousness, suicidal thoughts, severe allergic reaction, stroke signs (face drooping, one-sided weakness, slurred speech), severe high fever in an infant, seizure -- STOP normal intake and clearly tell them to seek immediate emergency medical care (call 108 in India or go to the nearest emergency room). Do not continue routine questions.`;

// Call LLM with automatic provider fallback
async function callWithFallback(systemPrompt, messages, options = {}) {
  for (const provider of providers) {
    if (!provider.key) continue;

    try {
      const completion = await provider.client.chat.completions.create({
        model: provider.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: options.temperature ?? 0.6,
        max_tokens: options.max_tokens ?? 220,
      });

      const text = (completion?.choices?.[0]?.message?.content || '').trim();
      if (text) {
        console.log(`[LLM] ${provider.name} responded successfully`);
        return text;
      }
      console.warn(`[LLM] ${provider.name} returned empty response, trying next...`);
    } catch (err) {
      const status = err.status || err.statusCode;
      if (status === 429 || status === 401) {
        console.warn(`[LLM] ${provider.name} failed (${status}), trying next provider...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('All LLM providers failed or are unavailable.');
}

export async function generateAgentReply(messages) {
  if (!env.GEMINI_API_KEY && !env.OPENROUTER_API_KEY) {
    throw new Error('No LLM API keys configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.');
  }

  const text = await callWithFallback(SYSTEM_PROMPT, messages, {
    temperature: 0.6,
    max_tokens: 220,
  });

  if (!text) throw new Error('Empty reply from LLM.');
  return text;
}

export async function synthesizeReport(messages) {
  if (!env.GEMINI_API_KEY && !env.OPENROUTER_API_KEY) {
    throw new Error('No LLM API keys configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.');
  }

  const userTurns = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const prompt = `Below is a transcript of a preliminary health intake conversation.
Produce a concise structured intake report as JSON ONLY (no prose, no markdown fences).

Conversation:
 ${userTurns.map((t, i) => `User ${i + 1}: ${t}`).join('\n')}

Return JSON with EXACTLY these keys:
{
  "patient_name": "string or unknown",
  "chief_complaint": "string",
  "duration": "string",
  "severity": "string",
  "associated_symptoms": "string or none",
  "summary": "1-2 sentence summary in the user's language",
  "language": "en or hi",
  "red_flag": true or false,
  "recommendation": "next steps in the user's language"
}`;

  const raw = await callWithFallback(
    'You are a medical scribe. Output only valid JSON, no markdown, no commentary.',
    [{ role: 'user', content: prompt }],
    { temperature: 0.2, max_tokens: 500 },
  );

  return parseJsonLoose(raw);
}

function parseJsonLoose(raw) {
  if (!raw) return { parse_error: true, raw: '' };
  try { return JSON.parse(raw); } catch {}
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) { try { return JSON.parse(raw.substring(start, end + 1)); } catch {} }
  return { parse_error: true, raw };
}
