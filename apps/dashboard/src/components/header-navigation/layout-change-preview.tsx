import { ChannelTypeEnum, type EmailRenderOutput, type IEnvironment, ResourceOriginEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { RiCodeSSlashLine, RiEyeLine } from 'react-icons/ri';
import { previewLayout } from '@/api/layouts';
import { formatHtml } from '@/utils/formatter';
import { QueryKeys } from '@/utils/query-keys';
import { SegmentedControl, SegmentedControlList, SegmentedControlTrigger } from '../primitives/segmented-control';
import { Skeleton } from '../primitives/skeleton';
import { EmailPreviewBody } from '../workflow-editor/steps/email/email-preview';
import type { FieldsDiff, LayoutContentPreview } from './change-sections';
import { diffTextLines, type JsonLineDiff } from './json-line-diff';
import { EnvironmentHeader, type EnvironmentNames, JsonDiffCompare } from './payload-schema-preview';
import type { PublishEnvironments } from './step-change-list';

type LayoutView = 'preview' | 'html';

export function LayoutContentCompare({
  layoutId,
  preview,
  savedBodyDiff,
  environments,
  environmentNames,
}: {
  layoutId: string;
  preview: LayoutContentPreview;
  savedBodyDiff: FieldsDiff;
  environments: PublishEnvironments;
  environmentNames: EnvironmentNames;
}) {
  const [view, setView] = useState<LayoutView>('preview');

  return (
    <div className="mt-1 flex min-w-0 flex-col gap-1.5 rounded-lg border border-stroke-soft bg-bg-white p-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 gap-1.5">
          <EnvironmentHeader name={environmentNames.target} tone="feature" />
          <EnvironmentHeader name={environmentNames.source} tone="warning" />
        </div>
        <SegmentedControl value={view} onValueChange={(value) => setView(value as LayoutView)} className="shrink-0">
          <SegmentedControlList
            className="w-auto gap-px rounded-[7px] bg-bg-muted p-px"
            floatingBgClassName="inset-y-px"
          >
            <SegmentedControlTrigger value="preview" className="gap-1.5 px-2 text-label-xs">
              <RiEyeLine className="size-[15px]" />
              Preview
            </SegmentedControlTrigger>
            <SegmentedControlTrigger value="html" className="gap-1.5 px-2 text-label-xs">
              <RiCodeSSlashLine className="size-[15px]" />
              HTML
            </SegmentedControlTrigger>
          </SegmentedControlList>
        </SegmentedControl>
      </div>

      {view === 'preview' ? (
        <div className="flex items-start gap-1.5">
          <LayoutPreviewPane
            environment={environments.target}
            environmentName={environmentNames.target}
            layoutId={layoutId}
            controlValues={preview.previous}
          />
          <LayoutPreviewPane
            environment={environments.source}
            environmentName={environmentNames.source}
            layoutId={layoutId}
            controlValues={preview.next}
          />
        </div>
      ) : (
        <LayoutHtmlDiff
          layoutId={layoutId}
          preview={preview}
          savedBodyDiff={savedBodyDiff}
          environments={environments}
          environmentNames={environmentNames}
        />
      )}
    </div>
  );
}

function LayoutHtmlDiff({
  layoutId,
  preview,
  savedBodyDiff,
  environments,
  environmentNames,
}: {
  layoutId: string;
  preview: LayoutContentPreview;
  savedBodyDiff: FieldsDiff;
  environments: PublishEnvironments;
  environmentNames: EnvironmentNames;
}) {
  if (comparesSavedHtml(preview)) {
    return (
      <JsonDiffCompare
        lineDiff={savedBodyDiff.lineDiff}
        hasPrevious={savedBodyDiff.hasPrevious}
        hasNext={savedBodyDiff.hasNext}
        environmentNames={environmentNames}
      />
    );
  }

  return (
    <HtmlSourceCompare
      layoutId={layoutId}
      preview={preview}
      environments={environments}
      environmentNames={environmentNames}
    />
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function emailEditorType(controlValues: Record<string, unknown> | null): string | null {
  if (!controlValues || !isRecord(controlValues.email)) return null;

  const editorType = controlValues.email.editorType;

  return typeof editorType === 'string' ? editorType : null;
}

/** HTML layouts store Liquid. An empty sample payload skips branches, so the HTML tab diffs the saved template. */
function comparesSavedHtml(preview: LayoutContentPreview): boolean {
  const sides = [preview.previous, preview.next].filter((side) => side !== null);

  return sides.length > 0 && sides.every((side) => emailEditorType(side) === 'html');
}

/** Pretty-print the rendered email. A block layout stores a Maily document, which is JSON, not HTML. */
async function formatRenderedHtml(value: string | null): Promise<string | null> {
  if (!value) return null;

  try {
    return await formatHtml(value);
  } catch {
    return value;
  }
}

function useFormattedHtmlDiff(previous: string | null, next: string | null, ready: boolean): JsonLineDiff | null {
  const [lineDiff, setLineDiff] = useState<JsonLineDiff | null>(null);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    void Promise.all([formatRenderedHtml(previous), formatRenderedHtml(next)]).then(([left, right]) => {
      if (cancelled) return;

      setLineDiff(diffTextLines(left, right));
    });

    return () => {
      cancelled = true;
    };
  }, [previous, next, ready]);

  if (!ready) return null;

  return lineDiff;
}

function HtmlSourceCompare({
  layoutId,
  preview,
  environments,
  environmentNames,
}: {
  layoutId: string;
  preview: LayoutContentPreview;
  environments: PublishEnvironments;
  environmentNames: EnvironmentNames;
}) {
  const previous = useRenderedLayoutHtml(environments.target, layoutId, preview.previous);
  const next = useRenderedLayoutHtml(environments.source, layoutId, preview.next);
  const lineDiff = useFormattedHtmlDiff(previous.html, next.html, previous.ready && next.ready);

  if (!lineDiff) {
    return (
      <div className="flex gap-1.5">
        <Skeleton className="h-40 min-w-0 flex-1" />
        <Skeleton className="h-40 min-w-0 flex-1" />
      </div>
    );
  }

  return (
    <JsonDiffCompare
      lineDiff={lineDiff}
      hasPrevious={previous.html !== null}
      hasNext={next.html !== null}
      environmentNames={environmentNames}
    />
  );
}

function useLayoutPreviewQuery(
  environment: IEnvironment | undefined,
  layoutId: string,
  controlValues: Record<string, unknown> | null
) {
  return useQuery({
    queryKey: [QueryKeys.previewLayout, 'publish', environment?._id, layoutId, controlValues],
    queryFn: ({ signal }) => {
      if (!environment || !controlValues) throw new Error('Layout preview is missing an environment');

      return previewLayout({
        environment,
        layoutSlug: layoutId,
        previewData: { controlValues, previewPayload: {} },
        signal,
      });
    },
    enabled: Boolean(environment && controlValues),
  });
}

function renderedHtml(data: { result: { type?: string; preview?: unknown } } | undefined): string | null {
  if (data?.result.type !== ChannelTypeEnum.EMAIL) return null;

  const preview = data.result.preview as EmailRenderOutput | undefined;
  if (!preview?.body) return null;

  return preview.body;
}

function useRenderedLayoutHtml(
  environment: IEnvironment | undefined,
  layoutId: string,
  controlValues: Record<string, unknown> | null
): { html: string | null; ready: boolean } {
  const { data, isPending, isError } = useLayoutPreviewQuery(environment, layoutId, controlValues);

  if (!controlValues || isError) {
    return { html: null, ready: true };
  }

  if (isPending) {
    return { html: null, ready: false };
  }

  return { html: renderedHtml(data), ready: true };
}

function LayoutPreviewPane({
  environment,
  environmentName,
  layoutId,
  controlValues,
}: {
  environment: IEnvironment | undefined;
  environmentName: string;
  layoutId: string;
  controlValues: Record<string, unknown> | null;
}) {
  const { data, isPending, isError } = useLayoutPreviewQuery(environment, layoutId, controlValues);

  if (!controlValues) {
    return <PaneMessage>{`Not in ${environmentName}`}</PaneMessage>;
  }

  if (isError) {
    return <PaneMessage>Couldn't load the preview</PaneMessage>;
  }

  if (isPending) {
    return (
      <div className="min-w-0 flex-1 rounded-md border border-stroke-soft bg-bg-white p-3">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const body = renderedHtml(data);
  if (!body) {
    return <PaneMessage>No preview available</PaneMessage>;
  }

  return (
    <div className="max-h-[400px] min-w-0 flex-1 self-stretch overflow-auto rounded-md border border-stroke-soft bg-bg-white">
      <EmailPreviewBody body={body} resourceOrigin={ResourceOriginEnum.NOVU_CLOUD} readOnlyBranding />
    </div>
  );
}

function PaneMessage({ children }: { children: string }) {
  return (
    <div className="flex min-h-24 min-w-0 flex-1 items-center justify-center self-stretch rounded-md border border-stroke-soft bg-bg-white p-3">
      <span className="text-center text-paragraph-xs text-text-soft">{children}</span>
    </div>
  );
}
