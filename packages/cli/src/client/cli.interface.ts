export interface InquirerQuestion {
  type: string;
  name: string;
  message: string;
  default: string;
  choices: string[];
}
