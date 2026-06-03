import { BIBLE_TRANSLATION } from '../constants/bible';

/**
 * YouVersion / Bible app book codes (bible.com).
 * @see https://www.bible.com
 */
const YOUVERSION_BOOK: Record<string, string> = {
  Genesis: 'GEN',
  Exodus: 'EXO',
  Leviticus: 'LEV',
  Numbers: 'NUM',
  Deuteronomy: 'DEU',
  Joshua: 'JOS',
  Judges: 'JDG',
  Ruth: 'RUT',
  '1 Samuel': '1SA',
  '2 Samuel': '2SA',
  '1 Kings': '1KI',
  '2 Kings': '2KI',
  '1 Chronicles': '1CH',
  '2 Chronicles': '2CH',
  Ezra: 'EZR',
  Nehemiah: 'NEH',
  Esther: 'EST',
  Job: 'JOB',
  Psalm: 'PSA',
  Psalms: 'PSA',
  Proverbs: 'PRO',
  Ecclesiastes: 'ECC',
  Song: 'SNG',
  'Song of Solomon': 'SNG',
  Isaiah: 'ISA',
  Jeremiah: 'JER',
  Lamentations: 'LAM',
  Ezekiel: 'EZK',
  Daniel: 'DAN',
  Hosea: 'HOS',
  Joel: 'JOL',
  Amos: 'AMO',
  Obadiah: 'OBA',
  Jonah: 'JON',
  Micah: 'MIC',
  Nahum: 'NAH',
  Habakkuk: 'HAB',
  Zephaniah: 'ZEP',
  Haggai: 'HAG',
  Zechariah: 'ZEC',
  Malachi: 'MAL',
  Matthew: 'MAT',
  Mark: 'MRK',
  Luke: 'LUK',
  John: 'JHN',
  Acts: 'ACT',
  Romans: 'ROM',
  '1 Corinthians': '1CO',
  '2 Corinthians': '2CO',
  Galatians: 'GAL',
  Ephesians: 'EPH',
  Philippians: 'PHP',
  Colossians: 'COL',
  '1 Thessalonians': '1TH',
  '2 Thessalonians': '2TH',
  '1 Timothy': '1TI',
  '2 Timothy': '2TI',
  Titus: 'TIT',
  Philemon: 'PHM',
  Hebrews: 'HEB',
  James: 'JAS',
  '1 Peter': '1PE',
  '2 Peter': '2PE',
  '1 John': '1JN',
  '2 John': '2JN',
  '3 John': '3JN',
  Jude: 'JUD',
  Revelation: 'REV',
};

/** YouVersion version id for NASB (1995) */
const YOUVERSION_VERSION_ID = '100';

function youVersionBookCode(book: string): string | undefined {
  const trimmed = book.trim();
  if (YOUVERSION_BOOK[trimmed]) return YOUVERSION_BOOK[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [name, code] of Object.entries(YOUVERSION_BOOK)) {
    if (name.toLowerCase() === lower) return code;
  }
  return undefined;
}

/** Opens in YouVersion app when installed (bible.com universal link); NASB. */
export function getBibleChapterUrl(
  book: string,
  chapter: number,
  version: string = BIBLE_TRANSLATION,
): string {
  const abbr = youVersionBookCode(book);
  if (abbr) {
    return `https://www.bible.com/bible/${YOUVERSION_VERSION_ID}/${abbr}.${chapter}.${version}`;
  }
  const query = encodeURIComponent(`${book} ${chapter}`);
  return `https://www.biblegateway.com/passage/?search=${query}&version=${version}`;
}

export function usesYouVersionLink(book: string): boolean {
  return youVersionBookCode(book) !== undefined;
}

export function parseReadingReference(
  book: string,
  chapter: number,
): { book: string; chapter: number } {
  return { book: book.trim(), chapter };
}
