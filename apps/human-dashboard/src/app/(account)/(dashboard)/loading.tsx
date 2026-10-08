/** Placeholder for a dashboard page while its data loads: a title block and a few rows. */
export default function DashboardLoading() {
  return (
    // biome-ignore lint/a11y/useSemanticElements: an <output> is for the result of a form, not a loading state
    <div role="status" className="flex animate-pulse flex-col gap-6 motion-reduce:animate-none">
      <span className="sr-only">Loading</span>
      <div className="flex flex-col gap-2.5">
        <div className="h-6 w-40 rounded bg-raised" />
        <div className="h-4 w-80 max-w-full rounded bg-raised" />
      </div>
      <div className="h-44 rounded-lg border border-border bg-subtle" />
    </div>
  );
}
