import * as inquirer from 'inquirer';
import { InquirerQuestion } from './cli.interface';

export async function promptAsync(promptArray: InquirerQuestion[]) {
  return new Promise((resolve, reject) =>
    inquirer
      .prompt(promptArray)
      .then((answers) => {
        resolve(answers);
        return null;
      })
      .catch((error) => {
        reject(error);
      })
  );
}
