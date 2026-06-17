export function buildChatSdkAgentPrompt(input: { projectDir: string }): string {
  return [
    "Integrate the Novu Chat SDK adapter into this project using the novu-chat-sdk skill.",
    "",
    "Code wiring:",
    "- Merge createNovuAdapter into the existing Chat instance (one bot only — never scaffold a second Chat).",
    "- Reuse the existing webhook route when present (e.g. app/api/webhooks/[platform]/route.ts serves /api/webhooks/novu via bot.webhooks.novu).",
    "- Otherwise add POST /api/webhooks/novu that forwards to the Novu adapter webhook handler.",
    "- Install @novu/chat-sdk-adapter and any other missing Chat SDK deps.",
    "- Do not modify .env or .env.local — Novu Connect already wrote NOVU_SECRET_KEY and NOVU_AGENT_IDENTIFIER.",
    "",
    "Local dev tunnel (required for Novu to reach your bridge):",
    "- Add a dev:novu npm script, e.g.:",
    '  npx novu dev -p 4000 --no-studio --route /api/webhooks/novu --run "next dev --port=4000"',
    "  (match -p and the --run command to this project's dev server port/command)",
    "- npx novu dev creates a public tunnel to localhost and registers the tunneled bridge URL with Novu on start.",
    "- Use npm run dev:novu for local development — not plain npm run dev — so the bridge URL stays synced.",
    "",
    `Project directory: ${input.projectDir}`,
  ].join("\n");
}
