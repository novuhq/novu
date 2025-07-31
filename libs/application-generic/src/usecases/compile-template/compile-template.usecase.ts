import { BadRequestException, Injectable } from '@nestjs/common';
import { HandlebarHelpersEnum } from '@novu/shared';
import { format } from 'date-fns';
import Handlebars from 'handlebars';
import { CompileTemplateCommand } from './compile-template.command';

const assertResult = (condition: boolean, options) => {
  const fn = condition ? options.fn : options.inverse;

  return typeof fn === 'function' ? fn(this) : condition;
};

function createHandlebarsInstance(i18next: any) {
  const handlebars = Handlebars.create();

  handlebars.registerHelper('json', (context) => JSON.stringify(context));

  if (i18next) {
    handlebars.registerHelper(HandlebarHelpersEnum.I18N, function (key, { hash, data, fn }) {
      const options = {
        ...data.root.i18next,
        ...hash,
        returnObjects: false,
      };

      const replace = (options.replace = {
        // @ts-ignore
        ...this,
        ...options.replace,
        ...hash,
      });
      delete replace.i18next; // may creep in if this === data.root

      if (fn) {
        options.defaultValue = fn(replace);
      }

      // @ts-ignore
      return new handlebars.SafeString(i18next.t(key, options));
    });
  }

  handlebars.registerHelper(HandlebarHelpersEnum.EQUALS, function (arg1, arg2, options) {
    // @ts-expect-error
    return arg1 == arg2 ? options.fn(this) : options.inverse(this);
  });

  handlebars.registerHelper(HandlebarHelpersEnum.TITLECASE, (value) =>
    value
      ?.split(' ')
      .map((letter) => letter.charAt(0).toUpperCase() + letter.slice(1).toLowerCase())
      .join(' ')
  );

  handlebars.registerHelper(HandlebarHelpersEnum.UPPERCASE, (value) => value?.toUpperCase());

  handlebars.registerHelper(HandlebarHelpersEnum.LOWERCASE, (value) => value?.toLowerCase());

  handlebars.registerHelper(HandlebarHelpersEnum.PLURALIZE, (number, single, plural) =>
    number === 1 ? single : plural
  );

  handlebars.registerHelper(HandlebarHelpersEnum.DATEFORMAT, (date, dateFormat) => {
    // Format date if parameters are valid
    if (date && dateFormat && !Number.isNaN(Date.parse(date))) {
      return format(new Date(date), dateFormat);
    }

    return date;
  });

  handlebars.registerHelper(HandlebarHelpersEnum.GROUP_BY, (array, property) => {
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
      result.push({ key, items: value });
    }

    return result;
  });

  handlebars.registerHelper(HandlebarHelpersEnum.UNIQUE, (array, property) => {
    if (!Array.isArray(array)) return '';

    return array
      .map((item) => {
        if (item[property]) {
          return item[property];
        }
      })
      .filter((value, index, self) => self.indexOf(value) === index);
  });

  handlebars.registerHelper(HandlebarHelpersEnum.SORT_BY, (array, property) => {
    if (!Array.isArray(array)) return '';
    if (!property) return array.sort();

    return array.sort((a, b) => {
      const _x = a[property];
      const _y = b[property];

      return _x < _y ? -1 : _x > _y ? 1 : 0;
    });
  });

  // based on: https://gist.github.com/DennyLoko/61882bc72176ca74a0f2
  handlebars.registerHelper(HandlebarHelpersEnum.NUMBERFORMAT, (number, options) => {
    if (Number.isNaN(number)) {
      return number;
    }

    const decimalLength = options.hash.decimalLength || 2;
    const thousandsSep = options.hash.thousandsSep || ',';
    const decimalSep = options.hash.decimalSep || '.';

    const value = parseFloat(number);

    const re = `\\d(?=(\\d{3})+${decimalLength > 0 ? '\\D' : '$'})`;

    const num = value.toFixed(Math.max(0, ~~decimalLength));

    return (decimalSep ? num.replace('.', decimalSep) : num).replace(new RegExp(re, 'g'), `$&${thousandsSep}`);
  });

  handlebars.registerHelper(HandlebarHelpersEnum.GT, (arg1, arg2, options) => assertResult(arg1 > arg2, options));

  handlebars.registerHelper(HandlebarHelpersEnum.GTE, (arg1, arg2, options) => assertResult(arg1 >= arg2, options));

  handlebars.registerHelper(HandlebarHelpersEnum.LT, (arg1, arg2, options) => assertResult(arg1 < arg2, options));

  handlebars.registerHelper(HandlebarHelpersEnum.LTE, (arg1, arg2, options) => assertResult(arg1 <= arg2, options));

  handlebars.registerHelper(HandlebarHelpersEnum.EQ, (arg1, arg2, options) => assertResult(arg1 === arg2, options));

  handlebars.registerHelper(HandlebarHelpersEnum.NE, (arg1, arg2, options) => assertResult(arg1 !== arg2, options));

  return handlebars;
}

@Injectable()
export class CompileTemplate {
  async execute(
    command: CompileTemplateCommand,
    // we need i18nInstance outside the command on order to avoid command serialization on it.
    i18nInstance?: any
  ): Promise<string> {
    const templateContent = command.template || '';

    let result = '';
    try {
      const handlebars = createHandlebarsInstance(i18nInstance);
      const template = handlebars.compile(templateContent);

      result = template(command.data, {});
    } catch (e: any) {
      throw new BadRequestException(e?.message || `Handlebars message content could not be generated ${e}`);
    }

    return result.replace(/&#x27;/g, "'");
  }
}
