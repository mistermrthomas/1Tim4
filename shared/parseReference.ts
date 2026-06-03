export interface ParsedReference {
  book: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
}

/** Parses references like "Philippians 4:6", "1 Corinthians 13:4-7", "Psalm 23:1". */
export function parseScriptureReference(raw: string): ParsedReference | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = trimmed.match(
    /^((?:\d\s+)?[A-Za-z]+(?:\s+(?:of\s+)?[A-Za-z]+)?)\s+(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/i,
  );
  if (!match) return null;

  const book = match[1].replace(/\s+/g, ' ').trim();
  const chapter = Number.parseInt(match[2], 10);
  const verse = Number.parseInt(match[3], 10);
  const verseEnd = match[4] ? Number.parseInt(match[4], 10) : undefined;

  if (!book || Number.isNaN(chapter) || Number.isNaN(verse)) return null;

  return { book, chapter, verse, verseEnd };
}

export function formatParsedReference(parsed: ParsedReference): string {
  const base = `${parsed.book} ${parsed.chapter}:${parsed.verse ?? 1}`;
  if (parsed.verseEnd && parsed.verse && parsed.verseEnd > parsed.verse) {
    return `${base}-${parsed.verseEnd}`;
  }
  return base;
}
