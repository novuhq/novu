import { prompt as InquirerPrompt, ListQuestionOptions, Answers } from 'inquirer';

export async function prompt(promptArray: ListQuestionOptions[]): Promise<Answers> {
  return InquirerPrompt(promptArray);
}
