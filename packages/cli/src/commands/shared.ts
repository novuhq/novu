import * as chalk from 'chalk';
import * as gradient from 'gradient-string';

export function showWelcomeScreen() {
  const textGradient = gradient('#0099F7', '#ff3432');
  const logoGradient = gradient('#DD2476', '#FF512F');
  const logo = `
                        @@@@@@@@@@@@@        
                @@@       @@@@@@@@@@@        
              @@@@@@@@       @@@@@@@@        
            @@@@@@@@@@@@       @@@@@@     @@ 
           @@@@@@@@@@@@@@@@      @@@@     @@@
          @@@@@@@@@@@@@@@@@@@       @     @@@
          @@@@@         @@@@@@@@         @@@@
           @@@     @       @@@@@@@@@@@@@@@@@@
           @@@     @@@@      @@@@@@@@@@@@@@@@
            @@     @@@@@@       @@@@@@@@@@@@ 
                   @@@@@@@@       @@@@@@@@   
                   @@@@@@@@@@@       @@@     
                   @@@@@@@@@@@@@                  
                          `;

  const items = logo.split('\n').map((row) => logoGradient(row));

  /* eslint-disable no-console */
  console.log(chalk.bold(items.join('\n')));
  console.log(chalk.bold(`                      Welcome to NOVU!`));
  console.log(chalk.bold(textGradient(`         The open-source notification framework\n`)));
  /* eslint-enable  no-console */
}
