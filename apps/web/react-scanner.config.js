/**
 * Configuration file for react-scanner: https://github.com/moroshko/react-scanner
 *
 * Used to assess usage of Mantine and Design System components in web.
 */

/** the path of the scan output */
const OUTPUT_PATH = './component-scans/scan.json';

/**
 * Copy-pasta of the built-in processor from react-scanner to make it easier to customize.
 * https://github.com/moroshko/react-scanner/blob/master/src/processors/count-components-and-props.js
 */
const countComponentsAndPropsProcessor = ({ forEachComponent, sortObjectKeysByValue, output }) => {
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
    });

    result[componentName].props = sortObjectKeysByValue(result[componentName].props);
  });

  result = sortObjectKeysByValue(result, (component) => component.instances);

  output(result);

  return result;
};

module.exports = {
  /** directory to scan */
  crawlFrom: './src/components',
  includeSubComponents: true,
  /** Regex for determining which imports to include */
  importedFrom: /(@novu\/(design-system|shared-web|notification-center)|@mantine\/core)(\/[a-z0-9\-)]+){0,}/gim,
  processors: [
    ['count-components-and-props', { outputTo: OUTPUT_PATH }],
    // countComponentsAndPropsProcessor
  ],
  /** function for naming components -- we use the returned name as the "group by" key. */
  getComponentName: ({ imported, local, moduleName, importType }) => {
    if (!imported) {
      return local;
    }
    // get the module namespace / org (AKA novu or mantine), but remove @
    const moduleOrg = moduleName.split('/')[0].replace('@', '');

    return `${moduleOrg}/${imported}`;
  },
};
