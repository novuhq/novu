import { spawn } from 'node:child_process';

type ClipboardCommand = { command: string; args: string[] };

function resolveClipboardCommand(): ClipboardCommand | null {
  if (process.platform === 'darwin') {
    return { command: 'pbcopy', args: [] };
  }

  if (process.platform === 'win32') {
    return { command: 'clip', args: [] };
  }

  if (process.env.WAYLAND_DISPLAY) {
    return { command: 'wl-copy', args: [] };
  }

  return { command: 'xclip', args: ['-selection', 'clipboard'] };
}

/**
 * Best-effort copy to the OS clipboard by shelling out to the platform tool.
 * Returns false (never throws) when no clipboard tool is available — callers
 * fall back to printing the content or its file path.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const clipboard = resolveClipboardCommand();
  if (!clipboard) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(clipboard.command, clipboard.args);
    } catch {
      resolve(false);

      return;
    }

    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));

    child.stdin?.on('error', () => resolve(false));
    child.stdin?.end(text);
  });
}
