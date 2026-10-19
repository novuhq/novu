import chalk from 'chalk';

interface ILogger {
  info: (message: string, ...args: unknown[]) => void;
  success: (message: string, ...args: unknown[]) => void;
  warning: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  gray: (message: string, ...args: unknown[]) => void;
  cyan: (message: string) => string;
  blue: (message: string) => string;
  yellow: (message: string) => string;
  bold: (message: string) => string;
  step: (number: number, title: string) => void;
  divider: () => void;
  banner: () => void;
}

const logger: ILogger = {
  info: (message, ...args) => console.log(chalk.blue(message), ...args),
  success: (message, ...args) => console.log(chalk.green(message), ...args),
  warning: (message, ...args) => console.log(chalk.yellow(message), ...args),
  error: (message, ...args) => console.error(chalk.red(message), ...args),
  gray: (message, ...args) => console.log(chalk.gray(message), ...args),
  cyan: (message) => chalk.cyan(message),
  blue: (message) => chalk.blue(message),
  yellow: (message) => chalk.yellow(message),
  bold: (message) => chalk.bold(message),

  step: (number, title) => {
    console.log(`\n${chalk.blue(`Step ${number}: ${title}`)}`);
  },

  divider: () => {
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  },

  banner: () => {
    console.log('\n');
    console.log('██╗███╗   ██╗██████╗  ██████╗ ██╗  ██╗');
    console.log('██║████╗  ██║██╔══██╗██╔═══██╗╚██╗██╔╝');
    console.log('██║██╔██╗ ██║██████╔╝██║   ██║ ╚███╔╝ ');
    console.log('██║██║╚██╗██║██╔══██╗██║   ██║ ██╔██╗ ');
    console.log('██║██║ ╚████║██████╔╝╚██████╔╝██╔╝ ██╗');
    console.log('╚═╝╚═╝  ╚═══╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝');
    console.log(chalk.bold('by Novu\n'));
    console.log(chalk.gray('This installer will help you set up the Novu Inbox component in your project.\n'));
  },
};

export default logger;
