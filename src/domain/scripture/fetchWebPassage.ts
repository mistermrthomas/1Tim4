import { parseScriptureReference, formatParsedReference } from '../../../shared/parseReference';

export type WebVerse = {
  verse: number;
  chapter: number;
  book: string;
  text: string;
};

export type WebPassage = {
  reference: string;
  translationId: 'web';
  translationName: string;
  attribution: string;
  text: string;
  verses: WebVerse[];
};

export type WebPassageResult =
  | { ok: true; passage: WebPassage }
  | { ok: false; reason: 'invalid_reference' | 'unavailable' | 'network'; reference: string };

const cache = new Map<string, WebPassage>();

/** Normalize human reference for cache + API. */
export function normalizePassageReference(raw: string): string | null {
  const first = raw.split(/[;|]/)[0]?.trim() ?? '';
  if (!first) return null;
  const parsed = parseScriptureReference(first);
  if (parsed) return formatParsedReference(parsed);
  // Allow chapter-only like "Romans 8" for chapter open helpers.
  const chapterOnly = first.match(/^((?:\d\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d{1,3})$/i);
  if (chapterOnly) return `${chapterOnly[1].replace(/\s+/g, ' ').trim()} ${chapterOnly[2]}`;
  return first.length >= 3 ? first : null;
}

export async function fetchWebPassage(rawReference: string): Promise<WebPassageResult> {
  const reference = normalizePassageReference(rawReference);
  if (!reference) {
    return { ok: false, reason: 'invalid_reference', reference: rawReference.trim() };
  }

  const cached = cache.get(reference.toLowerCase());
  if (cached) return { ok: true, passage: cached };

  try {
    const res = await fetch(`/api/scripture/web?ref=${encodeURIComponent(reference)}`);
    const payload = (await res.json().catch(() => ({}))) as Partial<WebPassage> & {
      error?: string;
    };
    if (!res.ok || !payload.text?.trim()) {
      return { ok: false, reason: 'unavailable', reference };
    }
    const passage: WebPassage = {
      reference: payload.reference || reference,
      translationId: 'web',
      translationName: payload.translationName || 'World English Bible',
      attribution: payload.attribution || 'World English Bible (public domain)',
      text: payload.text.trim(),
      verses: Array.isArray(payload.verses) ? payload.verses : [],
    };
    cache.set(reference.toLowerCase(), passage);
    return { ok: true, passage };
  } catch {
    return { ok: false, reason: 'network', reference };
  }
}

/** Short / two-minute slices — still approved WEB text only. */
export function slicePassageForMode(
  passage: WebPassage,
  mode: 'full' | 'short' | 'two_minute',
): { text: string; verses: WebVerse[]; truncated: boolean } {
  if (mode === 'full' || passage.verses.length === 0) {
    return { text: passage.text, verses: passage.verses, truncated: false };
  }
  const count = mode === 'two_minute' ? 1 : Math.min(3, passage.verses.length);
  const verses = passage.verses.slice(0, count);
  const text = verses.map((v) => v.text).join('\n\n').trim() || passage.text;
  return {
    text,
    verses,
    truncated: verses.length < passage.verses.length,
  };
}
