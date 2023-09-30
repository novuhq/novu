import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { format } from 'date-fns';
import { HandlebarHelpersEnum } from '@novu/shared';

import { CompileTemplateCommand } from './compile-template.command';

Handlebars.registerHelper(
  HandlebarHelpersEnum.EQUALS,
  function (arg1, arg2, options) {
    // eslint-disable-next-line
    // @ts-expect-error
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

Handlebars.registerHelper(
  HandlebarHelpersEnum.GROUP_BY,
  function (array, property) {
    if (!Array.isArray(array)) return [];
    const map = {};
    array.forEach((item) => {
      if (item[property]) {
        const key = item[property];
        if (!map[key]) {
          map[key] = [item];
        } else {
          map[key].push(item);
        }
      }
    });

    const result = [];
    for (const [key, value] of Object.entries(map)) {
      result.push({ key: key, items: value });
    }

    return result;
  }
);

Handlebars.registerHelper(
  HandlebarHelpersEnum.UNIQUE,
  function (array, property) {
    if (!Array.isArray(array)) return '';

    return array
      .map((item) => {
        if (item[property]) {
          return item[property];
        }
      })
      .filter((value, index, self) => self.indexOf(value) === index);
  }
);

Handlebars.registerHelper(
  HandlebarHelpersEnum.SORT_BY,
  function (array, property) {
    if (!Array.isArray(array)) return '';
    if (!property) return array.sort();

    return array.sort(function (a, b) {
      const _x = a[property];
      const _y = b[property];

      return _x < _y ? -1 : _x > _y ? 1 : 0;
    });
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
