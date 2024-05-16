import hljs from 'highlight.js';
import { ReactNode, useEffect, useRef } from 'react';
import 'highlight.js/styles/default.css';
import 'highlight.js/styles/atom-one-dark.css';

export const Highlight = (props: { children: ReactNode }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    if (ref.current.children.length === 0) {
      ref.current.removeAttribute('data-highlighted');
    }

    if (!ref.current || ref.current.getAttribute('data-highlighted') === 'yes') {
      return;
    }

    hljs.highlightBlock(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current, props.children]);

  return <code {...props} ref={ref} />;
};
