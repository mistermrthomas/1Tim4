import { useEffect, useMemo, useState } from 'react';
import { getStudyLinksForReference } from '../../../../shared/studyLinks';
import type { MorningMode } from '../../../domain/formation/types';
import {
  fetchWebPassage,
  slicePassageForMode,
  type WebPassage,
} from '../../../domain/scripture/fetchWebPassage';

const COLLAPSE_CHARS = 900;

export function ScripturePassage({
  reference,
  mode,
  onReviewed,
}: {
  reference: string;
  mode: MorningMode;
  onReviewed?: () => void;
}) {
  const [passage, setPassage] = useState<WebPassage | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setPassage(null);
    void fetchWebPassage(reference).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setPassage(result.passage);
        setStatus('ready');
      } else {
        setStatus('unavailable');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  useEffect(() => {
    if (status === 'ready') onReviewed?.();
    // intentionally once per successful load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reference]);

  const sliced = useMemo(() => {
    if (!passage) return null;
    return slicePassageForMode(passage, mode);
  }, [passage, mode]);

  const displayText = sliced?.text ?? '';
  const long = displayText.length > COLLAPSE_CHARS;
  const shown =
    long && !expanded ? `${displayText.slice(0, COLLAPSE_CHARS).trim()}…` : displayText;

  const studyLinks = getStudyLinksForReference(reference);
  const chapterUrl = studyLinks[0]?.url ?? null;

  return (
    <section className="formation-block formation-scripture" aria-label="Scripture reading">
      <div className="formation-block__head">
        <p className="formation-block__eyebrow">Scripture</p>
        <h2 className="formation-block__title">{passage?.reference || reference || 'Today’s passage'}</h2>
        <p className="formation-scripture__translation">
          {passage?.translationName || 'World English Bible'} · WEB
        </p>
      </div>

      {status === 'loading' ? (
        <p className="formation-scripture__status">Loading passage…</p>
      ) : null}

      {status === 'unavailable' ? (
        <div className="formation-scripture__fallback">
          <p className="formation-scripture__ref-only">{reference}</p>
          <p className="formation-scripture__note">
            Full WEB text isn’t available for this reference yet. Open the chapter to read the
            approved wording — we never invent verse text.
          </p>
        </div>
      ) : null}

      {status === 'ready' && sliced ? (
        <div className="formation-scripture__body">
          {sliced.verses.length > 0 ? (
            <div className="formation-scripture__verses">
              {(long && !expanded ? sliced.verses.slice(0, 4) : sliced.verses).map((v) => (
                <p key={`${v.chapter}:${v.verse}`} className="formation-scripture__verse">
                  <sup>{v.verse}</sup>
                  {v.text}
                </p>
              ))}
            </div>
          ) : (
            <div className="formation-scripture__prose">
              {shown.split(/\n\n+/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}
          {sliced.truncated || long ? (
            <button
              type="button"
              className="formation-link-btn"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : mode === 'full' ? 'Read full passage' : 'Show more of this passage'}
            </button>
          ) : null}
          <p className="formation-scripture__attr">{passage?.attribution}</p>
        </div>
      ) : null}

      <div className="formation-scripture__links">
        {chapterUrl ? (
          <a className="formation-link-btn" href={chapterUrl} target="_blank" rel="noreferrer">
            Open full chapter
          </a>
        ) : null}
        {studyLinks.slice(0, 1).map((link) => (
          <a key={link.url} className="formation-link-btn" href={link.url} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
