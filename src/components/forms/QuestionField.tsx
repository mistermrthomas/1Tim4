import type { Question } from '../../constants/questions';

interface QuestionFieldProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}

export function QuestionField({ question, value, onChange }: QuestionFieldProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={question.id}>{question.text}</label>
      <textarea
        id={question.id}
        className="text-area"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}
