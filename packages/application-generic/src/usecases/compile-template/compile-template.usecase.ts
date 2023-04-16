import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { format } from 'date-fns';
import { HandlebarHelpersEnum } from '@novu/shared';

import { CompileTemplateCommand } from './compile-template.command';

Handlebars.registerHelper(
  HandlebarHelpersEnum.EQUALS,
  function (arg1, arg2, options) {
    // eslint-disable-next-line
    // @ts-ignore
    return arg1 == arg2 ? options.fn(this) : options.inverse(this);
  }
);

Handlebars.registerHelper(HandlebarHelpersEnum.TITLECASE, function (value) {
  return value
    ?.split(' ')
    .map(
      (letter) => letter.charAt(0).toUpperCase() + letter.slice(1).toLowerCase()
    )
    .join(' ');
});

Handlebars.registerHelper(HandlebarHelpersEnum.UPPERCASE, function (value) {
  return value?.toUpperCase();
});

Handlebars.registerHelper(HandlebarHelpersEnum.LOWERCASE, function (value) {
  return value?.toLowerCase();
});

Handlebars.registerHelper(
  HandlebarHelpersEnum.PLURALIZE,
  function (number, single, plural) {
    return number === 1 ? single : plural;
  }
);

Handlebars.registerHelper(
  HandlebarHelpersEnum.DATEFORMAT,
  function (date, dateFormat) {
    // Format date if parameters are valid
    if (date && dateFormat && !isNaN(Date.parse(date))) {
      return format(new Date(date), dateFormat);
    }

    return date;
  }
);

@Injectable()
export class CompileTemplate {
  async execute(command: CompileTemplateCommand): Promise<string> {
    const templateContent = command.template;

    const template = Handlebars.compile(templateContent);

    const result = template(command.data, {});

    return result.replace(/&#x27;/g, "'");
  }
}
