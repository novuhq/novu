import readline from 'node:readline';
import pc from 'picocolors';

export function info(message: string): void {
  process.stdout.write(`${pc.dim('•')} ${message}\n`);
}

export async function promptLine(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await new Promise((resolve) => {
      rl.question(question, resolve);
    });
  } finally {
    rl.close();
  }
}
