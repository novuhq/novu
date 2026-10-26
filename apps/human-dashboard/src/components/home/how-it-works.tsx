import { Fragment } from 'react';
import { HOME_HOW_IT_WORKS } from '@/data/home';

import { AsciiBox, AsciiRule, InlineCode } from './documentation';

export function HowItWorks() {
  return (
    <div className="home-boxes">
      <AsciiRule box />
      {HOME_HOW_IT_WORKS.map((parts, index) => (
        <Fragment key={index}>
          <AsciiBox>
            {parts.map((part, index) =>
              typeof part === 'string' ? (
                part
              ) : (
                <InlineCode key={index} compact={part.compact} tall={part.tall}>
                  {part.code}
                </InlineCode>
              )
            )}
          </AsciiBox>
          <AsciiRule box />
        </Fragment>
      ))}
    </div>
  );
}
