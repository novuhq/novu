import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { CLI_COMMAND } from '../config';

/** The launchd agent's label, which is also its file's name. */
export const LAUNCHD_LABEL = 'md.agentinbox.wake';

/**
 * What launchd starts on macOS: a small script that starts the CLI. macOS lists a background item by the name of
 * the program it starts (System Settings → General → Login Items & Extensions), which would otherwise be `node`.
 */
export const LAUNCHER_NAME = 'agentinbox-wake';

export const SYSTEMD_UNIT = 'agentinbox-wake.service';

/**
 * What a wake that has to restart waits first: long enough that a broken setup doesn't spin, short enough
 * that a crash costs only a moment.
 */
const RESTART_SECONDS = 30;

/**
 * Variables the background program needs from the shell `wake` was turned on in. Never a secret, nor
 * INBOX_API_URL: the program sends the key only to the API it was saved for.
 */
const KEPT_VARIABLES = [
  'PATH',
  'INBOX_CONFIG',
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'NO_PROXY',
  'NODE_EXTRA_CA_CERTS',
] as const;

/** How the background program starts: the CLI's own program, absolute, run as `wake run`. */
export interface BackgroundCommand {
  argv: string[];
  workingDirectory: string;
  env: Record<string, string>;
  logFile: string;
  /** "Keeps Claude Code awake for Agent Inbox". */
  description: string;
}

/**
 * The CLI as the background program starts it after a restart. From npx's cache, which npm may clean any
 * time, it starts the same version through npx again; from an install or a checkout, the same file.
 */
export function backgroundCommand(input: {
  script: string;
  nodePath: string;
  version: string;
  env: NodeJS.ProcessEnv;
  project: string;
  logFile: string;
  description: string;
}): BackgroundCommand {
  const script = realpathOr(input.script);
  const fromNpxCache = script.includes(`${sep}_npx${sep}`);
  const argv = fromNpxCache
    ? [join(dirname(input.nodePath), 'npx'), '--yes', `@agentinbox/cli@${input.version}`, 'wake', 'run']
    : [input.nodePath, script, 'wake', 'run'];
  const env = Object.fromEntries(
    KEPT_VARIABLES.flatMap((name) => (input.env[name] ? [[name, String(input.env[name])]] : []))
  );

  return { argv, workingDirectory: input.project, env, logFile: input.logFile, description: input.description };
}

function realpathOr(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

function xml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** A word of a shell command line, as `sh` reads it back: in single quotes, its own single quotes escaped. */
function shellWord(text: string): string {
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

/** The script launchd starts, named so people can tell it apart: it only hands over to the CLI. */
export function launchdLauncher(command: BackgroundCommand): string {
  return [
    '#!/bin/sh',
    `# ${command.description}. \`${CLI_COMMAND} wake stop\` turns it off and removes this file.`,
    `exec ${command.argv.map(shellWord).join(' ')}`,
    '',
  ].join('\n');
}

/**
 * A launchd agent for the user's session: it starts when they log in, and again after a crash, but not
 * after it stops on purpose (a changed key, another computer taking over), which exits cleanly.
 */
export function launchdPlist(command: BackgroundCommand, launcher: string): string {
  const env = Object.entries(command.env)
    .map(([name, value]) => `    <key>${xml(name)}</key>\n    <string>${xml(value)}</string>`)
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '  <key>Label</key>',
    `  <string>${LAUNCHD_LABEL}</string>`,
    '  <key>ProgramArguments</key>',
    '  <array>',
    `    <string>${xml(launcher)}</string>`,
    '  </array>',
    '  <key>WorkingDirectory</key>',
    `  <string>${xml(command.workingDirectory)}</string>`,
    ...(env ? ['  <key>EnvironmentVariables</key>', '  <dict>', env, '  </dict>'] : []),
    '  <key>RunAtLoad</key>',
    '  <true/>',
    '  <key>KeepAlive</key>',
    '  <dict>',
    '    <key>SuccessfulExit</key>',
    '    <false/>',
    '  </dict>',
    '  <key>ThrottleInterval</key>',
    `  <integer>${RESTART_SECONDS}</integer>`,
    // Not Background: macOS throttles a Background job and what it starts, and Claude Code gives up reading its
    // sign-in from the Keychain after 2 seconds, so a woken run said "Not logged in" (its sign-in check took
    // 1.7–10.4 s as Background, 0.2 s as Standard).
    '  <key>ProcessType</key>',
    '  <string>Standard</string>',
    '  <key>StandardOutPath</key>',
    `  <string>${xml(command.logFile)}</string>`,
    '  <key>StandardErrorPath</key>',
    `  <string>${xml(command.logFile)}</string>`,
    '</dict>',
    '</plist>',
    '',
  ].join('\n');
}

/** A word of a command line or an environment entry in a unit: quoted, and what systemd would expand escaped. */
function systemdWord(text: string): string {
  return `"${systemdText(text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')).replace(/\$/g, '$$$$')}"`;
}

/** A value systemd takes as it stands (a path, a description), with its `%` specifiers escaped. */
function systemdText(text: string): string {
  return text.replace(/%/g, '%%');
}

/**
 * A systemd user service: it starts with the user's session (or at boot, with lingering on), and again after
 * a crash, but not after it stops on purpose, which exits cleanly.
 */
export function systemdUnit(command: BackgroundCommand): string {
  return [
    '[Unit]',
    `Description=${systemdText(command.description)}`,
    'After=network-online.target',
    'Wants=network-online.target',
    '',
    '[Service]',
    'Type=simple',
    `WorkingDirectory=${systemdText(command.workingDirectory)}`,
    ...Object.entries(command.env).map(([name, value]) => `Environment=${systemdWord(`${name}=${value}`)}`),
    `ExecStart=${command.argv.map(systemdWord).join(' ')}`,
    'Restart=on-failure',
    `RestartSec=${RESTART_SECONDS}`,
    `StandardOutput=append:${systemdText(command.logFile)}`,
    `StandardError=append:${systemdText(command.logFile)}`,
    '',
    '[Install]',
    'WantedBy=default.target',
    '',
  ].join('\n');
}

/** Runs the service manager. The real one runs `launchctl` or `systemctl`; tests record the calls instead. */
export interface ServiceRunner {
  run(command: string, args: readonly string[]): { status: number; output: string };
}

const systemRunner: ServiceRunner = {
  run(command, args) {
    const ran = spawnSync(command, args, { encoding: 'utf8', timeout: 30_000 });

    return {
      status: ran.status ?? 1,
      output: `${ran.stdout ?? ''}${ran.stderr ?? ''}`.trim() || (ran.error?.message ?? ''),
    };
  },
};

/** Puts the background program in place, starts it, stops it and takes it away again. */
export interface ServiceManager {
  readonly kind: 'launchd' | 'systemd';
  /** The file the service manager reads. */
  readonly file: string;
  /** The file's contents for this command, as `install` writes them. */
  render(command: BackgroundCommand): string;
  /** Writes the file and (re)starts the program. */
  install(command: BackgroundCommand): void;
  /** Stops the program and removes the file. False when there was nothing to remove. */
  uninstall(): boolean;
  isInstalled(): boolean;
  /** Whether it runs now; undefined when the service manager can't say. */
  isRunning(): boolean | undefined;
}

export type ServiceSetup = ServiceManager | { unsupported: string };

export function isUnsupported(setup: ServiceSetup): setup is { unsupported: string } {
  return 'unsupported' in setup;
}

export interface ServiceOptions {
  platform?: NodeJS.Platform;
  home?: string;
  env?: NodeJS.ProcessEnv;
  uid?: number;
  runner?: ServiceRunner;
  /** Whether this is Linux inside WSL, for the right advice when systemd isn't there. */
  wsl?: boolean;
}

/** The service manager of this computer: launchd on macOS, systemd on Linux (WSL included). */
export function serviceManager(options: ServiceOptions = {}): ServiceSetup {
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir();
  const env = options.env ?? process.env;
  const runner = options.runner ?? systemRunner;

  if (platform === 'darwin') {
    return launchd(
      join(home, 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`),
      join(home, 'Library', 'Application Support', 'agentinbox', LAUNCHER_NAME),
      options.uid ?? process.getuid?.() ?? 0,
      runner
    );
  }

  if (platform === 'linux') {
    const configHome = env.XDG_CONFIG_HOME || join(home, '.config');

    return systemd(join(configHome, 'systemd', 'user', SYSTEMD_UNIT), runner, options.wsl ?? isWsl(env));
  }

  if (platform === 'win32') {
    return {
      unsupported:
        'On Windows, wake runs inside WSL, where Claude Code runs too: open your WSL terminal and run the same command there.',
    };
  }

  return {
    unsupported: `Wake can’t keep a host awake on ${platform} yet: only on macOS, Linux and Windows through WSL.`,
  };
}

function isWsl(env: NodeJS.ProcessEnv): boolean {
  if (env.WSL_DISTRO_NAME) {
    return true;
  }

  try {
    return /microsoft/i.test(readFileSync('/proc/version', 'utf8'));
  } catch {
    return false;
  }
}

/** The service's file, and the folder its log goes in: neither launchd nor systemd makes that folder. */
function writeServiceFile(file: string, contents: string, logFile: string): void {
  mkdirSync(dirname(file), { recursive: true });
  mkdirSync(dirname(logFile), { recursive: true });
  writeFileSync(file, contents, { mode: 0o644 });
}

function launchd(file: string, launcher: string, uid: number, runner: ServiceRunner): ServiceManager {
  const domain = `gui/${uid}`;
  const target = `${domain}/${LAUNCHD_LABEL}`;

  return {
    kind: 'launchd',
    file,
    render: (command) => launchdPlist(command, launcher),
    install(command) {
      mkdirSync(dirname(launcher), { recursive: true });
      writeFileSync(launcher, launchdLauncher(command));
      // Writing keeps the mode of a script that was there already.
      chmodSync(launcher, 0o755);
      writeServiceFile(file, launchdPlist(command, launcher), command.logFile);
      // An older one goes first, so the new file is the one loaded; there may be none.
      runner.run('launchctl', ['bootout', target]);
      const loaded = runner.run('launchctl', ['bootstrap', domain, file]);
      if (loaded.status !== 0) {
        throw new Error(`launchd didn’t start it (${loaded.output || `exit ${loaded.status}`}).`);
      }
    },
    uninstall() {
      runner.run('launchctl', ['bootout', target]);
      const had = existsSync(file);
      rmSync(file, { force: true });
      rmSync(launcher, { force: true });

      return had;
    },
    isInstalled: () => existsSync(file),
    isRunning() {
      const printed = runner.run('launchctl', ['print', target]);
      if (printed.status !== 0) {
        return false;
      }

      return /state = running/.test(printed.output);
    },
  };
}

function systemd(file: string, runner: ServiceRunner, wsl: boolean): ServiceManager {
  const systemctl = (...args: string[]) => runner.run('systemctl', ['--user', ...args]);

  return {
    kind: 'systemd',
    file,
    render: systemdUnit,
    install(command) {
      if (systemctl('show-environment').status !== 0) {
        throw new Error(
          wsl
            ? `systemd isn’t running in this WSL distribution. Turn it on with \`[boot] systemd=true\` in /etc/wsl.conf, run \`wsl --shutdown\` in Windows and open WSL again; or keep it awake in this terminal with \`${CLI_COMMAND} wake <host> --foreground\`.`
            : `systemd’s user services aren’t available here. Keep it awake in this terminal instead: \`${CLI_COMMAND} wake <host> --foreground\`.`
        );
      }

      writeServiceFile(file, systemdUnit(command), command.logFile);
      systemctl('daemon-reload');
      const started = systemctl('enable', '--now', SYSTEMD_UNIT);
      if (started.status !== 0) {
        throw new Error(`systemd didn’t start it (${started.output || `exit ${started.status}`}).`);
      }
      // A unit that was running already keeps its old command until it restarts.
      systemctl('restart', SYSTEMD_UNIT);
    },
    uninstall() {
      systemctl('disable', '--now', SYSTEMD_UNIT);
      const had = existsSync(file);
      rmSync(file, { force: true });
      systemctl('daemon-reload');

      return had;
    },
    isInstalled: () => existsSync(file),
    isRunning() {
      const active = systemctl('is-active', SYSTEMD_UNIT);

      return active.output === 'active';
    },
  };
}
