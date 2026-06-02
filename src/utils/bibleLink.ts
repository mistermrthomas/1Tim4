import { BIBLE_TRANSLATION } from '../constants/bible';

/** YouVersion book abbreviations for bible.com / Bible app deep links */
const YOUVERSION_BOOK: Record<string, string> = {
  James: 'JAS',
  Philippians: 'PHP',
  Romans: 'ROM',
  Galatians: 'GAL',
  '1 Corinthians': '1CO',
  '2 Corinthians': '2CO',
  Matthew: 'MAT',
  John: 'JHN',
  Psalms: 'PSA',
  Psalm: 'PSA',
  Proverbs: 'PRO',
  Ephesians: 'EPH',
  Colossians: 'COL',
  Lamentations: 'LAM',
  Micah: 'MIC',
  Deuteronomy: 'DEU',
  '1 Thessalonians': '1TH',
};

/** YouVersion version id for NIV (US) */
const YOUVERSION_VERSION_ID = '59';

export function getBibleChapterUrl(
  book: string,
  chapter: number,
  version: string = BIBLE_TRANSLATION,
): string {
  const abbr = YOUVERSION_BOOK[book];
  if (abbr) {
    return `https://www.bible.com/bible/${YOUVERSION_VERSION_ID}/${abbr}.${chapter}.${version}`;
  }
  const query = encodeURIComponent(`${book} ${chapter}`);
  return `https://www.biblegateway.com/passage/?search=${query}&version=${version}`;
}

export function parseReadingReference(
  book: string,
  chapter: number,
): { book: string; chapter: number } {
  return { book: book.trim(), chapter };
}
