import { parseScriptureReference } from './parseReference';

/** Blue Letter Bible book codes (lowercase). */
const BLB_BOOK: Record<string, string> = {
  Genesis: 'gen',
  Exodus: 'exo',
  Leviticus: 'lev',
  Numbers: 'num',
  Deuteronomy: 'deu',
  Joshua: 'jos',
  Judges: 'jdg',
  Ruth: 'rut',
  '1 Samuel': '1sa',
  '2 Samuel': '2sa',
  '1 Kings': '1ki',
  '2 Kings': '2ki',
  '1 Chronicles': '1ch',
  '2 Chronicles': '2ch',
  Ezra: 'ezr',
  Nehemiah: 'neh',
  Esther: 'est',
  Job: 'job',
  Psalm: 'psa',
  Psalms: 'psa',
  Proverbs: 'pro',
  Ecclesiastes: 'ecc',
  Song: 'sng',
  Isaiah: 'isa',
  Jeremiah: 'jer',
  Lamentations: 'lam',
  Ezekiel: 'ezk',
  Daniel: 'dan',
  Hosea: 'hos',
  Joel: 'jol',
  Amos: 'amo',
  Obadiah: 'oba',
  Jonah: 'jon',
  Micah: 'mic',
  Nahum: 'nah',
  Habakkuk: 'hab',
  Zephaniah: 'zep',
  Haggai: 'hag',
  Zechariah: 'zec',
  Malachi: 'mal',
  Matthew: 'mat',
  Mark: 'mrk',
  Luke: 'luk',
  John: 'jhn',
  Acts: 'act',
  Romans: 'rom',
  '1 Corinthians': '1co',
  '2 Corinthians': '2co',
  Galatians: 'gal',
  Ephesians: 'eph',
  Philippians: 'php',
  Colossians: 'col',
  '1 Thessalonians': '1th',
  '2 Thessalonians': '2th',
  '1 Timothy': '1ti',
  '2 Timothy': '2ti',
  Titus: 'tit',
  Philemon: 'phm',
  Hebrews: 'heb',
  James: 'jas',
  '1 Peter': '1pe',
  '2 Peter': '2pe',
  '1 John': '1jn',
  '2 John': '2jn',
  '3 John': '3jn',
  Jude: 'jud',
  Revelation: 'rev',
};

export interface StudyLink {
  label: string;
  url: string;
}

export function getStudyLinksForReference(reference: string): StudyLink[] {
  const parsed = parseScriptureReference(reference);
  if (!parsed) return [];

  const verse = parsed.verse ?? 1;
  const links: StudyLink[] = [];
  const blbBook = BLB_BOOK[parsed.book];

  if (blbBook) {
    links.push({
      label: 'Blue Letter Bible (NASB)',
      url: `https://www.blueletterbible.org/nasb/${blbBook}/${parsed.chapter}/${verse}/`,
    });
  }

  const query = encodeURIComponent(
    parsed.verseEnd && parsed.verse && parsed.verseEnd > parsed.verse
      ? `${parsed.book} ${parsed.chapter}:${parsed.verse}-${parsed.verseEnd}`
      : `${parsed.book} ${parsed.chapter}:${verse}`,
  );
  links.push({
    label: 'Bible Gateway (NASB)',
    url: `https://www.biblegateway.com/passage/?search=${query}&version=NASB`,
  });

  return links;
}
