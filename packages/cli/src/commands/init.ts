import { promptAsync } from '../client';
import { promptIntroArray } from './init.consts';
import { IIntroAnswers } from './init.interface';

export async function initCommand() {
  try {
    <IIntroAnswers>await promptAsync(promptIntroArray);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
}
