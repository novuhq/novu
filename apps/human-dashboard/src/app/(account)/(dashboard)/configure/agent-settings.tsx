'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  type TransitionStartFunction,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Fold } from '@/components/ui/stepper';
import {
  type AgentReach,
  type AgentSettings,
  type AgentSettingsChange,
  DEFAULT_AGENT_SETTINGS,
} from '@/lib/agent-settings';
import { ONBOARDING_PATH } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

import { DialogMark } from '../contacts/dialog-mark';
import { DIALOG_HEADER } from '../settings/api-key-card';
import {
  type AgentSettingsResult,
  type DeleteAgentResult,
  deleteAgentAction,
  updateAgentSettingsAction,
} from './actions';
import { SECTION_LABEL } from './channel-list';

/** What the block does with the API: the server actions, unless a preview provides stand-ins for them. */
export type AgentSettingsActions = {
  update: (change: AgentSettingsChange) => Promise<AgentSettingsResult>;
  remove: () => Promise<DeleteAgentResult>;
};

export const AgentSettingsActionsContext = createContext<AgentSettingsActions>({
  update: updateAgentSettingsAction,
  remove: deleteAgentAction,
});

const SAVE_FAILED = 'Couldn’t save that. Try again.';

const REACH_OPTIONS: { value: AgentReach; label: string }[] = [
  { value: 'anyone', label: 'Anyone' },
  { value: 'contacts', label: 'Contacts only' },
];

const ROW = 'flex items-center gap-3 border-b border-border px-4 py-3.25 last:border-b-0';

const TITLE = 'text-[13px] leading-4.5 font-medium';

const HINT = 'text-xs leading-4 text-secondary';

const MOTION = 'duration-200 ease-out motion-reduce:transition-none';

type AgentSettingsCardProps = {
  /** How the agent is called in a sentence: its address without the domain. */
  handle: string;
  /** `null` when the page couldn't read them: the two controls then wait, and the block says so. */
  settings: AgentSettings | null;
  /** Told whether the agent shows as paused, for the card on the page: the switch's state, as it changes. */
  onPausedChange?: (paused: boolean) => void;
};

type SettingRow = 'reach' | 'pause';

/**
 * SETTINGS on the Configure page (`1.6` / `4.1 · Configure`): who can reach the agent, pausing it, and
 * deleting it. A change shows at once and is saved behind it; when saving fails the control goes back to
 * what was saved, and the row says what went wrong. Settings the page couldn't read aren't shown as if they
 * were saved: the controls can't be used until a reload reads them.
 */
export function AgentSettingsCard({ handle, settings, onPausedChange }: AgentSettingsCardProps) {
  const actions = useContext(AgentSettingsActionsContext);
  const unavailable = settings === null;
  // What was saved last: the page's settings, or what a save answered with before the page caught up.
  const [saved, setSaved] = useState(settings ?? DEFAULT_AGENT_SETTINGS);
  const [syncedSettings, setSyncedSettings] = useState(settings);
  if (settings !== syncedSettings) {
    setSyncedSettings(settings);
    setSaved(settings ?? DEFAULT_AGENT_SETTINGS);
  }

  const [shown, showChange] = useOptimistic(saved, applyChange);
  // The card shows the pause as the switch does: at once, and undone with it when saving fails.
  const pausedShown = Boolean(shown.paused);
  useEffect(() => {
    onPausedChange?.(pausedShown);
  }, [pausedShown, onPausedChange]);
  const [errors, setErrors] = useState<Partial<Record<SettingRow, string>>>({});
  const [reachSaving, startReachSave] = useTransition();
  const [pauseSaving, startPauseSave] = useTransition();

  function save(row: SettingRow, change: AgentSettingsChange, start: TransitionStartFunction) {
    setErrors((previous) => ({ ...previous, [row]: undefined }));
    start(async () => {
      showChange(change);
      const result = await actions.update(change).catch((): AgentSettingsResult => ({ ok: false, error: SAVE_FAILED }));

      if (result.ok) {
        setSaved(result.settings);
      } else {
        setErrors((previous) => ({ ...previous, [row]: result.error }));
      }
    });
  }

  const reachId = useId();
  const pauseId = useId();

  return (
    <section className="overflow-hidden rounded-[10px] border border-border">
      <header className="flex items-center gap-2 border-b border-border bg-subtle px-4 py-3">
        <h2 className={SECTION_LABEL}>Settings</h2>
        {unavailable && (
          <p role="alert" className="ml-auto text-xs leading-4 text-danger">
            We couldn’t load these settings. Reload the page to try again.
          </p>
        )}
      </header>
      <ul>
        <li className={ROW}>
          <RowText
            id={reachId}
            title={`Who can reach ${handle}`}
            hint="Strangers are screened. Suspicious messages never reach your agent."
            error={errors.reach}
          />
          <ReachControl
            labelledBy={`${reachId}-title`}
            value={shown.reach}
            busy={reachSaving}
            disabled={unavailable}
            onChange={(reach) => save('reach', { reach }, startReachSave)}
          />
        </li>
        <li className={ROW}>
          <RowText
            id={pauseId}
            title={`Pause ${handle}`}
            hint="Mail keeps arriving and waits. Agents can’t read or send until you resume."
            error={errors.pause}
          />
          <Switch
            labelledBy={`${pauseId}-title`}
            describedBy={`${pauseId}-hint`}
            on={Boolean(shown.paused)}
            busy={pauseSaving}
            disabled={unavailable}
            onChange={(paused) => save('pause', { paused }, startPauseSave)}
          />
        </li>
        <li className={ROW}>
          <RowText
            danger
            title={`Delete ${handle}`}
            hint="Removes its address, channels, threads and connections. The address becomes available again."
          />
          <DeleteAgent handle={handle} remove={actions.remove} />
        </li>
      </ul>
    </section>
  );
}

/** The settings as they look the moment a change is made, before the API has answered. */
function applyChange(settings: AgentSettings, change: AgentSettingsChange): AgentSettings {
  if ('reach' in change) {
    return { ...settings, reach: change.reach };
  }

  if (!change.paused) {
    return { ...settings, paused: null };
  }

  return { ...settings, paused: settings.paused ?? { at: new Date().toISOString() } };
}

type RowTextProps = {
  id?: string;
  title: string;
  hint: string;
  /** What went wrong when the row's change was saved. It folds in under the hint. */
  error?: string;
  danger?: boolean;
};

function RowText({ id, title, hint, error, danger = false }: RowTextProps) {
  // The last error stays in place while it folds away.
  const [lastError, setLastError] = useState(error);
  if (error && error !== lastError) {
    setLastError(error);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <h3 id={id && `${id}-title`} className={cn(TITLE, danger ? 'text-[#ED5447]' : 'text-foreground')}>
        {title}
      </h3>
      <p id={id && `${id}-hint`} className={HINT}>
        {hint}
      </p>
      {/* Folded, it gives back the gap above it, so the row keeps the height of the design. */}
      <Fold open={Boolean(error)} closedClassName="-mt-0.5">
        <p role="alert" className="text-xs leading-4 text-danger">
          {lastError}
        </p>
      </Fold>
    </div>
  );
}

type ReachControlProps = {
  labelledBy: string;
  value: AgentReach;
  /** A change is being saved: the control takes no other until it is. */
  busy: boolean;
  /** The setting couldn't be read, so it can't be changed either. */
  disabled?: boolean;
  onChange: (value: AgentReach) => void;
};

/**
 * "Anyone" · "Contacts only": a segmented control whose raised segment slides to the option picked. The
 * options are radio buttons, hidden behind their labels, so the arrow keys move between them. Until the
 * browser has measured the options, the picked one carries the raised look itself.
 */
function ReachControl({ labelledBy, value, busy, disabled = false, onChange }: ReachControlProps) {
  const name = useId();
  const options = useRef(new Map<AgentReach, HTMLLabelElement>());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const selected = options.current.get(value);
    if (!selected) {
      return;
    }

    const measure = () => setIndicator({ left: selected.offsetLeft, width: selected.offsetWidth });
    measure();

    // A late font can change the option's width.
    const observer = new ResizeObserver(measure);
    observer.observe(selected);

    return () => observer.disconnect();
  }, [value]);

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-busy={busy || undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        'relative flex shrink-0 gap-0.5 rounded-[7px] border border-border-strong/50 bg-background p-0.5 transition-opacity',
        MOTION,
        disabled && 'opacity-60'
      )}
    >
      {indicator && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0.5 bottom-0.5 rounded-[5px] border border-border-strong bg-raised transition-[left,width]',
            MOTION
          )}
          style={indicator}
        />
      )}
      {REACH_OPTIONS.map((option) => {
        const selected = option.value === value;

        return (
          <label
            key={option.value}
            ref={(element) => {
              if (element) {
                options.current.set(option.value, element);
              } else {
                options.current.delete(option.value);
              }
            }}
            className={cn(
              'relative rounded-[5px] border px-2.5 py-1.25 text-xs leading-4 transition-colors has-focus-visible:ring-1 has-focus-visible:ring-accent',
              MOTION,
              disabled ? 'cursor-not-allowed' : 'cursor-pointer',
              selected ? 'font-medium text-foreground' : cn('text-secondary', !disabled && 'hover:text-foreground'),
              selected && !indicator ? 'border-border-strong bg-raised' : 'border-transparent'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              disabled={disabled}
              // While a change is being saved the picked option stays as it is.
              onChange={() => !busy && onChange(option.value)}
              className="sr-only"
            />
            {/* An unseen copy in the picked weight keeps each option as wide as when it is picked, so a
                switch moves neither option nor the control. */}
            <span className="grid justify-items-center">
              <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-medium">
                {option.label}
              </span>
              <span className="col-start-1 row-start-1">{option.label}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

type SwitchProps = {
  labelledBy: string;
  describedBy: string;
  on: boolean;
  busy: boolean;
  /** The setting couldn't be read, so it can't be changed either. */
  disabled?: boolean;
  onChange: (on: boolean) => void;
};

/**
 * The toggle of the design: off, a grey knob on the left of a bordered track; on, a larger dark knob on
 * the right of an orange one. The knob slides and grows, and the track changes colour, together.
 */
function Switch({ labelledBy, describedBy, on, busy, disabled = false, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={() => !busy && onChange(!on)}
      className={cn(
        'relative h-5 w-9 shrink-0 cursor-pointer rounded-[10px] transition-[background-color,box-shadow,opacity] disabled:cursor-not-allowed disabled:opacity-60',
        MOTION,
        on ? 'bg-accent' : 'bg-raised ring-1 ring-border-strong ring-inset'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1/2 left-0.75 -translate-y-1/2 rounded-full transition-[translate,width,height,background-color]',
          MOTION,
          on ? 'size-4 translate-x-3.75 bg-background' : 'size-3.5 bg-secondary'
        )}
      />
    </button>
  );
}

type DeleteAgentProps = {
  handle: string;
  remove: AgentSettingsActions['remove'];
};

/** The Delete button, and the dialog that asks once more: the agent can't be brought back. */
function DeleteAgent({ handle, remove }: DeleteAgentProps) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(0);

  function openDialog() {
    setOpening((count) => count + 1);
    setOpen(true);
  }

  return (
    <>
      <Button variant="danger" className={cn(SMALL_BUTTON, 'text-on-accent')} onClick={openDialog}>
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* A new key per opening forgets an earlier error, and keeps what was shown in place while it closes. */}
        <DeleteAgentDialog key={opening} handle={handle} remove={remove} />
      </Dialog>
    </>
  );
}

function DeleteAgentDialog({ handle, remove }: DeleteAgentProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Stays true once the agent is gone, so the dialog keeps busy until the onboarding has opened.
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setError(null);
    setBusy(true);

    const result = await remove().catch(
      (): DeleteAgentResult => ({
        ok: false,
        error: 'Something went wrong while deleting your agent. Please try again.',
      })
    );
    if (!result.ok) {
      setError(result.error);
      setBusy(false);

      return;
    }

    // Without an agent the dashboard starts over where a new operator does.
    router.replace(ONBOARDING_PATH);
  }

  return (
    <DialogContent
      className="max-w-115"
      headerClassName={DIALOG_HEADER}
      icon={<DialogMark glyph="warning" />}
      title={`Delete ${handle}?`}
      locked={busy}
      description={
        <>
          This removes {handle} for good: its address, its channels, its threads and its connections. Your account and
          your contacts stay, and the address becomes available again.
        </>
      }
      footer={
        <>
          <DialogClose asChild>
            <Button variant="secondary" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="danger" pending={busy} onClick={handleDelete}>
            Delete {handle}
          </Button>
        </>
      }
    >
      {/* The dialog grows to make room for it: its height follows what it holds. */}
      {error && (
        <p role="alert" className="animate-overlay-in text-xs leading-4 text-danger motion-reduce:animate-none">
          {error}
        </p>
      )}
    </DialogContent>
  );
}
