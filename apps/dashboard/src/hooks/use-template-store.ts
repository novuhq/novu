import { StepCreateDto, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { IWorkflowSuggestion } from '@/components/template-store/types';
import { extractApiItems } from '@/utils/api-response-normalizer';

export type QuickTemplate = {
  workflowId: string;
  name: string;
  description: string;
  steps: StepTypeEnum[];
  tags: string[];
};

const typeMap: Record<string, StepTypeEnum> = {
  trigger: StepTypeEnum.TRIGGER,
  email: StepTypeEnum.EMAIL,
  sms: StepTypeEnum.SMS,
  in_app: StepTypeEnum.IN_APP,
  inapp: StepTypeEnum.IN_APP,
  push: StepTypeEnum.PUSH,
  chat: StepTypeEnum.CHAT,
  delay: StepTypeEnum.DELAY,
  digest: StepTypeEnum.DIGEST,
  custom: StepTypeEnum.CUSTOM,
};

function normalizeStepType(input: unknown): StepTypeEnum {
  if (typeof input === 'string') {
    const key = input.toLowerCase();
    if (typeMap[key]) return typeMap[key];
    const upper = key.toUpperCase() as keyof typeof StepTypeEnum;
    if (StepTypeEnum[upper]) return StepTypeEnum[upper as keyof typeof StepTypeEnum];
  }

  return StepTypeEnum.IN_APP;
}

function normalizeControlValuesForType(type: StepTypeEnum, values: Record<string, unknown>) {
  const nextValues: Record<string, unknown> = { ...(values || {}) };

  const coalesceText = (...keys: string[]) => {
    for (const key of keys) {
      if (key in nextValues && nextValues[key] != null) return nextValues[key] as unknown;
    }
    return undefined;
  };

  if (type === StepTypeEnum.EMAIL) {
    let body: unknown = (nextValues as { body?: unknown }).body;
    if (!body) body = coalesceText('content', 'html', 'message', 'bodyJson');
    if (body && typeof body !== 'string') {
      nextValues.body = JSON.stringify(body);
    } else if (typeof body === 'string') {
      nextValues.body = body;
    }

    if ('layoutId' in nextValues) delete (nextValues as { layoutId?: unknown }).layoutId;
    if ('layout' in nextValues) delete (nextValues as { layout?: unknown }).layout;
    if ('selectedLayoutId' in nextValues) delete (nextValues as { selectedLayoutId?: unknown }).selectedLayoutId;

    if (!('subject' in nextValues)) {
      const subject = coalesceText('title', 'subjectText');
      if (typeof subject === 'string') nextValues.subject = subject;
    }
  }

  if (type === StepTypeEnum.IN_APP) {
    if (!('body' in nextValues)) {
      const text = coalesceText('content', 'message', 'text');
      if (typeof text === 'string') nextValues.body = text;
    }

    if (!('primaryAction' in nextValues)) {
      const label = coalesceText('ctaLabel', 'primaryLabel', 'buttonText');
      const url = coalesceText('ctaUrl', 'redirectUrl', 'url');
      if (typeof label === 'string' && typeof url === 'string') {
        nextValues.primaryAction = {
          label,
          redirect: { url, target: '_self' },
        };
      }
    }
  }

  if (type === StepTypeEnum.SMS || type === StepTypeEnum.CHAT || type === StepTypeEnum.PUSH) {
    if (!('body' in nextValues)) {
      const text = coalesceText('content', 'message', 'text');
      if (typeof text === 'string') nextValues.body = text;
    }
    if (type === StepTypeEnum.PUSH && !('subject' in nextValues)) {
      const subject = coalesceText('title', 'subjectText');
      if (typeof subject === 'string') nextValues.subject = subject;
    }
  }

  return nextValues;
}

function mapApiWorkflowsToQuickTemplates(items: unknown[]): QuickTemplate[] {
  type ApiWorkflowListItem = {
    workflowId?: string;
    slug?: string;
    id?: string;
    _id?: string;
    steps?: Array<{ type?: unknown }>;
    name?: string;
    description?: string;
    tags?: string[];
  };

  return (Array.isArray(items) ? items : []).map((rawItem) => {
    const rawWorkflow = rawItem as ApiWorkflowListItem;
    const workflowId = rawWorkflow.workflowId || rawWorkflow.slug || rawWorkflow.id || rawWorkflow._id || '';
    const rawSteps = Array.isArray(rawWorkflow.steps) ? (rawWorkflow.steps as Array<{ type?: unknown }>) : [];
    const steps = rawSteps.map((rawStep) => normalizeStepType(rawStep?.type as unknown));
    const tags = Array.isArray(rawWorkflow.tags) ? rawWorkflow.tags : [];

    return {
      workflowId: String(workflowId || 'workflow'),
      name: rawWorkflow.name || 'Untitled',
      description: rawWorkflow.description || '',
      steps,
      tags,
    };
  });
}

function mapApiWorkflowsToSuggestions(items: unknown[]): IWorkflowSuggestion[] {
  type ApiWorkflow = {
    id?: string;
    _id?: string;
    workflowId?: string;
    slug?: string;
    name?: string;
    description?: string;
    tags?: string[];
    active?: boolean;
    status?: string;
    payloadSchema?: unknown;
    steps?: Array<{
      name?: string;
      type?: StepTypeEnum | string;
      controlValues?: Record<string, unknown>;
    }>;
  };

  return (Array.isArray(items) ? items : []).map((rawItem) => {
    const rawWorkflow = rawItem as ApiWorkflow;
    const workflowId = rawWorkflow.workflowId || rawWorkflow.slug || rawWorkflow.id || rawWorkflow._id || '';
    const rawSteps = Array.isArray(rawWorkflow.steps) ? rawWorkflow.steps : [];

    const steps: StepCreateDto[] = rawSteps.map((rawStep, index) => {
      const rawStepData = rawStep as unknown as {
        controlValues?: Record<string, unknown>;
        controls?: { values?: Record<string, unknown> };
      };
      const type = normalizeStepType(rawStep?.type);
      const baseValues = rawStepData?.controlValues ?? rawStepData?.controls?.values ?? {};
      const controlValues = normalizeControlValuesForType(type, baseValues);

      return {
        name: rawStep?.name || String(rawStep?.type) || `Step ${index + 1}`,
        type,
        controlValues,
      };
    });

    const workflowTags = Array.isArray(rawWorkflow.tags) ? rawWorkflow.tags : [];

    const rawPayloadSchema =
      (rawWorkflow as { payloadSchema?: unknown }).payloadSchema ??
      (rawWorkflow as Record<string, unknown>)['payload_schema'] ??
      (rawWorkflow as Record<string, unknown>)['payload'] ??
      (rawWorkflow as Record<string, unknown>)['schema'] ??
      (rawWorkflow as Record<string, unknown>)['inputSchema'];

    const payloadSchema =
      rawPayloadSchema && typeof rawPayloadSchema === 'object' && !Array.isArray(rawPayloadSchema)
        ? (rawPayloadSchema as object)
        : undefined;

    return {
      id: String(rawWorkflow.id ?? workflowId ?? Math.random()),
      name: rawWorkflow.name || 'Untitled',
      description: rawWorkflow.description || '',
      tags: workflowTags,
      workflowDefinition: {
        name: rawWorkflow.name || 'Untitled',
        description: rawWorkflow.description || '',
        workflowId: String(workflowId || 'workflow'),
        steps,
        tags: workflowTags,
        active: typeof rawWorkflow.active === 'boolean' ? rawWorkflow.active : rawWorkflow.status === 'ACTIVE',
        __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
        payloadSchema,
      },
    };
  });
}

// Helper function to extract unique tags from all suggestions
function extractUniqueTags(suggestions: IWorkflowSuggestion[]): string[] {
  const allTags = suggestions.flatMap((suggestion) => suggestion.tags);
  return Array.from(new Set(allTags)).sort();
}

export function useTemplateStore() {
  const [suggestions, setSuggestions] = useState<IWorkflowSuggestion[]>([]);
  const [quickTemplates, setQuickTemplates] = useState<QuickTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;
    setIsLoading(true);

    const load = async () => {
      try {
        const templatesApiUrl = import.meta.env.VITE_TEMPLATES_API_URL || 'https://templates-novuhq.vercel.app';
        const requestUrl = `${templatesApiUrl}/api/workflows?refresh=1`;
        const response = await fetch(requestUrl, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!isMounted) return;

        if (!response.ok) {
          setSuggestions([]);
          setQuickTemplates([]);
          return;
        }

        const body = await response.json();
        if (!isMounted) return;

        if (!body) {
          setSuggestions([]);
          setQuickTemplates([]);
          return;
        }

        const items = extractApiItems(body);

        if (isMounted) {
          const suggestions = mapApiWorkflowsToSuggestions(items);
          const quickTemplates = mapApiWorkflowsToQuickTemplates(items);

          setSuggestions(suggestions);
          setQuickTemplates(quickTemplates);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        if (isMounted) {
          setSuggestions([]);
          setQuickTemplates([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const availableTags = useMemo(() => extractUniqueTags(suggestions), [suggestions]);

  return {
    suggestions,
    quickTemplates,
    isLoading,
    availableTags,
  };
}
