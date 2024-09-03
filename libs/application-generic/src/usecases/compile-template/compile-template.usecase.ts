import { Injectable } from '@nestjs/common';
import Handlebars from 'handlebars';
import { format } from 'date-fns';
import { HandlebarHelpersEnum } from '@novu/shared';

import { CompileTemplateCommand } from './compile-template.command';
import { ApiException } from '../../utils/exceptions';

const assertResult = (condition: boolean, options) => {
  const fn = condition ? options.fn : options.inverse;

  return typeof fn === 'function' ? fn(this) : condition;
};

function createHandlebarsInstance(i18next: any) {
  const handlebars = Handlebars.create();

  handlebars.registerHelper('json', function (context) {
    return JSON.stringify(context);
  });

  if (i18next) {
    handlebars.registerHelper(
      HandlebarHelpersEnum.I18N,
      function (key, { hash, data, fn }) {
        const options = {
          ...data.root.i18next,
          ...hash,
          returnObjects: false,
        };

        // eslint-disable-next-line no-multi-assign
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
      },
    );
  }

  handlebars.registerHelper(
    HandlebarHelpersEnum.EQUALS,
    function (arg1, arg2, options) {
      // @ts-expect-error
      // eslint-disable-next-line eqeqeq
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    },
  );

  handlebars.registerHelper(HandlebarHelpersEnum.TITLECASE, function (value) {
    return value
      ?.split(' ')
      .map(
        (letter) =>
          letter.charAt(0).toUpperCase() + letter.slice(1).toLowerCase(),
      )
      .join(' ');
  });

  handlebars.registerHelper(HandlebarHelpersEnum.UPPERCASE, function (value) {
    return value?.toUpperCase();
  });

  handlebars.registerHelper(HandlebarHelpersEnum.LOWERCASE, function (value) {
    return value?.toLowerCase();
  });

  handlebars.registerHelper(
    HandlebarHelpersEnum.PLURALIZE,
    function (number, single, plural) {
      return number === 1 ? single : plural;
    },
  );

  handlebars.registerHelper(
    HandlebarHelpersEnum.DATEFORMAT,
    function (date, dateFormat) {
      // Format date if parameters are valid
      if (date && dateFormat && !Number.isNaN(Date.parse(date))) {
        return format(new Date(date), dateFormat);
      }

      return date;
    },
  );

  handlebars.registerHelper(
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
        result.push({ key, items: value });
      }

      return result;
    },
  );

  handlebars.registerHelper(
    HandlebarHelpersEnum.UNIQUE,
    function (array, property) {
      if (!Array.isArray(array)) return '';

      return (
        array
          // eslint-disable-next-line array-callback-return
          .map((item) => {
            if (item[property]) {
              return item[property];
            }
          })
          .filter((value, index, self) => self.indexOf(value) === index)
      );
    },
  );

  handlebars.registerHelper(
    HandlebarHelpersEnum.SORT_BY,
    function (array, property) {
      if (!Array.isArray(array)) return '';
      if (!property) return array.sort();

      return array.sort(function (a, b) {
        const _x = a[property];
        const _y = b[property];

        // eslint-disable-next-line no-nested-ternary
        return _x < _y ? -1 : _x > _y ? 1 : 0;
      });
    },
  );

  // based on: https://gist.github.com/DennyLoko/61882bc72176ca74a0f2
  handlebars.registerHelper(
    HandlebarHelpersEnum.NUMBERFORMAT,
    function (number, options) {
      if (Number.isNaN(number)) {
        return number;
      }

      const decimalLength = options.hash.decimalLength || 2;
      const thousandsSep = options.hash.thousandsSep || ',';
      const decimalSep = options.hash.decimalSep || '.';

      const value = parseFloat(number);

      const re = `\\d(?=(\\d{3})+${decimalLength > 0 ? '\\D' : '$'})`;

      // eslint-disable-next-line no-bitwise
      const num = value.toFixed(Math.max(0, ~~decimalLength));

      return (decimalSep ? num.replace('.', decimalSep) : num).replace(
        new RegExp(re, 'g'),
        `$&${thousandsSep}`,
      );
    },
  );

  handlebars.registerHelper(
    HandlebarHelpersEnum.GT,
    function (arg1, arg2, options) {
      return assertResult(arg1 > arg2, options);
    },
  );

  handlebars.registerHelper(
    HandlebarHelpersEnum.GTE,
    function (arg1, arg2, options) {
      return assertResult(arg1 >= arg2, options);
    },
  );

  handlebars.registerHelper(
    HandlebarHelpersEnum.LT,
    function (arg1, arg2, options) {
      return assertResult(arg1 < arg2, options);
    },
  );

  handlebars.registerHelper(
    HandlebarHelpersEnum.LTE,
    function (arg1, arg2, options) {
      return assertResult(arg1 <= arg2, options);
    },
  );

  handlebars.registerHelper(
    HandlebarHelpersEnum.EQ,
    function (arg1, arg2, options) {
      return assertResult(arg1 === arg2, options);
    },
  );

  handlebars.registerHelper(
    HandlebarHelpersEnum.NE,
    function (arg1, arg2, options) {
      return assertResult(arg1 !== arg2, options);
    },
  );

  return handlebars;
}

@Injectable()
export class CompileTemplate {
  async execute(
    command: CompileTemplateCommand,
    // we need i18nInstance outside the command on order to avoid command serialization on it.
    i18nInstance?: any,
  ): Promise<string> {
    const templateContent = command.template || '';

    let result = '';
    try {
      const handlebars = createHandlebarsInstance(i18nInstance);
      const template = handlebars.compile(templateContent);

      result = template(command.data, {});
    } catch (e: any) {
      throw new ApiException(
        e?.message || `Handlebars message content could not be generated ${e}`,
      );
    }

    return result.replace(/&#x27;/g, "'");
  }
}
