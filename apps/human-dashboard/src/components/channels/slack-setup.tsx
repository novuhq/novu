'use client';

import { ArrowUpRight, ChevronsUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ComponentProps, useCallback, useEffect, useState, useTransition } from 'react';

import {
  checkSlackConnectedAction,
  createSlackAppAction,
  getSlackInstallUrlAction,
  loadSlackSetupAction,
  sendSlackTestMessageAction,
} from '@/app/(account)/(dashboard)/channels/actions';
import { ShortDate } from '@/app/(account)/(dashboard)/contacts/short-date';
import { ChannelIcon } from '@/components/channels/channel-icon';
import {
  ConnectedCard,
  FieldError,
  SetupCheck,
  SWAP_LAYER,
  useConnectionPoll,
  WaitingLine,
} from '@/components/channels/setup-parts';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer';
import { Field, Input } from '@/components/ui/input';
import { Fold, Step, Stepper } from '@/components/ui/stepper';
import { toast } from '@/components/ui/toast';
import type { SlackWorkspace } from '@/lib/human-channels-api';
import type { SlackSetupState } from '@/lib/human-slack-setup';
import {
  SLACK_APP_NAME_MAX_LENGTH,
  SLACK_APP_PERMISSIONS,
  SLACK_APPS_URL,
  validateSlackAppName,
  validateSlackConfigToken,
} from '@/lib/slack-app';
import { cn } from '@/lib/utils';

/** The name `human setup slack` gives the app, for an agent that has no name of its own to lend it. */
const DEFAULT_APP_NAME = 'Human';
const PERMISSION_COUNT = `${SLACK_APP_PERMISSIONS.length} permissions`;
/** One of the two round badges above "Install … in Slack". */
const BADGE = 'flex size-15 items-center justify-center rounded-full border border-border-strong bg-subtle';

/** `checking` and `unavailable` only happen when the page couldn't read the setup and the drawer has to. */
type SetupStep = 'checking' | 'unavailable' | 'name' | 'app' | 'install' | 'connected';
type StepStatus = ComponentProps<typeof Step>['status'];

type SlackSetupProps = {
  /** How far the setup got when the page loaded, so the drawer has something to show the moment it opens. */
  setup: SlackSetupState;
  /** What the agent is called: its own name, or "Human assistant". Without it the drawer says "your agent". */
  agentName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The drawer that walks through giving the agent a Slack app. The Channels table opens it. */
export function SlackSetup({ setup, agentName, open, onOpenChange }: SlackSetupProps) {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>(stepOf(setup));
  const [appName, setAppName] = useState(appNameOf(setup) || agentName || DEFAULT_APP_NAME);
  const [token, setToken] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [tokenError, setTokenError] = useState<string>();
  const [workspace, setWorkspace] = useState<SlackWorkspace>(workspaceOf(setup));
  // Only true when the DM went out while this drawer was open: reopening it later sends nothing.
  const [testSent, setTestSent] = useState(false);
  const [creating, startCreating] = useTransition();

  const show = useCallback((next: SlackSetupState) => {
    setStep(stepOf(next));
    setAppName((current) => appNameOf(next) || current);
    // What the drawer learned while it waited stays when the page couldn't read it.
    setWorkspace((current) => ({ ...current, ...definedOnly(workspaceOf(next)) }));
  }, []);

  const check = useCallback(async () => {
    setStep('checking');
    show(await loadSlackSetupAction().catch((): SlackSetupState => ({ step: 'unknown' })));
  }, [show]);

  // Reopening picks the setup up where the page says it is: a created app goes straight to the install.
  useEffect(() => {
    if (!open) {
      return;
    }

    setNameError(undefined);
    setTokenError(undefined);
    setToken('');

    if (setup.step === 'unknown') {
      void check();
    } else {
      show(setup);
    }
  }, [open, setup, show, check]);

  // Slack sends the operator back to the API once the app is installed; the drawer asks until that shows up.
  const { waitedTooLong, keepWaiting } = useConnectionPoll({
    waiting: open && step === 'install',
    check: checkSlackConnectedAction,
    onConnected: (connection) => {
      setWorkspace(connection);
      setStep('connected');
      router.refresh();
      void sendSlackTestMessageAction().then(setTestSent, () => setTestSent(false));
    },
  });

  function continueFromName() {
    const problem = validateSlackAppName(appName);
    setNameError(problem);

    if (!problem) {
      setStep('app');
    }
  }

  function createApp() {
    const problem = validateSlackConfigToken(token);
    setTokenError(problem);

    if (problem) {
      return;
    }

    startCreating(async () => {
      const result = await createSlackAppAction(appName, token);

      if (result.ok) {
        // The token did its one job; nothing keeps it around.
        setToken('');
        setStep('install');
      } else if (result.field === 'name') {
        setNameError(result.error);
        setStep('name');
      } else {
        setTokenError(result.error);
      }
    });
  }

  const connected = step === 'connected';
  const unread = step === 'checking' || step === 'unavailable';
  const agent = agentName ?? 'your agent';
  const name = appName.trim() || DEFAULT_APP_NAME;
  const statusOf = (current: SetupStep, done: SetupStep[], error?: string): StepStatus => {
    if (step === current) {
      return error ? 'error' : 'current';
    }

    return done.includes(step) ? 'done' : 'upcoming';
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title={connected ? 'Slack connected' : 'Set up Slack'}
        description={`Give ${agent} its own Slack app in your workspace.${connected ? '' : ' Takes about two minutes.'}`}
        footer={
          connected && (
            <DrawerClose asChild>
              <Button>Done</Button>
            </DrawerClose>
          )
        }
      >
        {unread && <SetupCheck state={step} channel="Slack" onRetry={() => void check()} />}
        <div className={cn('flex flex-col gap-3', unread && 'hidden')}>
          <Stepper>
            <NameStep
              status={statusOf('name', ['app', 'install', 'connected'], nameError)}
              agent={agent}
              appName={appName}
              summary={`“${name}”`}
              error={nameError}
              onChange={(value) => {
                setAppName(value);
                setNameError(undefined);
              }}
              onContinue={continueFromName}
            />
            <AppStep
              status={statusOf('app', ['install', 'connected'], tokenError)}
              name={name}
              token={token}
              summary={`${(connected && workspace.name) || 'App created'} · ${PERMISSION_COUNT}`}
              error={tokenError}
              creating={creating}
              onChange={(value) => {
                setToken(value);
                setTokenError(undefined);
              }}
              onBack={() => setStep('name')}
              onCreate={createApp}
            />
            <InstallStep
              status={statusOf('install', ['connected'])}
              name={name}
              workspace={workspace}
              connected={connected}
              waitedTooLong={waitedTooLong}
              onKeepWaiting={keepWaiting}
              onBack={() => setStep('app')}
            />
            {connected && (
              <ConnectedCard
                via="slack"
                title={workspace.name ? `Connected to ${workspace.name}` : 'Slack is connected'}
              >
                {/* Both lines share one spot and cross-fade when the test DM goes out. */}
                <span className="grid">
                  <span aria-hidden={testSent} className={cn(SWAP_LAYER, testSent && '-translate-y-1 opacity-0')}>
                    {agentName ?? 'Your agent'} can now reach you in Slack.
                  </span>
                  <span aria-hidden={!testSent} className={cn(SWAP_LAYER, !testSent && 'translate-y-1 opacity-0')}>
                    {agentName ?? 'Your agent'} sent you a test DM.
                  </span>
                </span>
              </ConnectedCard>
            )}
          </Stepper>
          <p className="text-xs leading-4 text-muted">
            The app lives in your Slack workspace. Removing Slack here disconnects it from {agent}.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

type NameStepProps = {
  status: StepStatus;
  /** The agent's name inside a sentence: its own name, "Human assistant", or "your agent". */
  agent: string;
  appName: string;
  summary: string;
  error?: string;
  onChange: (appName: string) => void;
  onContinue: () => void;
};

function NameStep({ status, agent, appName, summary, error, onChange, onContinue }: NameStepProps) {
  return (
    <Step
      index={1}
      title="Name your app"
      status={status}
      summary={summary}
      footer={
        <>
          <span />
          <Button onClick={onContinue}>Continue</Button>
        </>
      }
    >
      <p className="text-[13px] leading-4.5 text-secondary">
        This is how {agent} shows up in Slack. We’ll put it into the app manifest for you.
      </p>
      <Field
        label="App name"
        required
        hint="People see this as the sender in Slack."
        error={error && <FieldError>{error}</FieldError>}
      >
        {(field) => (
          <Input
            {...field}
            value={appName}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onContinue();
              }
            }}
            maxLength={SLACK_APP_NAME_MAX_LENGTH}
            autoComplete="off"
          />
        )}
      </Field>
    </Step>
  );
}

type AppStepProps = {
  status: StepStatus;
  /** The app's name, as it will be created. */
  name: string;
  token: string;
  summary: string;
  error?: string;
  creating: boolean;
  onChange: (token: string) => void;
  onBack: () => void;
  onCreate: () => void;
};

function AppStep({ status, name, token, summary, error, creating, onChange, onBack, onCreate }: AppStepProps) {
  return (
    <Step
      index={2}
      title="Create the app from our manifest"
      status={status}
      summary={summary}
      footer={
        <>
          <Button variant="secondary" disabled={creating} onClick={onBack}>
            Back
          </Button>
          <Button pending={creating} onClick={onCreate}>
            Create Slack app
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-4.5 text-secondary">
        Open Slack’s app settings and generate an App Configuration Token for your workspace. Paste its access token
        here and we’ll create “{name}” from our manifest.
      </p>
      <a
        href={SLACK_APPS_URL}
        target="_blank"
        rel="noreferrer"
        className={buttonClassName('secondary', `${SMALL_BUTTON} self-start`)}
      >
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
        Open Slack app settings
      </a>
      <Field
        label="App configuration token"
        required
        hint="We use it once to create the app and never store it."
        error={error && <FieldError>{error}</FieldError>}
      >
        {(field) => (
          <Input
            {...field}
            value={token}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onCreate();
              }
            }}
            placeholder="xoxe.xoxp-…"
            autoComplete="off"
            spellCheck={false}
            disabled={creating}
            className="font-mono"
          />
        )}
      </Field>
      <Permissions />
    </Step>
  );
}

type InstallStepProps = {
  status: StepStatus;
  name: string;
  /** Where the app ended up, once it's installed. */
  workspace: SlackWorkspace;
  connected: boolean;
  waitedTooLong: boolean;
  onKeepWaiting: () => void;
  onBack: () => void;
};

function InstallStep({ status, name, workspace, connected, waitedTooLong, onKeepWaiting, onBack }: InstallStepProps) {
  const [opening, setOpening] = useState(false);

  async function openSlack() {
    // The tab opens inside the click so the browser doesn't block it as a popup, and goes to Slack once
    // the link arrives. A link only works for five minutes, so every click gets a new one.
    const tab = window.open('', '_blank');
    if (tab) {
      tab.opener = null;
    }

    setOpening(true);
    const url = await getSlackInstallUrlAction().catch(() => null);
    setOpening(false);

    if (!url) {
      tab?.close();
      toast('We couldn’t get the link to Slack just now. Please try again.', 'error');
    } else if (tab && !tab.closed) {
      tab.location.href = url;
    } else {
      window.location.assign(url);
    }
  }

  return (
    <Step
      index={3}
      title={connected ? `Installed in ${workspace.name ?? 'your workspace'}` : 'Install in your workspace'}
      status={status}
      summary={
        workspace.connectedAt ? (
          <>
            Connected <ShortDate iso={workspace.connectedAt} todayLabel="today" />
          </>
        ) : (
          'App installed'
        )
      }
      bodyClassName="items-center px-4.5 py-3 text-center"
      footer={
        <>
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          <span />
        </>
      }
    >
      <div aria-hidden="true" className="flex">
        <span className={BADGE}>
          <ChannelIcon via="slack" className="size-5.5" />
        </span>
        <span className={cn(BADGE, 'relative -ml-3')}>
          {/* The human.md mark, from the paths the design exports. */}
          <svg viewBox="0 0 22 22" className="size-6.5" fill="none">
            <path
              className="fill-accent"
              d="M21.083 0c.506 0 .917.41.917.917v13.291c0 .506-.41.917-.917.917h-9.88c-.118 0-.203-.112-.203-.23v-2.978A.917.917 0 0 0 10.083 11H7.104c-.117 0-.229-.085-.229-.202V.917c0-.506.41-.917.917-.917h13.291Z"
            />
            <path
              fill="#5C5650"
              d="M6.188 14.896c0 .506.41.917.916.917h1.604c.506 0 .917.41.917.916v4.354c0 .506-.41.917-.917.917H.917A.917.917 0 0 1 0 21.083v-7.791c0-.506.41-.917.917-.917h4.354c.506 0 .916.41.916.917v1.604Z"
            />
          </svg>
        </span>
      </div>
      <h4 className="text-base leading-6 font-medium text-foreground">Install {name} in Slack</h4>
      <p className="text-[13px] leading-4.5 text-secondary">
        Human installs the app you just created. You’ll pick the workspace and approve its {PERMISSION_COUNT} in Slack.
      </p>
      <Button pending={opening} onClick={() => void openSlack()}>
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
        Connect Slack
      </Button>
      {waitedTooLong ? (
        <p className="flex flex-wrap items-center justify-center gap-2.5 text-xs leading-4 text-secondary">
          No install yet.
          <Button variant="secondary" className={SMALL_BUTTON} onClick={onKeepWaiting}>
            Keep waiting
          </Button>
        </p>
      ) : (
        <WaitingLine>Waiting for the install…</WaitingLine>
      )}
    </Step>
  );
}

/**
 * What the app is allowed to do in the workspace. The few permissions an ask needs are always listed;
 * the header opens the rest, so the count matches what Slack shows when the app is installed.
 */
function Permissions() {
  const [showsAll, setShowsAll] = useState(false);
  const main = SLACK_APP_PERMISSIONS.filter((permission) => permission.main);
  const others = SLACK_APP_PERMISSIONS.filter((permission) => !permission.main);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        aria-expanded={showsAll}
        onClick={() => setShowsAll((shown) => !shown)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-raised focus-visible:-outline-offset-2 motion-reduce:transition-none"
      >
        <span className="text-[13px] leading-4.5 font-medium text-foreground">What the app can do</span>
        <span className="flex items-center gap-1.5 text-xs leading-4 text-muted">
          <span className="sr-only">{showsAll ? 'Hide' : 'Show all'} </span>
          {PERMISSION_COUNT}
          <ChevronsUpDown aria-hidden="true" className="size-3.5" />
        </span>
      </button>
      <PermissionRows permissions={main} />
      <Fold open={showsAll}>
        <PermissionRows permissions={others} />
      </Fold>
    </div>
  );
}

function PermissionRows({ permissions }: { permissions: typeof SLACK_APP_PERMISSIONS }) {
  return (
    <ul>
      {permissions.map(({ scope, purpose }) => (
        <li key={scope} className="flex gap-3 border-t border-border px-3 py-2 text-muted">
          <code className="w-35 shrink-0 font-mono text-[11px] leading-4">{scope}</code>
          <span className="min-w-0 text-xs leading-4">{purpose}</span>
        </li>
      ))}
    </ul>
  );
}

function stepOf(setup: SlackSetupState): SetupStep {
  return setup.step === 'unknown' ? 'unavailable' : setup.step;
}

function appNameOf(setup: SlackSetupState): string {
  return 'appName' in setup ? setup.appName : '';
}

function workspaceOf(setup: SlackSetupState): SlackWorkspace {
  return setup.step === 'connected' ? { name: setup.workspace, connectedAt: setup.connectedAt } : {};
}

function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}
