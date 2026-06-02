import type { ReactNode } from 'react';
import { getBibleChapterUrl } from '../../utils/bibleLink';
import './BibleChapterLink.css';

interface BibleChapterLinkProps {
  book: string;
  chapter: number;
  className?: string;
  children?: ReactNode;
}

export function BibleChapterLink({ book, chapter, className = '', children }: BibleChapterLinkProps) {
  const label = children ?? `${book} ${chapter}`;
  const href = getBibleChapterUrl(book, chapter);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`bible-chapter-link serif${className ? ` ${className}` : ''}`}
    >
      {label}
      <span className="bible-chapter-link__hint">Open in Bible app</span>
    </a>
  );
}
