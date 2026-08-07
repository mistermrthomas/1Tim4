import {
  DEFAULT_FORMATION_REFLECT_PROMPT,
  DEFAULT_FORMATION_REFLECT_PROMPT_VERSION,
} from '../../shared/defaultFormationReflectPrompt.js';
import { resolveSermonPlanModel } from '../../shared/aiModels.js';
import { createOpenAIClient, resolveOpenAIModelId } from '../_lib/openaiClient.js';

type VercelRequest = { method?: string; body?: unknown };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

interface RequestBody {
  scriptureReference?: string;
  scriptureText?: string;
  sermonTitle?: string;
  sermonCentralTruth?: string;
  sermonNotes?: string;
  observation?: string;
  priorJournal?: string;
  /** Editable system prompt from Settings (falls back to default). */
  reflectPrompt?: string;
}

const MAX_PROMPT = 12_000;

function truncate(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, max);
}

function extractOutputText(response: { output_text?: string; output?: unknown[] }): string {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }
  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    const row = item as { type?: string; content?: Array<{ type?: string; text?: string }> };
    if (row.type !== 'message') continue;
    for (const part of row.content ?? []) {
      if (part.type === 'output_text' && part.text) chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const client = createOpenAIClient();
  if (!client) {
    res.status(503).json({
      error: 'AI guidance is not configured.',
      code: 'MISSING_CONFIGURATION',
    });
    return;
  }

  let body: RequestBody;
  try {
    body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as RequestBody)
        : ((req.body ?? {}) as RequestBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body', code: 'INVALID_INPUT' });
    return;
  }

  const observation = truncate(body.observation, 4_000);
  if (observation.length < 8) {
    res.status(400).json({
      error: 'Write an observation first.',
      code: 'INVALID_INPUT',
    });
    return;
  }

  const scriptureReference = truncate(body.scriptureReference, 160);
  const scriptureText = truncate(body.scriptureText, 8_000);
  const sermonTitle = truncate(body.sermonTitle, 200);
  const sermonCentralTruth = truncate(body.sermonCentralTruth, 500);
  const sermonNotes = truncate(body.sermonNotes, 6_000);
  const priorJournal = truncate(body.priorJournal, 3_000);
  const system = (
    truncate(body.reflectPrompt, MAX_PROMPT) || DEFAULT_FORMATION_REFLECT_PROMPT
  ).slice(0, MAX_PROMPT);

  const model = resolveOpenAIModelId(resolveSermonPlanModel(null, process.env.OPENAI_MODEL));

  const user = [
    `Scripture reference: ${scriptureReference || '(not provided)'}`,
    scriptureText ? `Scripture text (approved translation excerpt):\n${scriptureText}` : '',
    sermonTitle ? `Sermon title: ${sermonTitle}` : '',
    sermonCentralTruth ? `Sermon central truth: ${sermonCentralTruth}` : '',
    sermonNotes ? `Sermon notes (excerpt):\n${sermonNotes}` : '',
    priorJournal ? `Earlier journal notes this week (excerpt):\n${priorJournal}` : '',
    `User observation (what stood out):\n${observation}`,
    '',
    'Ask one excellent follow-up question.',
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const response = await client.responses.create({
      model,
      temperature: 0.5,
      max_output_tokens: 120,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    let question = extractOutputText(response)
      .replace(/^["“]|["”]$/g, '')
      .replace(/^\s*\d+[.)]\s*/, '')
      .trim();
    if (!question.endsWith('?')) {
      const firstQ = question.split('?')[0]?.trim();
      question = firstQ ? `${firstQ}?` : question;
    }
    if (question.length < 8) {
      res.status(502).json({
        error: 'Could not form a reflection question. Try again.',
        code: 'INVALID_AI_OUTPUT',
      });
      return;
    }
    res.status(200).json({
      question: question.slice(0, 280),
      modelUsed: model,
      promptVersion: DEFAULT_FORMATION_REFLECT_PROMPT_VERSION,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN';
    console.error('formation-reflect failed', message.slice(0, 200));
    if (/\b429\b|rate.?limit/i.test(message)) {
      res.status(429).json({ error: 'Rate limited. Try again shortly.', code: 'RATE_LIMIT' });
      return;
    }
    res.status(500).json({
      error: 'Reflection guidance failed. Your observation is still saved.',
      code: 'SERVER_ERROR',
    });
  }
}
