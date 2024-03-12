/**
 * Configuration file for react-scanner: https://github.com/moroshko/react-scanner
 *
 * Used to assess usage of Mantine and Design System components in web.
 *
 * To use:
 * 1. Run `pnpm audit-components`
 * 2. Check `OUTPUT_PATH` for your scan results!
 */

/** the path of the scan output */
const OUTPUT_PATH = './component-scans';
const OUTPUT_FILE_NAME = 'scan';
const OUTPUT_FILE_EXTENSION = 'json';

/**
 * @param {string} suffix Optional filename suffix
 * @returns file path for the output file
 */
const getOutputFilePath = (suffix) => {
  return `${OUTPUT_PATH}/${OUTPUT_FILE_NAME}${suffix ?? ''}.${OUTPUT_FILE_EXTENSION}`;
};

const NOVU_ICON_REGEX = /^Icon(?!Button)[A-Z0-9]{1}[a-zA-Z0-9]+$/;
const ANTD_ICON_MODULE_NAME = '@ant-design/icons';

module.exports = {
  /** directory to scan */
  crawlFrom: './src',
  includeSubComponents: true,
  /** Regex for determining which imports to include */
  importedFrom:
    /(@novu\/(design-system|shared-web|notification-center)|@mantine\/core|@ant-design)(\/[a-z0-9\-)]+){0,}/gim,
  exclude: ['/src/api', '/src/styled-system', ''],
  processors: [countComponentsAndPropsProcessor, groupByNamespaceProcessor],
  /** file patterns to scan */
  globs: ['**/!(*.test|*.spec|*.stories).@(js|ts)x'],
  /** function for naming components -- we use the returned name as the "group by" key. */
  getComponentName: ({ imported, local, moduleName, importType }) => {
    if (!imported) {
      return local;
    }
    // get the module namespace / org (AKA novu or mantine), but remove @
    const moduleOrg = moduleName.split('/')[0].replace('@', '');

    // group Icons if from Novu Design System or AntD
    const name =
      (moduleName === '@novu/design-system' && NOVU_ICON_REGEX.test(imported)) || moduleName === ANTD_ICON_MODULE_NAME
        ? 'Icon'
        : imported;

    return `${moduleOrg}/${name}`;
  },
};

/**
 * Based on built-in processor from react-scanner to make it easier to customize.
 * https://github.com/moroshko/react-scanner/blob/master/src/processors/count-components-and-props.js
 */
function countComponentsAndPropsProcessor({ forEachComponent, sortObjectKeysByValue, output }) {
  let result = {};

  forEachComponent(({ componentName, component }) => {
    const { instances } = component;

    if (!instances) {
      return;
    }

    result[componentName] = {
      instances: instances.length,
      props: {},
    };

    instances.forEach((instance) => {
      for (const prop in instance.props) {
        if (result[componentName].props[prop] === undefined) {
          result[componentName].props[prop] = 0;
        }

        result[componentName].props[prop] += 1;
      }

      // aggregate icon names and output as a prop to stay consistent across all output components.
      if (componentName.includes('/Icon')) {
        const iconName = instance.importInfo.imported;
        const existingIconNames = result[componentName].props.iconNames;

        result[componentName].props.iconNames = existingIconNames ? existingIconNames.concat(iconName) : [iconName];
      }
    });

    result[componentName].props = sortObjectKeysByValue(result[componentName].props);
  });

  result = sortObjectKeysByValue(result, (component) => component.instances);

  output(result, getOutputFilePath());

  return result;
}

/**
 * Processor for grouping by namespace (i.e. Novu, Mantine, etc)
 */
function groupByNamespaceProcessor({ prevResult, output }) {
  const result = Object.entries(prevResult).reduce((groupedResult, [compKey, compVal]) => {
    const [namespace, compName] = compKey.split('/');

    return {
      ...groupedResult,
      [namespace]: {
        ...groupedResult[namespace],
        [compName]: compVal,
      },
    };
  }, {});

  output(result, getOutputFilePath('.grouped'));

  return result;
}
