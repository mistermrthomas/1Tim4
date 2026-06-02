import { MEMORIZATION_TRANSLATION_LABEL } from '../../constants/bible';
import './ScriptureVerse.css';

interface ScriptureVerseProps {
  reference: string;
  text: string;
  translation?: string;
}

export function ScriptureVerse({
  reference,
  text,
  translation = MEMORIZATION_TRANSLATION_LABEL,
}: ScriptureVerseProps) {
  return (
    <blockquote className="scripture-verse">
      <p className="scripture-verse__text serif">{text}</p>
      <footer className="scripture-verse__meta">
        <cite className="scripture-verse__ref">{reference}</cite>
        <span className="scripture-verse__translation">{translation}</span>
      </footer>
    </blockquote>
  );
}
