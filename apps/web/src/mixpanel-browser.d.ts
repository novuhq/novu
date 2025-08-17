// TODO: remove when @types/mixpanel-browser can be updated to version 2.50.0 or later
import { Config } from 'mixpanel-browser';

export * from 'mixpanel-browser';

declare module 'mixpanel-browser' {
  export interface BetaConfig extends Config {
    record_sessions_percent?: number;
    record_idle_timeout_ms?: number;
    record_max_ms?: number;
    record_mask_text_selector?: string;
  }

  export function init(token: string, config: Partial<BetaConfig>, name: string): Mixpanel;
  export function init(token: string, config: Partial<BetaConfig>): Mixpanel;

  export function start_session_recording(): void;

  export function set_config(config: Partial<BetaConfig>): void;

  export function stop_session_recording(): void;

  export function get_session_recording_properties(): {
    $mp_replay_id?: string;
  };
}
