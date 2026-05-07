const yellow = '\x1b[33m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

console.log(
  `\n${yellow}⚠  Tunnel is OFF${reset} ${dim}– your agent won't receive messages from providers.${reset}\n` +
    `   Run ${bold}npm run dev:novu${reset} to start with the dev tunnel.\n`
);
