import { Template } from 'liquidjs';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';

export type Variable = {
  /**
   * The variable name/path (e.g. for valid variables "user.name",
   * for invalid variables will fallback to output "{{user.name | upcase}}")
   */
  name: string;

  /** The surrounding context where the variable was found, useful for error messages */
  context?: string;

  /** Error message if the variable is invalid */
  message?: string;

  /** Error message if the variable filter is invalid */
  filterMessage?: string;

  /** The full liquid output string (e.g. "{{user.name | upcase}}") */
  output: string;

  /** The start index of the output */
  outputStart: number;

  /** The end index of the output */
  outputEnd: number;
};

export type VariableDetails = {
  validVariables: Array<Variable>;
  invalidVariables: Array<Variable>;
};

export type ProcessContext = {
  templates: Template[];
  validVariables: Array<Variable>;
  invalidVariables: Array<Variable>;
  variableSchema?: JSONSchemaDto;
  localVariables?: Set<string>;
  suggestPayloadNamespace?: boolean;
};
