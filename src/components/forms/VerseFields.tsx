import { Link } from 'react-router-dom';
import type { ChapterReference, ReadingPlan } from '../../types';
import { DictationTextArea } from './DictationTextArea';
import { GoDeeperPanel } from '../study/GoDeeperPanel';
import { BibleChapterLink } from '../shared/BibleChapterLink';
import { hydrateReadingPlan } from '../../utils/readingPlanFromProfile';
import { formatReadingProgressLabel } from '../../utils/readingPlanFromProfile';
import './VerseFields.css';

function chapterKey(c: ChapterReference): string {
  return `${c.book}:${c.chapter}`;
}

function isChapterSelected(selected: ChapterReference[], c: ChapterReference): boolean {
  return selected.some((s) => s.book === c.book && s.chapter === c.chapter);
}

export function ChapterChecklist({
  plan,
  selected,
  onChange,
  priorChapters = [],
}: {
  plan: ReadingPlan;
  selected: ChapterReference[];
  onChange: (chapters: ChapterReference[]) => void;
  priorChapters?: ChapterReference[];
}) {
  const hydrated = hydrateReadingPlan(plan);
  const options: ChapterReference[] = [];
  const seen = new Set<string>();

  const addOption = (c: ChapterReference) => {
    if (!c.book || c.chapter < 1) return;
    const key = chapterKey(c);
    if (seen.has(key)) return;
    seen.add(key);
    options.push({ book: c.book, chapter: c.chapter });
  };

  if (hydrated.currentBook) {
    for (let ch = hydrated.startChapter; ch <= hydrated.endChapter; ch++) {
      addOption({ book: hydrated.currentBook, chapter: ch });
    }
  }
  addOption({ book: hydrated.currentBook, chapter: hydrated.currentChapter });
  for (const c of priorChapters) addOption(c);

  const toggle = (c: ChapterReference, checked: boolean) => {
    if (checked) {
      onChange([...selected.filter((s) => chapterKey(s) !== chapterKey(c)), c]);
    } else {
      onChange(selected.filter((s) => !(s.book === c.book && s.chapter === c.chapter)));
    }
  };

  if (options.length === 0) {
    return (
      <div className="prepare-block card">
        <p className="field-label">Chapter read</p>
        <p className="field-hint">
          <Link to="/quick-start" className="section-link">Start reading</Link>
          {' '}to pick a passage, or set a plan in Guide / assessment.
        </p>
      </div>
    );
  }

  return (
    <div className="prepare-block card chapter-checklist">
      <p className="field-label">Chapter(s) read</p>
      <p className="field-hint">{formatReadingProgressLabel(hydrated)}</p>
      <p className="field-hint">Check each chapter you read today (in order).</p>
      <ul className="chapter-checklist__list">
        {options.map((c) => {
          const checked = isChapterSelected(selected, c);
          const id = `chapter-${chapterKey(c)}`;
          return (
            <li key={chapterKey(c)} className="chapter-checklist__item">
              <input
                id={id}
                type="checkbox"
                className="chapter-checklist__input"
                checked={checked}
                onChange={(e) => toggle(c, e.target.checked)}
              />
              <label htmlFor={id} className="chapter-checklist__label">
                <BibleChapterLink book={c.book} chapter={c.chapter} />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StandoutVerseField({
  reference,
  why,
  onReferenceChange,
  onWhyChange,
  trainingFocusTitle,
}: {
  reference: string;
  why: string;
  onReferenceChange: (v: string) => void;
  onWhyChange: (v: string) => void;
  trainingFocusTitle?: string;
}) {
  return (
    <div className="prepare-block card standout-verse">
      <label className="field-label" htmlFor="standout-ref">
        What verse stood out?
      </label>
      <p className="field-hint">After you read, note one passage and why it caught your attention.</p>
      <input
        id="standout-ref"
        className="text-input standout-verse__ref"
        placeholder="Reference (e.g. Philippians 4:6)"
        value={reference}
        onChange={(e) => onReferenceChange(e.target.value)}
      />
      <label className="field-label standout-verse__why-label" htmlFor="standout-why">
        Why did it stand out?
      </label>
      <DictationTextArea
        id="standout-why"
        className="standout-verse__why"
        placeholder="A sentence or two — type or dictate"
        value={why}
        onChange={onWhyChange}
        rows={4}
      />
      {reference.trim().length >= 4 && (
        <GoDeeperPanel
          reference={reference}
          trainingFocusTitle={trainingFocusTitle}
          compact
        />
      )}
    </div>
  );
}
