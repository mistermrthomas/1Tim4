import { useState } from 'react';
import { buildLinksOnlyGoDeeper, fetchGoDeeper, getStudyLinks } from '../../services/goDeeper';
import type { GoDeeperResult } from '../../types/study';
import { parseScriptureReference } from '../../utils/parseReference';
import './GoDeeperPanel.css';

interface GoDeeperPanelProps {
  reference: string;
  verseText?: string;
  trainingFocusTitle?: string;
  /** Smaller button for compact layouts */
  compact?: boolean;
}

export function GoDeeperPanel({
  reference,
  verseText,
  trainingFocusTitle,
  compact,
}: GoDeeperPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GoDeeperResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refTrimmed = reference.trim();
  const canParse = !!parseScriptureReference(refTrimmed);
  const canAsk = refTrimmed.length >= 4 && (canParse || refTrimmed.includes(':'));

  const handleGoDeeper = async () => {
    if (!canAsk || loading) return;
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const ai = await fetchGoDeeper(refTrimmed, { verseText, trainingFocusTitle });
      if (ai) {
        setResult({ ...ai, studyLinks: ai.studyLinks ?? getStudyLinks(refTrimmed) });
        return;
      }
      const linksOnly = buildLinksOnlyGoDeeper(refTrimmed);
      if (linksOnly) {
        setResult({ ...linksOnly, studyLinks: getStudyLinks(refTrimmed) });
        setError(
          'AI study notes are not available right now. Use the links below (NASB, lexicons, commentaries).',
        );
        return;
      }
      setError('Enter a reference like Philippians 4:6 to go deeper.');
    } catch {
      setError('Could not load study notes. Try again or use the links below.');
      const linksOnly = buildLinksOnlyGoDeeper(refTrimmed);
      if (linksOnly) setResult({ ...linksOnly, studyLinks: getStudyLinks(refTrimmed) });
    } finally {
      setLoading(false);
    }
  };

  const links = result?.studyLinks ?? (open ? getStudyLinks(refTrimmed) : []);

  return (
    <div className={`go-deeper${compact ? ' go-deeper--compact' : ''}`}>
      <button
        type="button"
        className="section-link go-deeper__trigger"
        onClick={() => void handleGoDeeper()}
        disabled={!canAsk || loading}
        aria-expanded={open}
      >
        {loading ? 'Opening study notes…' : 'Go deeper'}
      </button>

      {open && (
        <div className="go-deeper__panel card" role="region" aria-label="Study notes">
          {loading && (
            <p className="go-deeper__loading field-hint">Setting, background, and key words…</p>
          )}

          {error && !loading && <p className="go-deeper__error field-hint">{error}</p>}

          {result && !loading && result.source === 'ai' && (
            <>
              {result.setting && (
                <section className="go-deeper__section">
                  <h3 className="go-deeper__heading eyebrow">Setting</h3>
                  <p className="go-deeper__text">{result.setting}</p>
                </section>
              )}
              {result.background && (
                <section className="go-deeper__section">
                  <h3 className="go-deeper__heading eyebrow">Background</h3>
                  <p className="go-deeper__text">{result.background}</p>
                </section>
              )}
              {result.keyWords.length > 0 && (
                <section className="go-deeper__section">
                  <h3 className="go-deeper__heading eyebrow">Key words</h3>
                  <ul className="go-deeper__words">
                    {result.keyWords.map((w) => (
                      <li key={`${w.term}-${w.original}`} className="go-deeper__word">
                        <span className="go-deeper__word-term serif">{w.term}</span>
                        {w.original && (
                          <span className="go-deeper__word-original"> ({w.original}
                            {w.transliteration ? ` · ${w.transliteration}` : ''})</span>
                        )}
                        <p className="go-deeper__word-gloss">{w.gloss}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {result.crossReferences.length > 0 && (
                <section className="go-deeper__section">
                  <h3 className="go-deeper__heading eyebrow">Related passages</h3>
                  <p className="go-deeper__cross">{result.crossReferences.join(' · ')}</p>
                </section>
              )}
              {result.reflectionQuestion && (
                <section className="go-deeper__section">
                  <h3 className="go-deeper__heading eyebrow">Reflect</h3>
                  <p className="go-deeper__text go-deeper__reflect serif">{result.reflectionQuestion}</p>
                </section>
              )}
              <p className="go-deeper__disclaimer field-hint">{result.disclaimer}</p>
            </>
          )}

          {links.length > 0 && (
            <section className="go-deeper__section go-deeper__links">
              <h3 className="go-deeper__heading eyebrow">Study in NASB</h3>
              <ul className="go-deeper__link-list">
                {links.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="section-link">
                      {link.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button type="button" className="btn btn-ghost go-deeper__close" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
