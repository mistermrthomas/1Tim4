/**
 * Fetch World English Bible (public domain) passage text.
 * Never invents wording — proxies an approved WEB source only.
 */

type VercelRequest = { method?: string; query?: Record<string, string | string[] | undefined> };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function queryString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');

  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const reference = queryString(req.query?.ref).trim().slice(0, 120);
  if (reference.length < 3) {
    res.status(400).json({ error: 'Missing scripture reference', code: 'INVALID_INPUT' });
    return;
  }

  try {
    const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=web`;
    const upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!upstream.ok) {
      res.status(502).json({
        error: 'Scripture text is unavailable for this reference.',
        code: 'TEXT_UNAVAILABLE',
        reference,
      });
      return;
    }
    const data = (await upstream.json()) as {
      reference?: string;
      text?: string;
      translation_id?: string;
      translation_name?: string;
      verses?: Array<{ verse: number; text: string; chapter: number; book_name: string }>;
    };
    const text = String(data.text ?? '').trim();
    if (!text) {
      res.status(404).json({
        error: 'No WEB text found for this reference.',
        code: 'TEXT_UNAVAILABLE',
        reference,
      });
      return;
    }

    res.status(200).json({
      reference: data.reference || reference,
      translationId: 'web',
      translationName: data.translation_name || 'World English Bible',
      attribution: 'World English Bible (public domain)',
      text,
      verses: (data.verses ?? []).map((v) => ({
        verse: v.verse,
        chapter: v.chapter,
        book: v.book_name,
        text: String(v.text ?? '').trim(),
      })),
    });
  } catch {
    res.status(502).json({
      error: 'Could not load Scripture text.',
      code: 'UPSTREAM_ERROR',
      reference,
    });
  }
}
