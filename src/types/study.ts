export interface GoDeeperKeyWord {
  term: string;
  original: string;
  transliteration?: string;
  gloss: string;
}

export interface StudyLink {
  label: string;
  url: string;
}

export interface GoDeeperResult {
  reference: string;
  setting: string;
  background: string;
  keyWords: GoDeeperKeyWord[];
  crossReferences: string[];
  reflectionQuestion: string;
  disclaimer: string;
  source: 'ai' | 'links';
  studyLinks?: StudyLink[];
}
