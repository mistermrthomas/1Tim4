import type { ReactNode } from 'react';
import { getBibleChapterUrl, usesYouVersionLink } from '../../utils/bibleLink';
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
  const viaYouVersion = usesYouVersionLink(book);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`bible-chapter-link serif${className ? ` ${className}` : ''}`}
    >
      {label}
      <span className="bible-chapter-link__hint">
        {viaYouVersion ? 'Open in YouVersion (Bible app)' : 'Open in Bible Gateway (NASB)'}
      </span>
    </a>
  );
}
