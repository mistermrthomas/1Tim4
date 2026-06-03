import type { Question } from '../../constants/questions';
import { DictationTextArea } from './DictationTextArea';

interface QuestionFieldProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}

export function QuestionField({ question, value, onChange }: QuestionFieldProps) {
  return (
    <div className="field question-field">
      <label className="field-label" htmlFor={question.id}>{question.text}</label>
      <DictationTextArea
        id={question.id}
        value={value}
        onChange={onChange}
        rows={3}
        placeholder="Type or tap Dictate…"
      />
    </div>
  );
}
