'use client';

import { ArrowUpRight, Copy, TriangleAlert } from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { SwappingCode, WithSlots } from '@/components/connect/connect-prompt-box';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { MorphingText } from '@/components/ui/morphing-text';
import type { ConnectCodeState, HeldCode } from '@/hooks/use-connect-code';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import {
  CONNECTOR_CAPTION,
  chatPrompt,
  cliCaption,
  cliScript,
  connectorSteps,
  copiesAlone,
  type HostWay,
  mcpCaption,
  mcpScript,
  pluginCaption,
  pluginScript,
  promptCaption,
  promptText,
  type Script,
  wayLabel,
} from '@/lib/host-ways';
import { type ChatApp, type CommandHost, type Host, type HostId, hostOf } from '@/lib/hosts';
import { cn } from '@/lib/utils';

/** How long one view of the box takes to fade out before the next fades in. */
const SWAP_MS = 150;

/** The lines of the skeleton, as wide as the commands' notes and lines are about; `null` is the gap between steps. */
const SKELETON_LINES = ['46%', '96%', null, '60%', '86%', null, '28%', '54%'];

type HostSetupBoxProps = {
  /** The host chosen in the picker. */
  host: Host;
  /** The ways each host has here, the first one being the one it opens on (`waysOf`, less what isn't set up). */
  waysFor: (host: Host) => HostWay[];
  /** The way on show for a host: the one last chosen for it, or its first. */
  wayFor: (host: Host) => HostWay;
  onWayChange: (way: HostWay) => void;
  /** The agent, as `connect` names it. */
  handle: string;
  /** The agent's address, which the chat apps' prompt names. */
  address?: string | null;
  /** The API the account lives on. */
  apiUrl: string;
  /** The one-time code for the host on show, when it runs commands (`useHostConnectCode`). */
  code: ConnectCodeState;
  onRetry: () => void;
  /** The hosted MCP server. Without one, the ways that need it are left out (`waysFor`). */
  mcpUrl: string;
};

/**
 * The box under the picker (`Prompt` in `1.4 · Connect · prompt`): a tab for each way the chosen host connects,
 * a single one for a host with one way, and the button that copies what the box shows (or, for Cursor's server,
 * adds it). The commands carry the one-time code; a quiet skeleton stands in while it's on its
 * way, and a short error with "Try again" when it couldn't be had.
 *
 * The box stays where it is while the host or the tab changes: its tabs and its words fade from one to the
 * next, the button's label slides to its new width, and the box grows or shrinks to what it shows next.
 */
export function HostSetupBox({
  host,
  waysFor,
  wayFor,
  onWayChange,
  handle,
  address,
  apiUrl,
  code,
  onRetry,
  mcpUrl,
}: HostSetupBoxProps) {
  const tabsId = useId();
  const way = wayFor(host);
  // Each host's code as it last was, so a host's commands keep theirs while they fade out for the next host's.
  const codes = useCodesByHost(host, code);

  const lead = useSwap(host.id, SWAP_MS);
  const leadHost = hostOf(lead.shown);
  const status = host.group === 'commands' && way === 'cli' ? code.status : 'ready';
  const body = useSwap(`${host.id}:${way}:${status}`, SWAP_MS);
  const { ref, height } = useMeasuredHeight();

  const details = { handle, address, apiUrl, mcpUrl, codes, onRetry, error: code.status === 'error' ? code.error : '' };

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-strong bg-subtle">
      {/* The header and the words differ in height from one view to the next; the box follows while they fade. */}
      <div style={{ height }} className="transition-[height] duration-300 ease-out motion-reduce:transition-none">
        <div ref={ref}>
          {/* Where the tabs and the button don't fit side by side, as on a phone, the button goes under them. */}
          <div className="flex flex-wrap items-center gap-2.5 bg-raised py-2 pr-2 pl-4">
            <div
              key={lead.shown}
              className={cn(
                'min-w-0',
                lead.leaving
                  ? 'pointer-events-none opacity-0 transition-opacity duration-150 ease-in motion-reduce:transition-none'
                  : 'animate-overlay-in motion-reduce:animate-none'
              )}
            >
              <WayTabs
                host={leadHost}
                ways={waysFor(leadHost)}
                way={wayFor(leadHost)}
                onChange={onWayChange}
                idPrefix={tabsId}
              />
            </div>
            <BoxAction host={host} way={way} code={code} details={details} />
          </div>

          <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${way}`}>
            <div
              key={body.shown}
              className={cn(
                body.leaving
                  ? 'opacity-0 transition-opacity duration-150 ease-in motion-reduce:transition-none'
                  : 'animate-overlay-in motion-reduce:animate-none'
              )}
            >
              <BoxBody view={body.shown} details={details} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type Details = {
  handle: string;
  address?: string | null;
  apiUrl: string;
  mcpUrl: string;
  /** The code each host that runs commands last had. */
  codes: Partial<Record<HostId, HeldCode>>;
  onRetry: () => void;
  /** Why the code couldn't be had, when it couldn't. */
  error: string;
};

/** The host's code as it last was ready, kept for each host. */
function useCodesByHost(host: Host, code: ConnectCodeState): Partial<Record<HostId, HeldCode>> {
  const [codes, setCodes] = useState<Partial<Record<HostId, HeldCode>>>({});
  // The code belongs to the host on show only while that host runs commands (`useHostConnectCode`).
  if (host.group === 'commands' && code.status === 'ready' && codes[host.id] !== code.code) {
    setCodes({ ...codes, [host.id]: code.code });
  }

  return codes;
}

/** The header's button: copies what the box shows, or opens the link that adds the server in one click. */
function BoxAction({
  host,
  way,
  code,
  details,
}: {
  host: Host;
  way: HostWay;
  code: ConnectCodeState;
  details: Details;
}) {
  const action = actionOf(host, way, code, details);
  const className = cn(SMALL_BUTTON, 'ml-auto');

  if (action.kind === 'link') {
    return (
      <a href={action.href} className={buttonClassName('primary', className)}>
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
        <MorphingText text={action.label} />
      </a>
    );
  }

  if (action.kind === 'waiting') {
    return (
      <Button className={className} disabled>
        <Copy aria-hidden="true" className="size-3.5" />
        <MorphingText text={action.label} />
      </Button>
    );
  }

  return (
    <CopyButton value={action.value} label={action.copyLabel} variant="primary" className={className}>
      <MorphingText text={action.label} />
    </CopyButton>
  );
}

type Action =
  | { kind: 'copy'; label: string; copyLabel: string; value: string }
  | { kind: 'link'; label: string; href: string }
  /** The commands' code isn't there yet: the button waits for it. */
  | { kind: 'waiting'; label: string };

function actionOf(host: Host, way: HostWay, code: ConnectCodeState, details: Details): Action {
  if (host.group === 'chat') {
    return way === 'prompt'
      ? {
          kind: 'copy',
          label: 'Copy prompt',
          copyLabel: 'Copy the prompt',
          value: promptText(chatPrompt(host, details)),
        }
      : { kind: 'copy', label: 'Copy URL', copyLabel: 'Copy the MCP server address', value: details.mcpUrl };
  }

  if (way === 'cli') {
    return code.status === 'ready'
      ? {
          kind: 'copy',
          label: 'Copy commands',
          copyLabel: 'Copy the commands',
          value: cliScript(host, codeDetails(details, code.code)).copy,
        }
      : { kind: 'waiting', label: 'Copy commands' };
  }

  if (way === 'plugin') {
    return { kind: 'copy', label: 'Copy commands', copyLabel: 'Copy the commands', value: pluginScript(host).copy };
  }

  const alternative = host.alternative;
  if (alternative?.kind === 'mcp-config' && alternative.installLink) {
    return { kind: 'link', label: alternative.installLink.label, href: alternative.installLink.href(details.mcpUrl) };
  }

  // A host that adds the server with a command copies that, with its sign-in command where it has one (OpenCode;
  // Hermes signs in within the first); any other copies its config.
  const commands = alternative?.kind === 'mcp-config' && alternative.addCommand !== undefined;
  const what = commands ? (alternative?.signInCommand ? 'commands' : 'command') : 'config';

  return {
    kind: 'copy',
    label: `Copy ${what}`,
    copyLabel: `Copy the ${what}`,
    value: mcpScript(host, details.mcpUrl).copy,
  };
}

function codeDetails(details: Details, code: HeldCode) {
  return { handle: code.handle, code: code.code, apiUrl: details.apiUrl };
}

/** What the box shows for a view, `<host>:<way>:<code status>` as `HostSetupBox` keys it. */
function BoxBody({ view, details }: { view: string; details: Details }) {
  const [id, way, status] = view.split(':') as [HostId, HostWay, ConnectCodeState['status']];
  const host = hostOf(id);

  if (host.group === 'chat') {
    return way === 'prompt' ? (
      <PromptView host={host} details={details} />
    ) : (
      <ConnectorView host={host} details={details} />
    );
  }

  if (way === 'cli') {
    const code = details.codes[host.id];
    if (status === 'error') {
      return <CodeError error={details.error} onRetry={details.onRetry} />;
    }

    return status === 'ready' && code ? (
      <CliView host={host} code={code} details={details} />
    ) : (
      <Skeleton host={host} />
    );
  }

  const script = way === 'plugin' ? pluginScript(host) : mcpScript(host, details.mcpUrl);

  return (
    <Words caption={way === 'plugin' ? pluginCaption(host) : mcpCaption(host)}>
      <ScriptLines script={script} />
    </Words>
  );
}

/** The commands, with the code in the first one (`1.4b · Connect · CLI`). */
function CliView({ host, code, details }: { host: CommandHost; code: HeldCode; details: Details }) {
  return (
    <Words caption={cliCaption(host)}>
      <ScriptLines
        script={cliScript(host, codeDetails(details, code))}
        slots={[{ text: code.code, render: (text) => <SwappingCode code={text} /> }]}
      />
    </Words>
  );
}

/** A chat app's own steps, numbered, with the server's address in orange after the step that pastes it (`1.4c`). */
function ConnectorView({ host, details }: { host: ChatApp; details: Details }) {
  return (
    <Words caption={CONNECTOR_CAPTION}>
      <ol className="text-foreground/85">
        {connectorSteps(host, details.mcpUrl).map((step, index) => (
          <li key={step.text} className="pl-[3ch] -indent-[3ch]">
            {index + 1}. {step.text}
            {step.paste && <span className="my-5 block indent-0 text-accent">{step.paste}</span>}
          </li>
        ))}
      </ol>
    </Words>
  );
}

/** What to paste into the chat app (`1.4 · Connect · prompt`, without the commands). */
function PromptView({ host, details }: { host: ChatApp; details: Details }) {
  return (
    <Words caption={promptCaption(host)}>
      <span className="block text-foreground/60">
        {chatPrompt(host, details).map((line, index) => (
          // The lines of a prompt never reorder, so where a line stands is its key.
          <span key={index} className="block min-h-5">
            {line.map((span) => (
              <span
                key={span.text}
                className={cn(span.tone === 'strong' && 'text-foreground', span.tone === 'accent' && 'text-accent')}
              >
                {span.text}
              </span>
            ))}
          </span>
        ))}
      </span>
    </Words>
  );
}

/** The box's words in its mono type, and the caption under them. */
function Words({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="font-mono text-[12.5px] leading-5 wrap-anywhere whitespace-pre-wrap">{children}</div>
      <p className="font-mono text-[11px] leading-3.5 text-muted">{caption}</p>
    </div>
  );
}

type ScriptLinesProps = {
  script: Script;
  /** Stretches of the commands to draw their own way: the code, which fades in where the last one was. */
  slots?: Parameters<typeof WithSlots>[0]['slots'];
};

/** A script's lines: its notes in a quiet color, each command after its prompt, and a config as it is pasted. */
function ScriptLines({ script, slots = [] }: ScriptLinesProps) {
  return script.lines.map((line, index) => {
    // The lines never reorder, so where a line stands is its key.
    switch (line.kind) {
      case 'gap':
        return <span key={index} aria-hidden="true" className="block h-5" />;
      case 'note':
        return (
          <span key={index} className="block pl-[2ch] -indent-[2ch] text-foreground/40">
            # {line.text}
          </span>
        );
      case 'command':
        return (
          <span key={index} className="flex items-start gap-2">
            <span className="block min-w-0 flex-1 pl-[2ch] -indent-[2ch] text-foreground">
              <span aria-hidden="true" className="text-accent select-none">
                {line.prompt}{' '}
              </span>
              <WithSlots text={line.text} slots={slots} />
            </span>
            {copiesAlone(script, line) && <InlineCopy value={line.text} label="Copy the command" />}
          </span>
        );
      case 'snippet':
        return (
          <span key={index} className="flex items-start gap-2">
            <code className="block min-w-0 flex-1 overflow-x-auto whitespace-pre text-foreground">{line.text}</code>
            {copiesAlone(script, line) && <InlineCopy value={line.text} label={line.label} />}
          </span>
        );
      default: {
        const exhaustive: never = line;

        return exhaustive;
      }
    }
  });
}

/** A copy button for a line the box's own button leaves out. */
function InlineCopy({ value, label }: { value: string; label: string }) {
  return <CopyButton value={value} label={label} className="-my-0.5 size-6 shrink-0" iconClassName="size-3" />;
}

/** Stands in for the commands while the code is on its way. */
function Skeleton({ host }: { host: CommandHost }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {/* biome-ignore lint/a11y/useSemanticElements: an <output> is for the result of a form, not a loading state */}
      <div role="status" className="flex animate-pulse flex-col motion-reduce:animate-none">
        <span className="sr-only">Getting a one-time code</span>
        {SKELETON_LINES.map((width, index) => (
          // The lines never change, so where a line stands is its key.
          <span key={index} className="flex h-5 items-center">
            {width && <span className="h-2.5 rounded-sm bg-border" style={{ width }} />}
          </span>
        ))}
      </div>
      <p className="font-mono text-[11px] leading-3.5 text-muted">{cliCaption(host)}</p>
    </div>
  );
}

function CodeError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 p-4">
      <p className="flex items-start gap-1.5 text-[13px] leading-4.5 text-secondary">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {error}
      </p>
      <Button variant="secondary" className={SMALL_BUTTON} onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

type WayTabsProps = {
  host: Host;
  ways: HostWay[];
  way: HostWay;
  onChange: (way: HostWay) => void;
  /** Each tab is `<idPrefix>-<way>`, and the panel they control `<idPrefix>-panel`. */
  idPrefix: string;
};

/** Where the arrow keys, Home and End take the choice, from the tab chosen now. */
const TAB_KEYS: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index) => index + 1,
  ArrowLeft: (index) => index - 1,
  Home: () => 0,
  End: (_, count) => count - 1,
};

/**
 * The ways in as tabs (`Method` in the design), one for a host with one way, with the lighter tile under the
 * chosen one sliding across when it changes. One stop for Tab: the arrow keys, Home and End move between them
 * and choose as they go.
 */
function WayTabs({ host, ways, way, onChange, idPrefix }: WayTabsProps) {
  const buttons = useRef<Partial<Record<HostWay, HTMLButtonElement | null>>>({});
  const [tile, setTile] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    const button = buttons.current[way];
    if (button) {
      setTile({ left: button.offsetLeft, width: button.offsetWidth });
    }
  }, [way]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const move = TAB_KEYS[event.key];
    if (!move) {
      return;
    }

    event.preventDefault();
    const next = ways[(move(ways.indexOf(way), ways.length) + ways.length) % ways.length];
    onChange(next);
    buttons.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={`How ${host.name} connects`}
      onKeyDown={handleKeyDown}
      className="relative flex gap-0.5 rounded-lg border border-[#2e2e2e] bg-[#0e0e0e] p-0.5"
    >
      {tile && (
        <span
          aria-hidden="true"
          style={tile}
          className="absolute inset-y-0.5 rounded-md bg-[#1f1f1f] transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
        />
      )}
      {ways.map((id) => (
        <button
          key={id}
          ref={(button) => {
            buttons.current[id] = button;
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-${id}`}
          aria-selected={way === id}
          aria-controls={`${idPrefix}-panel`}
          tabIndex={way === id ? 0 : -1}
          onClick={() => onChange(id)}
          className={cn(
            'relative rounded-md px-2.5 py-1 text-xs leading-4 transition-colors duration-200 ease-out focus-visible:outline-offset-1 motion-reduce:transition-none',
            way === id ? 'font-medium text-foreground' : 'text-foreground/50 hover:text-foreground/80',
            // Until the sliding tile has been placed, the chosen tab draws its own.
            way === id && !tile && 'bg-[#1f1f1f]'
          )}
        >
          {/* An unseen copy in the chosen weight keeps each tab as wide as when it is chosen, so a switch
              moves neither tab. */}
          <span className="grid justify-items-center">
            <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-medium">
              {wayLabel(host, id)}
            </span>
            <span className="col-start-1 row-start-1">{wayLabel(host, id)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
