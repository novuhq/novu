import { prompt as InquirerPrompt, ListQuestionOptions, Answers } from 'inquirer';

export async function prompt(questions: ListQuestionOptions[]): Promise<Answers> {
  return InquirerPrompt(questions);
}
