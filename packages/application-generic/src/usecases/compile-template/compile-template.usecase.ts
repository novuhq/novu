import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { format } from 'date-fns';
import { HandlebarHelpersEnum } from '@novu/shared';

import { CompileTemplateCommand } from './compile-template.command';
import * as i18next from 'i18next';

Handlebars.registerHelper(
  HandlebarHelpersEnum.I18N,
  function (key, { hash, data, fn }) {
    const options = {
      ...data.root.i18next,
      ...hash,
      returnObjects: false,
    };

    const replace = (options.replace = {
      // eslint-disable-next-line
      // @ts-ignore
      ...this,
      ...options.replace,
      ...hash,
    });
    delete replace.i18next; // may creep in if this === data.root

    if (fn) {
      options.defaultValue = fn(replace);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return new Handlebars.SafeString(i18next.t(key, options));
  }
);
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

// based on: https://gist.github.com/DennyLoko/61882bc72176ca74a0f2
Handlebars.registerHelper(
  HandlebarHelpersEnum.NUMBERFORMAT,
  function (number, options) {
    if (isNaN(number)) {
      return number;
    }

    const decimalLength = options.hash.decimalLength || 2;
    const thousandsSep = options.hash.thousandsSep || ',';
    const decimalSep = options.hash.decimalSep || '.';

    const value = parseFloat(number);

    const re = '\\d(?=(\\d{3})+' + (decimalLength > 0 ? '\\D' : '$') + ')';

    const num = value.toFixed(Math.max(0, ~~decimalLength));

    return (decimalSep ? num.replace('.', decimalSep) : num).replace(
      new RegExp(re, 'g'),
      '$&' + thousandsSep
    );
  }
);

Handlebars.registerHelper(
  HandlebarHelpersEnum.GT,
  function (arg1, arg2, options) {
    // eslint-disable-next-line
    // @ts-expect-error
    return arg1 > arg2 ? options.fn(this) : options.inverse(this);
  }
);

Handlebars.registerHelper(
  HandlebarHelpersEnum.GTE,
  function (arg1, arg2, options) {
    // eslint-disable-next-line
    // @ts-expect-error
    return arg1 >= arg2 ? options.fn(this) : options.inverse(this);
  }
);

Handlebars.registerHelper(
  HandlebarHelpersEnum.LT,
  function (arg1, arg2, options) {
    // eslint-disable-next-line
    // @ts-expect-error
    return arg1 < arg2 ? options.fn(this) : options.inverse(this);
  }
);

Handlebars.registerHelper(
  HandlebarHelpersEnum.LTE,
  function (arg1, arg2, options) {
    // eslint-disable-next-line
    // @ts-expect-error
    return arg1 <= arg2 ? options.fn(this) : options.inverse(this);
  }
);

Handlebars.registerHelper(
  HandlebarHelpersEnum.EQ,
  function (arg1, arg2, options) {
    // eslint-disable-next-line
    // @ts-expect-error
    return arg1 === arg2 ? options.fn(this) : options.inverse(this);
  }
);

Handlebars.registerHelper(
  HandlebarHelpersEnum.NE,
  function (arg1, arg2, options) {
    // eslint-disable-next-line
    // @ts-expect-error
    return arg1 !== arg2 ? options.fn(this) : options.inverse(this);
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
