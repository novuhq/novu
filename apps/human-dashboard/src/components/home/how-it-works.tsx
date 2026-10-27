import { HOME_HOW_IT_WORKS } from '@/data/home';

import { InlineCode } from './documentation';

export function HowItWorks() {
  return (
    <ul className="home-bullets">
      {HOME_HOW_IT_WORKS.map((parts, index) => (
        <li key={index}>
          <span>
            {parts.map((part, partIndex) =>
              typeof part === 'string' ? (
                part
              ) : (
                <InlineCode key={partIndex} compact={part.compact} tall={part.tall}>
                  {part.code}
                </InlineCode>
              )
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
