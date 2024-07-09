import chalk from 'chalk';
import gradient from 'gradient-string';
import chalkAnimation from './animation';

export async function showWelcomeScreen() {
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
  const animation = chalkAnimation.pulse(logo, 0.6);

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      /* eslint-disable no-console */
      console.log(chalk.bold(`                      Welcome to NOVU!`));
      console.log(chalk.bold(textGradient(`         The open-source notification framework\n`)));
      resolve();
      /* eslint-enable  no-console */
    }, 600);
  });
}
