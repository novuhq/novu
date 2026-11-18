// A stand-in for the listener's check (`agentinbox contact-check --host codex`), for the loop's tests with the fake
// Codex: it reads a hook's input and refuses every tool call but the run's own conversation tools and the commands
// FAKE_HOOK_ALLOW (a regular expression) matches, in the words the real check refuses with. It refuses everything
// when the listener didn't give it the folder (AGENTINBOX_CODEX_FOLDER). The real check's rules are tested on their
// own (`codex-folder.spec.ts`).
import { readFileSync } from 'node:fs';

const event = JSON.parse(readFileSync(0, 'utf8'));
const given = JSON.parse(process.env.AGENTINBOX_CODEX_FOLDER || 'null');
const command = String(event.tool_input?.command ?? '');
const allow = process.env.FAKE_HOOK_ALLOW ? new RegExp(process.env.FAKE_HOOK_ALLOW) : null;
const ours = String(event.tool_name).startsWith('mcp__this_conversation__');
if (given?.folder && (ours || (event.tool_name === 'Bash' && allow?.test(command)))) {
  process.exit(0);
}

const what = event.tool_name === 'Bash' ? `\`${command}\`` : event.tool_name;
const why = given?.folder
  ? 'no rule in the folder’s Codex settings allows it'
  : 'the listener didn’t say what this folder allows';
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `Refused: ${what}, as ${why}. In a contact’s conversation only what this folder’s settings allow works, so don’t look for another way.`,
    },
  })
);
