'use client';

import { Fragment, type ReactNode, useId, useState } from 'react';

import { cn } from '@/lib/utils';

type FilterableCase = {
  id: string;
  label: string;
  content: ReactNode;
};

type FilterableGroup = {
  title: string;
  description: string;
  shaded: boolean;
  cases: FilterableCase[];
};

const filterClass =
  'inline-flex min-h-6 cursor-pointer items-center rounded-full border border-sapien-surface bg-black px-2.5 font-sapien-mono text-[11px] leading-none tracking-tight text-sapien-foreground/80 hover:border-accent/40 hover:text-accent aria-pressed:border-sapien-foreground aria-pressed:bg-sapien-foreground aria-pressed:text-sapien-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function UseCaseFilters({ groups }: { groups: FilterableGroup[] }) {
  const resultsId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = groups.flatMap(({ cases }) => cases).find(({ id }) => id === selectedId);

  return (
    <>
      <fieldset className="section-rails min-w-0">
        <legend className="sr-only">Filter use cases</legend>
        <div className="grid divide-y divide-sapien-border lg:grid-cols-[284fr_424fr_252fr] lg:divide-x lg:divide-y-0">
          {groups.map(({ title, cases }) => (
            <div key={title} className="flex flex-col gap-3 px-3 py-4 text-center">
              <p className="font-sapien-mono text-[11px] leading-none tracking-tight text-accent">{title}</p>
              <ul className="flex flex-wrap justify-center gap-1">
                {cases.map(({ id, label }) => (
                  <li key={id}>
                    <button
                      type="button"
                      aria-controls={resultsId}
                      aria-pressed={selected?.id === id}
                      onClick={() => setSelectedId((current) => (current === id ? null : id))}
                      className={filterClass}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </fieldset>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {selected ? `Showing ${selected.label}.` : 'Showing all use cases.'}
      </p>
      <section id={resultsId} aria-label="Use case results">
        {groups.map(({ title, description, cases, shaded }) => {
          const visibleCases = selected ? cases.filter(({ id }) => id === selected.id) : cases;
          if (visibleCases.length === 0) return null;

          return (
            <div key={title} className={cn(shaded && 'bg-[#100f0d]')}>
              <div className="section-rails border-t border-sapien-border px-4 py-10 md:px-8 md:py-14">
                <h3 className="text-[28px] leading-[1.125] tracking-[-0.04em] md:text-[32px]">{title}</h3>
                <p className="mt-3 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
                  {description}
                </p>
              </div>
              {visibleCases.map(({ id, content }) => (
                <Fragment key={id}>{content}</Fragment>
              ))}
            </div>
          );
        })}
      </section>
    </>
  );
}
