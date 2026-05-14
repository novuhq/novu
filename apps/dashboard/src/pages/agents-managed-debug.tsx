/**
 * DO NOT MERGE — debug-only managed-agent creation modal.
 *
 * Reproduces the simplest representation of the reverted nv-7643
 * managed-runtime UI for backend integration testing of the
 * POST /agents/skills + managed-runtime create-agent flow.
 *
 * To delete: remove this file and its route registration in main.tsx.
 */
import { AgentRuntimeProviderIdEnum, IntegrationKindEnum, slugify } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '@/api/api.client';
import { Button } from '@/components/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Input } from '@/components/primitives/input';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Textarea } from '@/components/primitives/textarea';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

type CreateIntegrationResponse = {
  data: { _id: string; identifier: string };
};

type UploadCustomSkillResponse = {
  data: { skillId: string };
};

type CreateAgentResponse = {
  data: { _id: string; identifier: string };
};

type SkillSourceMode = 'github' | 'inline';

const SKILL_MD_PLACEHOLDER = `---
name: my-pdf-skill
description: A PDF helper skill.
---

# My PDF Skill

Instructions go here.
`;

export function ManagedAgentDebugPage() {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const formId = useId();
  const apiKeyId = `${formId}-api-key`;
  const githubUrlId = `${formId}-github-url`;
  const skillMdId = `${formId}-skill-md`;

  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState<SkillSourceMode>('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [skillMd, setSkillMd] = useState('');

  const navigateBackToAgents = () => {
    if (!currentEnvironment) {
      navigate('/');

      return;
    }

    navigate(buildRoute(ROUTES.AGENTS, { environmentSlug: currentEnvironment.slug ?? '' }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected.');
      const trimmedApiKey = apiKey.trim();
      const trimmedGithubUrl = githubUrl.trim();

      const timestamp = Date.now();
      const generatedName = `Debug Agent ${timestamp}`;
      const generatedIdentifier = `${slugify(generatedName)}-${timestamp}`;

      const skillSource =
        mode === 'github'
          ? { type: 'github' as const, url: trimmedGithubUrl }
          : { type: 'inline' as const, content: skillMd };

      // Step 1: provision an Anthropic agent-runtime integration with the provided API key.
      const integrationResponse = await post<CreateIntegrationResponse>('/integrations', {
        body: {
          providerId: AgentRuntimeProviderIdEnum.Anthropic,
          kind: IntegrationKindEnum.AGENT,
          credentials: { apiKey: trimmedApiKey },
          configurations: {},
          name: `anthropic-debug-${timestamp}`,
          active: true,
          _environmentId: environment._id,
        },
        environment,
      });
      const integrationId = integrationResponse.data._id;

      // Step 2: upload the custom skill from the selected source.
      const uploadResponse = await post<UploadCustomSkillResponse>('/agents/skills', {
        body: {
          integrationId,
          source: skillSource,
        },
        environment,
      });
      const { skillId } = uploadResponse.data;

      // Step 3: create the managed agent referencing the uploaded skill.
      const agentResponse = await post<CreateAgentResponse>('/agents', {
        body: {
          name: generatedName,
          identifier: generatedIdentifier,
          runtime: 'managed',
          managedRuntime: {
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            integrationId,
            skills: [{ type: 'custom', skillId }],
          },
        },
        environment,
      });

      return { agentIdentifier: agentResponse.data.identifier, environmentSlug: environment.slug ?? '' };
    },
    onSuccess: ({ agentIdentifier, environmentSlug }) => {
      showSuccessToast('Managed agent created with custom skill.', 'Debug agent ready');
      navigate(buildRoute(ROUTES.AGENT_DETAILS, { environmentSlug, agentIdentifier }));
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Could not create the debug agent.';
      showErrorToast(message, 'Create failed');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      showErrorToast('Anthropic API key is required.', 'Missing fields');

      return;
    }

    if (mode === 'github' && !githubUrl.trim()) {
      showErrorToast('GitHub repository URL is required.', 'Missing fields');

      return;
    }

    if (mode === 'inline' && !skillMd.trim()) {
      showErrorToast('SKILL.md content is required.', 'Missing fields');

      return;
    }

    void createMutation.mutateAsync();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !createMutation.isPending) {
      navigateBackToAgents();
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-stroke-soft max-w-[480px] gap-0 overflow-hidden rounded-12 border p-0 shadow-xl sm:rounded-12"
        hideCloseButton
      >
        <div className="bg-error-base/10 border-error-base/40 border-b px-4 py-2">
          <p className="text-error-base text-label-xs font-semibold uppercase tracking-wide">
            DO NOT MERGE — debug only
          </p>
        </div>

        <div className="bg-bg-weak flex flex-col gap-1 p-4">
          <DialogTitle className="text-text-strong text-[16px] font-medium leading-6 tracking-[-0.176px]">
            Debug: create managed agent with custom skill
          </DialogTitle>
          <DialogDescription className="text-text-soft text-label-xs leading-4">
            Provisions an Anthropic agent-runtime integration, uploads a custom skill from the supplied source, and
            creates a managed agent that references the resulting <code>skillId</code>.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="border-stroke-soft bg-background border-y">
            <div className="flex flex-col gap-5 p-4">
              <div className="flex flex-col gap-1">
                <label htmlFor={apiKeyId} className="text-text-strong text-label-xs font-medium">
                  Anthropic API key
                </label>
                <Input
                  id={apiKeyId}
                  size="2xs"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-text-strong text-label-xs font-medium">Skill source</span>
                <SegmentedControl value={mode} onValueChange={(v) => setMode(v as SkillSourceMode)}>
                  <SegmentedControlList>
                    <SegmentedControlTrigger value="github">GitHub URL</SegmentedControlTrigger>
                    <SegmentedControlTrigger value="inline">SKILL.md text</SegmentedControlTrigger>
                  </SegmentedControlList>
                </SegmentedControl>
              </div>

              {mode === 'github' ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor={githubUrlId} className="text-text-strong text-label-xs font-medium">
                    GitHub repository URL
                  </label>
                  <Input
                    id={githubUrlId}
                    size="2xs"
                    className="font-mono"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/anthropics/claude-skills/tree/main/document-skills/pdf"
                  />
                  <p className="text-text-soft text-paragraph-xs leading-4">
                    Must point at a public folder containing <code>SKILL.md</code> at its root. Accepts repo root,{' '}
                    <code>/tree/&#123;ref&#125;</code>, or <code>/tree/&#123;ref&#125;/&#123;path&#125;</code>.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label htmlFor={skillMdId} className="text-text-strong text-label-xs font-medium">
                    SKILL.md content
                  </label>
                  <Textarea
                    id={skillMdId}
                    simple
                    className="min-h-40 font-mono"
                    spellCheck={false}
                    value={skillMd}
                    onChange={(e) => setSkillMd(e.target.value)}
                    placeholder={SKILL_MD_PLACEHOLDER}
                  />
                  <p className="text-text-soft text-paragraph-xs leading-4">
                    Must start with YAML frontmatter containing a <code>name</code> field — Anthropic uses it as the
                    bundle folder name.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-4 py-3">
            <Button variant="secondary" mode="ghost" size="xs" type="button" onClick={navigateBackToAgents}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              mode="gradient"
              size="xs"
              type="submit"
              isLoading={createMutation.isPending}
            >
              Create managed agent
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
