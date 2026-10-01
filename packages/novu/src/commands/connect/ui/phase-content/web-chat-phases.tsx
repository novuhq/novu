import { Box, Text, useInput } from 'ink';
import React from 'react';
import { resolveConnectEmbedRuntime } from '../../pipeline/web-chat/run-web-chat-setup';
import type { WebChatSetupMode } from '../../types';
import { WebChatEmbedFinishContent } from '../web-chat-embed-finish-content';
import { CopyableLink } from '../copyable-link';
import {
  type ConnectSuccessResult,
  describeEmbedSuccessNextStep,
  resolveWebChatSuccessPresentation,
} from '../format-web-chat-success';

export function WebChatHandoffContent({
  dashboardUrl,
  onContinue,
}: {
  dashboardUrl: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') onContinue();
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Web Chat linked</Text>
      <Text dimColor>Open the dashboard chat, or continue to add Web Chat to your app.</Text>
      <CopyableLink url={dashboardUrl} hint="Chat tab in dashboard:" hyperlink={false} />
      <Text dimColor>Press Enter to continue</Text>
    </Box>
  );
}

export function WebChatSetupPickContent({
  projectKind,
  onResolve,
}: {
  projectKind: 'empty' | 'project';
  onResolve: (mode: WebChatSetupMode) => void;
}): React.ReactElement {
  const options =
    projectKind === 'empty'
      ? [
          { label: 'Scaffold a new example app', value: 'scaffold' as const },
          { label: 'Skip for now', value: 'skip' as const },
        ]
      : [
          { label: 'Add to this project', value: 'embed' as const },
          { label: 'Skip for now', value: 'skip' as const },
        ];
  const [idx, setIdx] = React.useState(0);

  useInput((_input, key) => {
    if (key.upArrow) {
      setIdx((current) => (current - 1 + options.length) % options.length);
    } else if (key.downArrow) {
      setIdx((current) => (current + 1) % options.length);
    } else if (key.return) {
      onResolve(options[idx].value);
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Add Web Chat to your app</Text>
      <Text dimColor>
        {projectKind === 'empty'
          ? 'Start from a ready-made example in this folder.'
          : 'We will add Novu env vars here, then give you a prompt to paste into your coding agent.'}
      </Text>
      {options.map((opt, rowIndex) => {
        const isSelected = rowIndex === idx;

        return (
          <Text key={opt.value}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '› ' : '  '}
              {opt.label}
            </Text>
          </Text>
        );
      })}
      <Text dimColor>↑↓ to move · Enter to select</Text>
    </Box>
  );
}

export function WebChatInkSuccessContent({
  result,
  embedPrompt,
  embedPromptFile,
  onDismiss,
}: {
  result: ConnectSuccessResult;
  embedPrompt?: string;
  embedPromptFile?: string;
  onDismiss?: () => void | Promise<void>;
}): React.ReactElement | null {
  const presentation = resolveWebChatSuccessPresentation(result);

  if (presentation?.kind === 'embed') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">✓ Web Chat connected</Text>
        <WebChatEmbedFinishContent
          embedPrompt={embedPrompt ?? presentation.embedPrompt ?? ''}
          embedPromptFile={embedPromptFile ?? presentation.embedPromptFile}
          envPaths={result.webChatOutcome?.envPaths}
          connectMode={presentation.connectMode}
          alreadyWired={presentation.alreadyWired}
          onDismiss={onDismiss}
        />
      </Box>
    );
  }

  if (presentation?.kind === 'merged-scaffold') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">✓ Agent app ready with Web Chat.</Text>
        <Text>
          <Text bold>Agent:</Text> {presentation.agentName} <Text dimColor>({presentation.agentIdentifier})</Text>
        </Text>
        <Text>
          <Text bold>App:</Text> {presentation.appName}
        </Text>
        <Text bold>One Next.js app serves both:</Text>
        <Text color="cyan">Web Chat UI {presentation.chatUrl}</Text>
        <Text color="cyan">Agent handler {presentation.handlerRoute}</Text>
        {presentation.editAgentHint ? <Text dimColor>{presentation.editAgentHint}</Text> : null}
        <Text dimColor>{presentation.devCommand}</Text>
      </Box>
    );
  }

  if (presentation?.kind === 'standalone-scaffold') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">✓ Web Chat app ready.</Text>
        <Text>
          <Text bold>Local URL:</Text> {presentation.chatUrl}
        </Text>
        <Text dimColor>{presentation.devCommand}</Text>
      </Box>
    );
  }

  if (presentation?.kind === 'generic-linked') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">✓ Web Chat linked — add it to your app.</Text>
        {presentation.dashboardUrl ? (
          <Text color="cyan">Try chat in the dashboard: {presentation.dashboardUrl}</Text>
        ) : null}
        {presentation.embedPromptFile ? (
          <Text color="cyan">Embed prompt saved to: {presentation.embedPromptFile}</Text>
        ) : null}
        {presentation.projectDir ? <Text color="cyan">Example app: {presentation.projectDir}</Text> : null}
        {embedPrompt && !presentation.embedPromptFile ? (
          <>
            <Text bold>Next:</Text>
            <Text dimColor>
              {describeEmbedSuccessNextStep(resolveConnectEmbedRuntime(result.connectMode ?? 'ai-sdk'))}
            </Text>
          </>
        ) : null}
      </Box>
    );
  }

  return null;
}
