#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands';

const program = new Command();

program.name('novu').description('A CLI tool to interact with the novu API');

program
  .command('init')
  .description('Initialize a new project and create an account')
  .action(() => {
    initCommand();
  });

program.parse();
