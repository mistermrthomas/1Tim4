import type { VerseReference, ChapterReference } from '../../types';
import './VerseFields.css';

interface VerseFieldsProps {
  keyVerses: VerseReference[];
  standoutVerses: VerseReference[];
  onKeyVersesChange: (verses: VerseReference[]) => void;
  onStandoutVersesChange: (verses: VerseReference[]) => void;
}

export function VerseFields({
  keyVerses,
  standoutVerses,
  onKeyVersesChange,
  onStandoutVersesChange,
}: VerseFieldsProps) {
  return (
    <>
      <VerseList
        label="Key verse(s)"
        hint="Verses you want to carry today"
        verses={keyVerses}
        onChange={onKeyVersesChange}
      />
      <VerseList
        label="Verses that stood out"
        hint="What caught your attention in today's reading"
        verses={standoutVerses}
        onChange={onStandoutVersesChange}
      />
    </>
  );
}

function VerseList({
  label,
  hint,
  verses,
  onChange,
}: {
  label: string;
  hint: string;
  verses: VerseReference[];
  onChange: (v: VerseReference[]) => void;
}) {
  const update = (index: number, field: keyof VerseReference, value: string) => {
    const next = [...verses];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const add = () => onChange([...verses, { reference: '', text: '' }]);
  const remove = (index: number) => onChange(verses.filter((_, i) => i !== index));

  return (
    <div className="verse-fields">
      <label className="field-label">{label}</label>
      <p className="field-hint">{hint}</p>
      {verses.map((v, i) => (
        <div key={i} className="verse-fields__row">
          <input
            className="text-input verse-fields__ref"
            placeholder="Reference (e.g. James 1:19)"
            value={v.reference}
            onChange={(e) => update(i, 'reference', e.target.value)}
          />
          <textarea
            className="text-area verse-fields__text"
            placeholder="Verse text (optional)"
            value={v.text}
            onChange={(e) => update(i, 'text', e.target.value)}
            rows={2}
          />
          {verses.length > 1 && (
            <button type="button" className="btn-ghost verse-fields__remove" onClick={() => remove(i)}>
              Remove
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn-ghost verse-fields__add" onClick={add}>
        + Add verse
      </button>
    </div>
  );
}

export function ChapterField({
  chapters,
  onChange,
}: {
  chapters: ChapterReference[];
  onChange: (c: ChapterReference[]) => void;
}) {
  const update = (index: number, field: keyof ChapterReference, value: string | number) => {
    const next = [...chapters];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  return (
    <div className="verse-fields">
      <label className="field-label">Chapter(s) read</label>
      {chapters.map((c, i) => (
        <div key={i} className="verse-fields__chapter-row">
          <input
            className="text-input"
            placeholder="Book"
            value={c.book}
            onChange={(e) => update(i, 'book', e.target.value)}
          />
          <input
            className="text-input verse-fields__chapter-num"
            type="number"
            min={1}
            placeholder="Ch."
            value={c.chapter || ''}
            onChange={(e) => update(i, 'chapter', parseInt(e.target.value, 10) || 0)}
          />
        </div>
      ))}
      <button
        type="button"
        className="btn-ghost verse-fields__add"
        onClick={() => onChange([...chapters, { book: '', chapter: 0 }])}
      >
        + Add chapter
      </button>
    </div>
  );
}
