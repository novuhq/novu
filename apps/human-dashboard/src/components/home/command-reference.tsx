import { HOME_FLAGS } from '@/data/home';

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
