type VercelRequest = { method?: string; body?: unknown };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

interface RequestBody {
  book?: string;
  chapter?: number;
  trainingFocusTitle?: string;
}

interface QuestionPayload {
  id: string;
  text: string;
}

const SYSTEM_PROMPT = `You write reflection questions for Christians after they read a Bible chapter in the NASB.
Rules:
- Provide exactly 4 questions as JSON: {"questions":[{"id":"rq1","text":"..."}, ...]}
- Questions must be grounded in the specific chapter's themes, narrative, or teaching — not generic devotionals.
- Mix observation ("What does…"), application ("Where might you…"), and response to God ("What will you…").
- No trick questions, no academic jargon, warm field-guide tone.
- Do not quote long Scripture blocks; reference events or ideas from the chapter.
- ids must be rq1, rq2, rq3, rq4.`;

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
    res.status(503).json({ error: 'Reading questions not configured' });
    return;
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as RequestBody;
  const book = body?.book?.trim();
  const chapter = body?.chapter;

  if (!book || !chapter || chapter < 1) {
    res.status(400).json({ error: 'book and chapter required' });
    return;
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  let userPrompt = `Chapter to reflect on: ${book} ${chapter} (NASB).`;
  if (body.trainingFocusTitle) {
    userPrompt += `\nReader's training focus: ${body.trainingFocusTitle.slice(0, 120)}. Weave one question toward that focus if natural.`;
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
        temperature: 0.45,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!openAiRes.ok) {
      res.status(502).json({ error: 'AI provider error' });
      return;
    }

    const completion = (await openAiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: 'Empty response' });
      return;
    }

    const parsed = JSON.parse(content) as { questions?: QuestionPayload[] };
    const questions = (parsed.questions ?? [])
      .filter((q) => q?.text?.trim())
      .slice(0, 5)
      .map((q, i) => ({
        id: q.id?.startsWith('rq') ? q.id : `rq${i + 1}`,
        text: String(q.text).trim().slice(0, 280),
      }));

    if (questions.length < 3) {
      res.status(502).json({ error: 'Invalid question set' });
      return;
    }

    res.status(200).json({ book, chapter, questions, source: 'ai' });
  } catch (err) {
    console.error('reading-questions', err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
}
