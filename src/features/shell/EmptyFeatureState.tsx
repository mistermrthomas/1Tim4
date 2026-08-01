import './EmptyFeatureState.css';

interface EmptyFeatureStateProps {
  title: string;
  question: string;
  body: string;
  nextHint: string;
}

/** Coherent empty state for Phase 1 — one job, no dashboard clutter. */
export function EmptyFeatureState({ title, question, body, nextHint }: EmptyFeatureStateProps) {
  return (
    <section className="formation-empty path-fade-in">
      <h1 className="formation-empty__title">{title}</h1>
      <p className="formation-empty__question">{question}</p>
      <p className="formation-empty__body">{body}</p>
      <p className="formation-empty__hint">{nextHint}</p>
    </section>
  );
}
