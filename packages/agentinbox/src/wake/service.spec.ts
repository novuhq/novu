import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  backgroundCommand,
  isUnsupported,
  LAUNCHD_LABEL,
  LAUNCHER_NAME,
  launchdLauncher,
  launchdPlist,
  type ServiceManager,
  type ServiceRunner,
  SYSTEMD_UNIT,
  serviceManager,
  systemdUnit,
} from './service';

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'wake-service-'));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

/** Records what would run, and never runs `launchctl` or `systemctl`. */
function recordingRunner(answers: Record<string, { status: number; output: string }> = {}) {
  const ran: string[] = [];
  const runner: ServiceRunner = {
    run(command, args) {
      const line = [command, ...args].join(' ');
      ran.push(line);

      return answers[line] ?? { status: 0, output: '' };
    },
  };

  return { ran, runner };
}

const COMMAND = backgroundCommand({
  script: '/opt/agentinbox/dist/src/index.js',
  nodePath: '/opt/node/bin/node',
  version: '0.1.0',
  env: {
    PATH: '/opt/node/bin:/usr/bin',
    INBOX_API_URL: 'https://agentinbox.example/api',
    INBOX_SECRET_KEY: 'sk_never_written',
    HOME: '/Users/ada',
  },
  project: '/Users/ada/projects/app & co',
  logFile: '/Users/ada/.agentinbox/wake/wake.log',
  description: 'Keeps Claude Code awake for Agent Inbox',
});

/** The same command, with its log in the test's own home, where installing it may make the log's folder. */
function installable() {
  return { ...COMMAND, logFile: join(home, '.agentinbox', 'wake', 'wake.log') };
}

describe('backgroundCommand', () => {
  it('starts the same CLI file, with only the variables it needs and never a secret', () => {
    expect(COMMAND).toEqual({
      argv: ['/opt/node/bin/node', '/opt/agentinbox/dist/src/index.js', 'wake', 'run'],
      workingDirectory: '/Users/ada/projects/app & co',
      env: { PATH: '/opt/node/bin:/usr/bin', INBOX_API_URL: 'https://agentinbox.example/api' },
      logFile: '/Users/ada/.agentinbox/wake/wake.log',
      description: 'Keeps Claude Code awake for Agent Inbox',
    });
  });

  it('starts the same version through npx when it runs from npx’s cache, which npm may clean', () => {
    const fromCache = backgroundCommand({
      script: '/Users/ada/.npm/_npx/4f1a/node_modules/@agentinbox/cli/dist/src/index.js',
      nodePath: '/opt/node/bin/node',
      version: '0.1.0',
      env: {},
      project: '/Users/ada/app',
      logFile: '/tmp/wake.log',
      description: 'd',
    });

    expect(fromCache.argv).toEqual(['/opt/node/bin/npx', '--yes', '@agentinbox/cli@0.1.0', 'wake', 'run']);
  });
});

describe('launchd', () => {
  const LAUNCHER = `/Users/ada/Library/Application Support/agentinbox/${LAUNCHER_NAME}`;

  it('writes a user agent that starts at login and after a crash, but not after a clean stop', () => {
    const plist = launchdPlist(COMMAND, LAUNCHER);

    expect(plist).toContain(`<key>Label</key>\n  <string>${LAUNCHD_LABEL}</string>`);
    expect(plist).toContain(
      ['  <key>ProgramArguments</key>', '  <array>', `    <string>${LAUNCHER}</string>`, '  </array>'].join('\n')
    );
    // Escaped for XML.
    expect(plist).toContain('<string>/Users/ada/projects/app &amp; co</string>');
    expect(plist).toContain('<key>RunAtLoad</key>\n  <true/>');
    expect(plist).toContain('<key>KeepAlive</key>\n  <dict>\n    <key>SuccessfulExit</key>\n    <false/>\n  </dict>');
    // Not Background: throttled, Claude Code misses its 2-second limit for reading its sign-in from the Keychain.
    expect(plist).toContain('<key>ProcessType</key>\n  <string>Standard</string>');
    expect(plist).toContain('<key>StandardOutPath</key>\n  <string>/Users/ada/.agentinbox/wake/wake.log</string>');
    expect(plist).toContain('<key>INBOX_API_URL</key>');
    expect(plist).not.toContain('sk_never_written');
  });

  it('starts the CLI through a script named agentinbox-wake, the name macOS lists it by', () => {
    expect(launchdLauncher(COMMAND)).toBe(
      [
        '#!/bin/sh',
        '# Keeps Claude Code awake for Agent Inbox. `npx @agentinbox/cli wake stop` turns it off and removes this file.',
        "exec '/opt/node/bin/node' '/opt/agentinbox/dist/src/index.js' 'wake' 'run'",
        '',
      ].join('\n')
    );
  });

  it('hands the CLI every word as it was, whatever it holds', () => {
    const script = join(home, LAUNCHER_NAME);
    writeFileSync(script, launchdLauncher({ ...COMMAND, argv: ['/bin/echo', 'app & co', "it's", '$HOME `x`'] }));

    expect(execFileSync('/bin/sh', [script], { encoding: 'utf8' })).toBe("app & co it's $HOME `x`\n");
  });

  it('installs into ~/Library/LaunchAgents with its script, bootstraps it in the user’s session, and removes both', () => {
    const { ran, runner } = recordingRunner();
    const service = serviceManager({ platform: 'darwin', home, uid: 501, runner }) as ServiceManager;
    const file = join(home, 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`);
    const launcher = join(home, 'Library', 'Application Support', 'agentinbox', LAUNCHER_NAME);

    service.install(installable());

    expect(service.file).toBe(file);
    expect(readFileSync(file, 'utf8')).toBe(launchdPlist(installable(), launcher));
    expect(readFileSync(launcher, 'utf8')).toBe(launchdLauncher(installable()));
    expect(statSync(launcher).mode & 0o777).toBe(0o755);
    expect(existsSync(join(home, '.agentinbox', 'wake'))).toBe(true);
    expect(ran).toEqual([`launchctl bootout gui/501/${LAUNCHD_LABEL}`, `launchctl bootstrap gui/501 ${file}`]);
    expect(service.isInstalled()).toBe(true);

    expect(service.uninstall()).toBe(true);

    expect(existsSync(file)).toBe(false);
    expect(existsSync(launcher)).toBe(false);
    expect(ran.at(-1)).toBe(`launchctl bootout gui/501/${LAUNCHD_LABEL}`);
    expect(service.uninstall()).toBe(false);
  });

  it('says when launchd doesn’t take it', () => {
    const file = join(home, 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`);
    const { runner } = recordingRunner({
      [`launchctl bootstrap gui/501 ${file}`]: { status: 5, output: 'Bootstrap failed: 5: Input/output error' },
    });
    const service = serviceManager({ platform: 'darwin', home, uid: 501, runner }) as ServiceManager;

    expect(() => service.install(installable())).toThrow(
      'launchd didn’t start it (Bootstrap failed: 5: Input/output error).'
    );
  });

  it('reads whether it runs from launchctl print', () => {
    const { runner } = recordingRunner({
      [`launchctl print gui/501/${LAUNCHD_LABEL}`]: { status: 0, output: '\tstate = running\n' },
    });

    expect((serviceManager({ platform: 'darwin', home, uid: 501, runner }) as ServiceManager).isRunning()).toBe(true);
  });
});

describe('systemd', () => {
  it('writes a user unit that starts with the session and after a crash, but not after a clean stop', () => {
    const unit = systemdUnit({ ...COMMAND, env: { PATH: '/opt/node/bin:/usr/bin', INBOX_API_URL: 'https://x/%20' } });

    expect(unit).toBe(
      [
        '[Unit]',
        'Description=Keeps Claude Code awake for Agent Inbox',
        'After=network-online.target',
        'Wants=network-online.target',
        '',
        '[Service]',
        'Type=simple',
        'WorkingDirectory=/Users/ada/projects/app & co',
        'Environment="PATH=/opt/node/bin:/usr/bin"',
        'Environment="INBOX_API_URL=https://x/%%20"',
        'ExecStart="/opt/node/bin/node" "/opt/agentinbox/dist/src/index.js" "wake" "run"',
        'Restart=on-failure',
        'RestartSec=30',
        'StandardOutput=append:/Users/ada/.agentinbox/wake/wake.log',
        'StandardError=append:/Users/ada/.agentinbox/wake/wake.log',
        '',
        '[Install]',
        'WantedBy=default.target',
        '',
      ].join('\n')
    );
  });

  it('installs into the user’s systemd folder, enables it, and removes it again', () => {
    const { ran, runner } = recordingRunner();
    const service = serviceManager({ platform: 'linux', home, env: {}, runner, wsl: false }) as ServiceManager;
    const file = join(home, '.config', 'systemd', 'user', SYSTEMD_UNIT);

    service.install(installable());

    expect(readFileSync(file, 'utf8')).toBe(systemdUnit(installable()));
    expect(ran).toEqual([
      'systemctl --user show-environment',
      'systemctl --user daemon-reload',
      `systemctl --user enable --now ${SYSTEMD_UNIT}`,
      `systemctl --user restart ${SYSTEMD_UNIT}`,
    ]);

    expect(service.uninstall()).toBe(true);
    expect(existsSync(file)).toBe(false);
    expect(ran.slice(-2)).toEqual([`systemctl --user disable --now ${SYSTEMD_UNIT}`, 'systemctl --user daemon-reload']);
  });

  it('follows XDG_CONFIG_HOME', () => {
    const { runner } = recordingRunner();
    const service = serviceManager({ platform: 'linux', home, env: { XDG_CONFIG_HOME: join(home, 'xdg') }, runner });

    expect(isUnsupported(service) ? null : service.file).toBe(join(home, 'xdg', 'systemd', 'user', SYSTEMD_UNIT));
  });

  it('explains how to turn systemd on in WSL when it isn’t running', () => {
    const { runner } = recordingRunner({ 'systemctl --user show-environment': { status: 1, output: 'not booted' } });
    const service = serviceManager({ platform: 'linux', home, env: {}, runner, wsl: true }) as ServiceManager;

    expect(() => service.install(installable())).toThrow('[boot] systemd=true');
    expect(existsSync(service.file)).toBe(false);
  });
});

describe('serviceManager', () => {
  it('sends Windows to WSL', () => {
    const service = serviceManager({ platform: 'win32', home });

    expect(isUnsupported(service) && service.unsupported).toContain('inside WSL');
  });
});
