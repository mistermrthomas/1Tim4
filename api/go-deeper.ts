import { parseScriptureReference } from '../shared/parseReference';
import { getStudyLinksForReference } from '../shared/studyLinks';

interface RequestBody {
  reference?: string;
  verseText?: string;
  trainingFocusTitle?: string;
}

interface KeyWordPayload {
  term: string;
  original: string;
  transliteration?: string;
  gloss: string;
}

interface AiPayload {
  setting: string;
  background: string;
  keyWords: KeyWordPayload[];
  crossReferences: string[];
  reflectionQuestion: string;
}

const MAX_TEXT = 1200;
const MAX_BODY = 16_000;

const SYSTEM_PROMPT = `You are a conservative Bible study aide for the Path formation app.
The user reads the NASB. Provide grounded historical and literary background — not a sermon.
Rules:
- Stay tied to the passage given; do not invent verses or Strong's numbers.
- For Greek/Hebrew: only include 2–4 words that are especially significant in THIS passage; give original script or transliteration, short gloss.
- "setting" = where/when/who audience (2–4 sentences). "background" = what is happening in the story or letter (2–4 sentences).
- crossReferences: up to 4 related references as strings (e.g. "Romans 8:28").
- reflectionQuestion: one thoughtful question for personal application (not yes/no).
- If uncertain, say so briefly instead of guessing.
- No doctrinal controversy; mainstream evangelical scholarship tone.
Respond JSON only:
{"setting":"...","background":"...","keyWords":[{"term":"","original":"","transliteration":"","gloss":""}],"crossReferences":[],"reflectionQuestion":"..."}`;

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function parseAi(content: string): AiPayload | null {
  try {
    const p = JSON.parse(content) as AiPayload;
    if (!p.setting || !p.background) return null;
    if (!Array.isArray(p.keyWords)) p.keyWords = [];
    if (!Array.isArray(p.crossReferences)) p.crossReferences = [];
    return {
      setting: truncate(String(p.setting), 900),
      background: truncate(String(p.background), 900),
      keyWords: p.keyWords.slice(0, 5).map((w) => ({
        term: truncate(String(w.term ?? ''), 80),
        original: truncate(String(w.original ?? ''), 80),
        transliteration: w.transliteration ? truncate(String(w.transliteration), 80) : undefined,
        gloss: truncate(String(w.gloss ?? ''), 200),
      })),
      crossReferences: p.crossReferences.slice(0, 6).map((r) => truncate(String(r), 40)),
      reflectionQuestion: truncate(String(p.reflectionQuestion ?? ''), 300),
    };
  } catch {
    return null;
  }
}

type VercelRequest = { method?: string; body?: unknown };
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
    res.status(503).json({ error: 'Go deeper not configured' });
    return;
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as RequestBody;
  const reference = body?.reference?.trim();
  if (!reference || reference.length < 4) {
    res.status(400).json({ error: 'Reference required' });
    return;
  }

  if (JSON.stringify(body).length > MAX_BODY) {
    res.status(413).json({ error: 'Payload too large' });
    return;
  }

  const parsed = parseScriptureReference(reference);
  const studyLinks = getStudyLinksForReference(reference);
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  let userPrompt = `Passage: ${reference}`;
  if (parsed) {
    userPrompt += `\nParsed: ${parsed.book}, chapter ${parsed.chapter}${parsed.verse ? `, verse ${parsed.verse}` : ''}`;
  }
  if (body.verseText) {
    userPrompt += `\nNASB text provided by user:\n${truncate(body.verseText, MAX_TEXT)}`;
  }
  if (body.trainingFocusTitle) {
    userPrompt += `\nUser's current training focus: ${truncate(body.trainingFocusTitle, 120)}`;
  }

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
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!openAiRes.ok) {
      console.error('go-deeper OpenAI', openAiRes.status);
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

    const ai = parseAi(content);
    if (!ai) {
      res.status(502).json({ error: 'Invalid AI response' });
      return;
    }

    res.status(200).json({
      reference,
      ...ai,
      disclaimer:
        'Study aid — confirm with Scripture, your leaders, and trusted commentaries. AI may miss nuance.',
      source: 'ai',
      studyLinks,
    });
  } catch (err) {
    console.error('go-deeper', err);
    res.status(500).json({ error: 'Go deeper failed' });
  }
}
