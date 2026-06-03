import {
  ASSESSMENT_FOCUS_KEYS,
  FOCUS_KEY_TITLES,
  isValidAssessmentFocusKey,
} from '../shared/assessmentFocusKeys';
import { ASSESSMENT_QUESTION_LABELS } from '../shared/assessmentQuestionLabels';

interface RuleSuggestionPayload {
  focusKey?: string;
  whyFocus?: string;
  focusTitle?: string;
}

interface RequestBody {
  answers?: Record<string, string>;
  ruleSuggestion?: RuleSuggestionPayload;
}

interface AiResult {
  focusKey: string;
  whyFocus: string;
}

const MAX_ANSWER_LEN = 900;
const MAX_BODY_BYTES = 48_000;

const SYSTEM_PROMPT = `You help Christians map a first "training season" for the Path spiritual formation app.
Tone: warm field-guide companion — not clinical therapy, not moralizing, no scores or grades.
You must choose exactly one focusKey from the allowed list.
Write whyFocus as 2–4 short sentences in second person ("you"). Name themes from their intake without long verbatim quotes.
Do not assign Bible verses or reading plans — only focusKey and whyFocus.
If a rule-based hint is provided, you may agree or choose a better fit from the list with clear reasoning.
Respond with JSON only: {"focusKey":"...","whyFocus":"..."}`;

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatIntake(answers: Record<string, string>): string {
  const lines: string[] = [];
  for (const [id, raw] of Object.entries(answers)) {
    const answer = truncate(String(raw ?? ''), MAX_ANSWER_LEN);
    if (!answer) continue;
    const label = ASSESSMENT_QUESTION_LABELS[id] ?? id;
    lines.push(`- ${label}\n  ${answer}`);
  }
  return lines.join('\n\n');
}

function buildUserPrompt(answers: Record<string, string>, rule?: RuleSuggestionPayload): string {
  const focusList = ASSESSMENT_FOCUS_KEYS.map(
    (k) => `${k} (${FOCUS_KEY_TITLES[k]})`,
  ).join(', ');

  let prompt = `Allowed focusKey values: ${focusList}\n\nIntake answers:\n${formatIntake(answers)}`;

  if (rule?.focusKey && isValidAssessmentFocusKey(rule.focusKey)) {
    prompt += `\n\nRule-based hint (optional): focusKey "${rule.focusKey}" (${rule.focusTitle ?? FOCUS_KEY_TITLES[rule.focusKey]}).`;
    if (rule.whyFocus) {
      prompt += ` Summary: ${truncate(rule.whyFocus, 400)}`;
    }
  }

  return prompt;
}

function parseAiJson(content: string): AiResult | null {
  try {
    const parsed = JSON.parse(content) as AiResult;
    if (!parsed?.focusKey || !parsed?.whyFocus) return null;
    const whyFocus = truncate(String(parsed.whyFocus), 1200);
    if (whyFocus.length < 40) return null;
    if (!isValidAssessmentFocusKey(parsed.focusKey)) return null;
    return { focusKey: parsed.focusKey, whyFocus };
  } catch {
    return null;
  }
}

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI assessment not configured' });
    return;
  }

  const rawBody = req.body;
  const body: RequestBody =
    typeof rawBody === 'string'
      ? (JSON.parse(rawBody) as RequestBody)
      : (rawBody as RequestBody);

  const answers = body?.answers;
  if (!answers || typeof answers !== 'object') {
    res.status(400).json({ error: 'Missing answers' });
    return;
  }

  const bodySize = JSON.stringify(body).length;
  if (bodySize > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'Payload too large' });
    return;
  }

  const hasContent = Object.values(answers).some((v) => String(v ?? '').trim().length > 2);
  if (!hasContent) {
    res.status(400).json({ error: 'No assessment answers provided' });
    return;
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  try {
    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(answers, body.ruleSuggestion) },
        ],
      }),
    });

    if (!openAiRes.ok) {
      console.error('OpenAI error', openAiRes.status, await openAiRes.text());
      res.status(502).json({ error: 'AI provider error' });
      return;
    }

    const completion = (await openAiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: 'Empty AI response' });
      return;
    }

    const result = parseAiJson(content);
    if (!result) {
      res.status(502).json({ error: 'Invalid AI response shape' });
      return;
    }

    res.status(200).json({ ...result, source: 'ai' });
  } catch (err) {
    console.error('assessment-plan handler', err);
    res.status(500).json({ error: 'Assessment guidance failed' });
  }
}
