import { useCallback } from 'react';
import { useSpeechDictation } from '../../hooks/useSpeechDictation';
import './DictationTextArea.css';

interface DictationTextAreaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export function DictationTextArea({
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
  className = '',
}: DictationTextAreaProps) {
  const appendPhrase = useCallback(
    (phrase: string) => {
      const trimmed = phrase.trim();
      if (!trimmed) return;
      onChange(value.trim() ? `${value.trimEnd()} ${trimmed}` : trimmed);
    },
    [value, onChange],
  );

  const { supported, listening, error, toggle } = useSpeechDictation(appendPhrase);

  return (
    <div className="dictation-field">
      <textarea
        id={id}
        className={`text-area dictation-field__input${className ? ` ${className}` : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
      />
      <div className="dictation-field__toolbar">
        {supported ? (
          <button
            type="button"
            className={`dictation-field__mic${listening ? ' dictation-field__mic--active' : ''}`}
            onClick={toggle}
            aria-pressed={listening}
            aria-label={listening ? 'Stop dictation' : 'Start dictation'}
          >
            {listening ? 'Stop dictation' : 'Dictate'}
          </button>
        ) : (
          <span className="field-hint dictation-field__unsupported">
            Dictation unavailable — type instead, or use the keyboard mic on your phone.
          </span>
        )}
        {listening && (
          <span className="dictation-field__listening field-hint" role="status">
            Listening…
          </span>
        )}
      </div>
      {error && <p className="field-hint dictation-field__error">{error}</p>}
    </div>
  );
}
