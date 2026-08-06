import { useEffect, useMemo, useState } from 'react';
import { getStudyLinksForReference } from '../../../../shared/studyLinks';
import type { MorningMode } from '../../../domain/formation/types';
import {
  fetchWebPassage,
  slicePassageForMode,
  type WebPassage,
} from '../../../domain/scripture/fetchWebPassage';

const COLLAPSE_CHARS = 1100;

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
  const alternateLink = studyLinks.find((l) => l.url !== chapterUrl) ?? studyLinks[1] ?? null;
  const displayRef = passage?.reference || reference || 'Today’s passage';

  return (
    <div className="formation-scripture" aria-label="Scripture reading">
      <div className="formation-scripture__meta">
        <h2 className="formation-scripture__ref">{displayRef}</h2>
        <p className="formation-scripture__translation">World English Bible · WEB</p>
      </div>

      {status === 'loading' ? (
        <p className="formation-scripture__status">Loading passage…</p>
      ) : null}

      {status === 'unavailable' ? (
        <div className="formation-scripture__fallback">
          <p className="formation-scripture__note">
            Full WEB text isn’t available for this reference yet. Use the links below to read the
            approved wording — we never invent verse text.
          </p>
        </div>
      ) : null}

      {status === 'ready' && sliced ? (
        <div className="formation-scripture__body">
          {sliced.verses.length > 0 ? (
            <div className="formation-scripture__verses">
              {(long && !expanded ? sliced.verses.slice(0, 6) : sliced.verses).map((v) => (
                <div key={`${v.chapter}:${v.verse}`} className="formation-scripture__verse">
                  <span className="formation-scripture__verse-num" aria-hidden>
                    {v.verse}
                  </span>
                  <p className="formation-scripture__verse-text">{v.text}</p>
                </div>
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
              className="formation-scripture__more"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : 'Continue reading'}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="formation-scripture__links">
        {chapterUrl ? (
          <a href={chapterUrl} target="_blank" rel="noreferrer">
            Read full chapter
          </a>
        ) : null}
        {alternateLink ? (
          <a href={alternateLink.url} target="_blank" rel="noreferrer">
            Open alternate translation
          </a>
        ) : null}
      </div>
    </div>
  );
}
