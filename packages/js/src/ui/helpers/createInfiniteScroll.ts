import { Accessor, batch, createEffect, createResource, createSignal, onCleanup, onMount, Setter } from 'solid-js';

export function createInfiniteScroll<T>(
  fetcher: (after: string | undefined) => Promise<{ data: T[]; hasMore: boolean }>,
  options: {
    paginationField: string;
  }
): [
  data: Accessor<T[]>,
  options: {
    initialLoading: Accessor<boolean>;
    setEl: (el: Element) => void;
    after: Accessor<string | undefined>;
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
  const [after, setAfter] = createSignal<string | undefined>(undefined);
  const [end, setEnd] = createSignal(false);
  const [contents, { mutate, refetch }] = createResource(
    () => ({ trigger: true, after: after() }),
    (params) => fetcher(params.after)
  );

  let observedElement: Element | null = null;
  let io: IntersectionObserver | null = null;

  onMount(() => {
    io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && !end() && !contents.loading) {
          const data = contents.latest?.data;
          if (data) {
            // @ts-ignore
            setAfter(data[data.length - 1][options.paginationField]);
          }
        }
      },
      {
        threshold: 0.1,
      }
    );

    if (observedElement && io) {
      io.observe(observedElement);
    }

    onCleanup(() => {
      io?.disconnect();
      io = null;
    });
  });

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

          if (entry.isIntersecting) {
            const data = contents.latest?.data;
            if (data) {
              // @ts-ignore
              setAfter(data[data.length - 1][options.paginationField]);
            }
          }

          observer.disconnect();
        },
        {
          threshold: [0.1],
        }
      );

      observer.observe(observedElement);

      onCleanup(() => {
        observer.disconnect();
      });
    }
  };

  const setEl = (el: Element) => {
    if (io && observedElement) {
      io.unobserve(observedElement);
    }

    observedElement = el;

    if (io && el) {
      io.observe(el);
    }

    onCleanup(() => {
      if (io && el) io.unobserve(el);
    });
  };

  const reset = async () => {
    setData([]);
    setInitialLoading(true);
    setEnd(false);

    if (after() !== undefined) {
      setAfter(undefined);
    } else {
      await refetch();
    }
  };

  return [
    data,
    {
      initialLoading,
      setEl,
      after,
      end,
      mutate,
      reset,
    },
  ];
}
