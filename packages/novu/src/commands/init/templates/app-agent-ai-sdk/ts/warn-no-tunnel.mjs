const cyan = '\x1b[36m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

const packageManager = process.argv[2] || 'npm';
const runCmd = `${packageManager} run dev:novu`;

console.log(
  `\n${cyan}${bold}ℹ  Starting Next.js dev server${reset} ${dim}(no tunnel)${reset}\n` +
    `\n` +
    `   ${dim}Want to test with Novu's dev tunnel for local development?${reset}\n` +
    `   Run ${bold}${runCmd}${reset} ${dim}to start with the tunnel enabled.${reset}\n`
);
