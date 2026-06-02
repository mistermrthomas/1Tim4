import type { TrainingFocus, TrainingVerse } from '../../types';
import { formatSince } from '../../utils/date';
import { resolveFocusVisualKey } from '../../utils/focusVisuals';
import { ScriptureVerse } from '../shared/ScriptureVerse';
import { HeroArt } from '../illustrations/FieldGuideArt';
import './FocusHero.css';

interface FocusHeroProps {
  focus: TrainingFocus;
  verse?: TrainingVerse | null;
}

export function FocusHero({ focus, verse }: FocusHeroProps) {
  const visualKey = resolveFocusVisualKey(focus);

  return (
    <article className="season-band" aria-label="Current training season">
      <div className="season-band__content">
        <header className="season-band__focus">
          <p className="season-band__eyebrow">Current training focus</p>
          <h1 className="season-band__title serif">{focus.title}</h1>
          <p className="season-band__desc">{focus.description}</p>
          <p className="season-band__since">Training since {formatSince(focus.startedAt)}</p>
        </header>

        {verse && (
          <div className="season-band__verse" aria-label="Training verse">
            <p className="season-band__verse-label">Training verse</p>
            <ScriptureVerse reference={verse.reference} text={verse.text} />
          </div>
        )}
      </div>

      <div className="season-band__art" aria-hidden="true">
        <HeroArt
          visualKey={visualKey}
          alt=""
          className="season-band__art-img"
        />
      </div>
    </article>
  );
}
