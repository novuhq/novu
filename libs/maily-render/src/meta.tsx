export type MetaDescriptor =
  | {
      charSet: 'utf-8';
    }
  | {
      title: string;
    }
  | {
      name: string;
      content: string;
    }
  | {
      property: string;
      content: string;
    }
  | {
      httpEquiv: string;
      content: string;
    }
  | {
      tagName: 'meta' | 'link';
      [attribute: string]: string;
    }
  | {
      [name: string]: string;
    };

export type MetaDescriptors = MetaDescriptor[];

export function meta(meta: MetaDescriptors) {
  return (
    meta
      // only filter unique meta tags
      // so that we don't have duplicate meta tags
      .filter((meta, index, self) => {
        const meta_hash = has(meta);
        return (
          index ===
          self.findIndex((t) => {
            return has(t) === meta_hash;
          })
        );
      })
      .map(process)
      .filter(Boolean) as JSX.Element[]
  );
}

function process(props: MetaDescriptor) {
  if ('tagName' in props) {
    const { tagName, ...attributes } = props;
    const Comp = tagName;
    return <Comp key={JSON.stringify(attributes)} {...attributes} />;
  }

  if ('title' in props) {
    return <title>{props.title}</title>;
  }

  if ('charSet' in props) {
    return <meta charSet={props.charSet} />;
  }

  return <meta key={JSON.stringify(props)} {...props} />;
}

/**
 * hash the meta object to string
 * so that we can filter out duplicates
 * for that we have to sort the object keys
 * and then stringify it and hash it
 */
function has(meta: MetaDescriptor) {
  const sortedMeta = Object.keys(meta)
    .sort()
    .reduce((acc, key) => {
      const _key = key as keyof MetaDescriptor;
      acc[_key] = meta[_key];
      return acc;
    }, {} as MetaDescriptor);

  return JSON.stringify(sortedMeta);
}
