import { HOME_EXIT_CODES, HOME_FLAGS } from '@/data/home';

import { InlineCode } from './documentation';

export function ExitCodes() {
  return (
    <dl className="home-definitions home-exit-codes">
      {HOME_EXIT_CODES.map((item) => (
        <div key={item.code}>
          <dt>{item.code}</dt>
          <dd className={'resume' in item ? 'home-resume-description' : undefined}>
            {'resume' in item ? (
              <>
                <span>{item.description}</span> <InlineCode>{item.resume}</InlineCode>
              </>
            ) : (
              item.description
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Flags() {
  return (
    <dl className="home-definitions home-flags">
      {HOME_FLAGS.map((item) => (
        <div key={item.flag}>
          <dt>
            <code>
              {item.flag}
              {'argument' in item ? (
                <>
                  {' '}
                  <span data-color="orange">{item.argument}</span>
                </>
              ) : null}
            </code>
          </dt>
          <dd className="home-comment">
            {item.description.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
