import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { claudeCode } from './claude-code';
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
  home = mkdtempSync(join(tmpdir(), 'listen-service-'));
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

const SHELL = {
  PATH: '/opt/node/bin:/usr/bin',
  INBOX_CONFIG: '/Users/ada/.agentinbox-local/config.json',
  INBOX_API_URL: 'https://agentinbox.example/api',
  INBOX_SECRET_KEY: 'sk_never_written',
  HOME: '/Users/ada',
  CLAUDE_CONFIG_DIR: '/Users/ada/.claude-work',
  CLAUDE_CODE_USE_VERTEX: '1',
  CLOUD_ML_REGION: 'europe-west4',
  ANTHROPIC_VERTEX_PROJECT_ID: 'ada-ml',
  ANTHROPIC_API_KEY: 'sk-ant-never-written',
  CLAUDE_CODE_OAUTH_TOKEN: 'never written',
  CLAUDE_CODE_SESSION_ID: 'the parent session',
};

const COMMAND = backgroundCommand({
  script: '/opt/agentinbox/dist/src/index.js',
  nodePath: '/opt/node/bin/node',
  version: '0.1.0',
  env: SHELL,
  hostSettings: claudeCode.settingsIn(SHELL),
  project: '/Users/ada/projects/app & co',
  logFile: '/Users/ada/.agentinbox/listen/listen.log',
  description: 'Listens for Agent Inbox messages for Claude Code',
});

/** The same command, with its log in the test's own home, where installing it may make the log's folder. */
function installable() {
  return { ...COMMAND, logFile: join(home, '.agentinbox', 'listen', 'listen.log') };
}

describe('backgroundCommand', () => {
  it('starts the same CLI file, with only the variables it needs: never a secret, nor an API to send the key to', () => {
    expect(COMMAND).toEqual({
      argv: ['/opt/node/bin/node', '/opt/agentinbox/dist/src/index.js', 'listen', 'run'],
      workingDirectory: '/Users/ada/projects/app & co',
      // Claude Code's own settings come along: where it keeps its settings and sign-in, and the provider it uses.
      env: {
        PATH: '/opt/node/bin:/usr/bin',
        INBOX_CONFIG: '/Users/ada/.agentinbox-local/config.json',
        CLAUDE_CONFIG_DIR: '/Users/ada/.claude-work',
        CLAUDE_CODE_USE_VERTEX: '1',
        CLOUD_ML_REGION: 'europe-west4',
        ANTHROPIC_VERTEX_PROJECT_ID: 'ada-ml',
      },
      logFile: '/Users/ada/.agentinbox/listen/listen.log',
      description: 'Listens for Agent Inbox messages for Claude Code',
    });
  });

  it('leaves out a value with a line break, which would add a line of its own to the systemd unit', () => {
    const shell = { PATH: '/usr/bin', ANTHROPIC_MODEL: 'claude-opus-5-5\nExecStartPre=/bin/sh -c "touch /tmp/x"' };
    const command = backgroundCommand({
      script: '/opt/agentinbox/dist/src/index.js',
      nodePath: '/opt/node/bin/node',
      version: '0.1.0',
      env: shell,
      hostSettings: claudeCode.settingsIn(shell),
      project: '/Users/ada/app',
      logFile: '/tmp/listen.log',
      description: 'd',
    });

    expect(command.env).toEqual({ PATH: '/usr/bin' });
    expect(systemdUnit(command)).not.toContain('\nExecStartPre=');
  });

  it('starts the same version through npx when it runs from npx’s cache, which npm may clean', () => {
    const fromCache = backgroundCommand({
      script: '/Users/ada/.npm/_npx/4f1a/node_modules/@agentinbox/cli/dist/src/index.js',
      nodePath: '/opt/node/bin/node',
      version: '0.1.0',
      env: {},
      project: '/Users/ada/app',
      logFile: '/tmp/listen.log',
      description: 'd',
    });

    expect(fromCache.argv).toEqual(['/opt/node/bin/npx', '--yes', '@agentinbox/cli@0.1.0', 'listen', 'run']);
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
    expect(plist).toContain('<key>StandardOutPath</key>\n  <string>/Users/ada/.agentinbox/listen/listen.log</string>');
    expect(plist).toContain('<key>INBOX_CONFIG</key>');
    expect(plist).not.toContain('INBOX_API_URL');
    expect(plist).not.toContain('sk_never_written');
  });

  it('starts the CLI through a script named agentinbox-listen, the name macOS lists it by', () => {
    expect(launchdLauncher(COMMAND)).toBe(
      [
        '#!/bin/sh',
        '# Listens for Agent Inbox messages for Claude Code. `npx @agentinbox/cli listen stop` turns it off and removes this file.',
        "exec '/opt/node/bin/node' '/opt/agentinbox/dist/src/index.js' 'listen' 'run'",
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
    expect(existsSync(join(home, '.agentinbox', 'listen'))).toBe(true);
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
    const unit = systemdUnit({
      ...COMMAND,
      env: { PATH: '/opt/node/bin:/usr/bin', INBOX_CONFIG: '/x/%20/config.json' },
    });

    expect(unit).toBe(
      [
        '[Unit]',
        'Description=Listens for Agent Inbox messages for Claude Code',
        'After=network-online.target',
        'Wants=network-online.target',
        '',
        '[Service]',
        'Type=simple',
        'WorkingDirectory=/Users/ada/projects/app & co',
        'Environment="PATH=/opt/node/bin:/usr/bin"',
        'Environment="INBOX_CONFIG=/x/%%20/config.json"',
        'ExecStart="/opt/node/bin/node" "/opt/agentinbox/dist/src/index.js" "listen" "run"',
        'Restart=on-failure',
        'RestartSec=30',
        'StandardOutput=append:/Users/ada/.agentinbox/listen/listen.log',
        'StandardError=append:/Users/ada/.agentinbox/listen/listen.log',
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
