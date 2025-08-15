import { createEffect, createMemo, Show } from 'solid-js';
import { SeverityLevelEnum } from '../../../../types';
import { cn, useStyle } from '../../../helpers';
import { Bell as DefaultBell } from '../../../icons';
import { AppearanceKey } from '../../../types';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';

type DefaultBellContainerProps = {
  unreadCount: { total: number; severity: Record<string, number> };
};

const SEVERITY_GLOW_KEYS: Record<SeverityLevelEnum, AppearanceKey> = {
  [SeverityLevelEnum.NONE]: 'bellSeverityGlow',
  [SeverityLevelEnum.HIGH]: 'severityGlowHigh__bellSeverityGlow',
  [SeverityLevelEnum.MEDIUM]: 'severityGlowMedium__bellSeverityGlow',
  [SeverityLevelEnum.LOW]: 'severityGlowLow__bellSeverityGlow',
};

const SEVERITY_TO_CONTAINER_KEYS: Record<SeverityLevelEnum, AppearanceKey> = {
  [SeverityLevelEnum.NONE]: 'bellContainer',
  [SeverityLevelEnum.HIGH]: 'severityHigh__bellContainer',
  [SeverityLevelEnum.MEDIUM]: 'severityMedium__bellContainer',
  [SeverityLevelEnum.LOW]: 'severityLow__bellContainer',
};

export const BellContainer = (props: DefaultBellContainerProps) => {
  const style = useStyle();
  const bellIconStyle = style('bellIcon', 'nt-size-4');

  const severity = createMemo(() => {
    if (props.unreadCount.severity[SeverityLevelEnum.HIGH] > 0) {
      return SeverityLevelEnum.HIGH;
    } else if (props.unreadCount.severity[SeverityLevelEnum.MEDIUM] > 0) {
      return SeverityLevelEnum.MEDIUM;
    } else if (props.unreadCount.severity[SeverityLevelEnum.LOW] > 0) {
      return SeverityLevelEnum.LOW;
    }

    return SeverityLevelEnum.NONE;
  });

  createEffect(() => {
    console.log(severity());
  });

  return (
    <span
      class={style(
        SEVERITY_TO_CONTAINER_KEYS[severity()],
        cn(
          'nt-size-4 nt-flex nt-justify-center nt-items-center nt-relative nt-text-foreground nt-cursor-pointer [&_stop]:nt-transition-[stop-color]',
          {
            '[--bell-gradient-start:var(--nv-color-severity-high)] [--bell-gradient-end:oklch(from_var(--nv-color-severity-high)_45%_c_h)]':
              severity() === SeverityLevelEnum.HIGH,
            '[--bell-gradient-start:var(--nv-color-severity-medium)] [--bell-gradient-end:oklch(from_var(--nv-color-severity-medium)_45%_c_h)]':
              severity() === SeverityLevelEnum.MEDIUM,
            '[--bell-gradient-start:var(--nv-color-severity-low)] [--bell-gradient-end:oklch(from_var(--nv-color-severity-low)_45%_c_h)]':
              severity() === SeverityLevelEnum.LOW,
          }
        )
      )}
    >
      <div
        class={style(
          SEVERITY_GLOW_KEYS[severity()],
          cn(
            'nt-transition nt-absolute nt-inset-0 -nt-m-1 nt-rounded-full before:nt-content-[""] before:nt-absolute before:nt-inset-0 before:nt-rounded-full before:nt-m-1',
            {
              'nt-bg-severity-high-alpha-100 before:nt-bg-severity-high-alpha-200':
                severity() === SeverityLevelEnum.HIGH,
              'nt-bg-severity-medium-alpha-100 before:nt-bg-severity-medium-alpha-200':
                severity() === SeverityLevelEnum.MEDIUM,
              'nt-bg-severity-low-alpha-100 before:nt-bg-severity-low-alpha-200': severity() === SeverityLevelEnum.LOW,
            }
          )
        )}
      />

      <IconRendererWrapper iconKey="bell" class={bellIconStyle} fallback={<DefaultBell class={bellIconStyle} />} />
      <Show when={props.unreadCount.total > 0}>
        <span
          class={style(
            'bellDot',
            'nt-absolute nt-top-0 nt-right-0 nt-block nt-size-2 nt-transform nt-bg-counter nt-rounded-full nt-border nt-border-background'
          )}
        />
      </Show>
    </span>
  );
};
