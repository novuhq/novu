import { Answers, prompt as InquirerPrompt, ListQuestionOptions } from 'inquirer';

export async function prompt(questions: ListQuestionOptions[]): Promise<Answers> {
  return InquirerPrompt(questions);
}
