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

  /** True when this variable is used as a collection in a {% for %} or {% tablerow %} loop */
  isForLoopCollection?: boolean;

  /** Property paths accessed on the iterator inside the loop body (e.g. ["label", "id"]).
   *  Non-empty means array of objects; empty means array of scalars. */
  iteratorProperties?: string[];
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
