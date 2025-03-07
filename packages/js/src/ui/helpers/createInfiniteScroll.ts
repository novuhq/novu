import { Accessor, batch, createEffect, createResource, createSignal, onCleanup, Setter } from 'solid-js';
import { isServer } from 'solid-js/web';

export function createInfiniteScroll<T>(fetcher: (page: number) => Promise<{ data: T[]; hasMore: boolean }>): [
  data: Accessor<T[]>,
  options: {
    initialLoading: Accessor<boolean>;
    setEl: (el: Element) => void;
    offset: Accessor<number>;
    end: Accessor<boolean>;
    reset: () => Promise<void>;
    mutate: Setter<
      | {
          data: T[];
          hasMore: boolean;
        }
      | undefined
    >;
  },
] {
  const [data, setData] = createSignal<T[]>([]);
  const [initialLoading, setInitialLoading] = createSignal(true);
  const [offset, setOffset] = createSignal(0);
  const [end, setEnd] = createSignal(false);
  const [contents, { mutate, refetch }] = createResource(offset, fetcher);

  let observedElement: Element | null = null;

  let setEl: (el: Element) => void = () => {};
  if (!isServer) {
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && !end() && !contents.loading) {
          setOffset((prev) => prev + 1);
        }
      },
      {
        threshold: 0.1,
      }
    );

    onCleanup(() => io.disconnect());

    setEl = (el: Element) => {
      observedElement = el;
      io.observe(el);
      onCleanup(() => io.unobserve(el));
    };
  }

  createEffect(() => {
    if (contents.loading) return;

    const content = contents.latest;
    if (!content) return;

    setInitialLoading(false);
    batch(() => {
      if (!content.hasMore) setEnd(true);
      setData(content.data);

      /*
       ** Wait for DOM to update before checking visibility
       ** Use requestAnimationFrame to ensure we're after the next paint
       */
      requestAnimationFrame(() => {
        checkVisibilityAndLoadMore();
      });
    });
  });

  const checkVisibilityAndLoadMore = () => {
    if (observedElement && !end() && !contents.loading) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];

          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            setOffset((prev) => prev + 1);
          }

          observer.disconnect();
        },
        {
          threshold: [0.1, 0.2, 0.3, 0.4, 0.5],
        }
      );

      observer.observe(observedElement);

      onCleanup(() => {
        observer.disconnect();
      });
    }
  };

  const reset = async () => {
    setData([]);
    setInitialLoading(true);
    setEnd(false);

    if (offset() !== 0) {
      setOffset(0);
    } else {
      await refetch();
    }
  };

  return [
    data,
    {
      initialLoading,
      setEl,
      offset,
      end,
      mutate,
      reset,
    },
  ];
}
