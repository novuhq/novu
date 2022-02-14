import { prompt } from '../client';
import { promptIntroArray } from './init.consts';

export async function initCommand() {
  try {
    await prompt(promptIntroArray);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
}
