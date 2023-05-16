/* eslint-disable @typescript-eslint/ban-ts-comment, multiline-comment-style */
/**
 * The code was taken from the following repository: https://github.com/bitovi/react-to-webcomponent
 * and improved to support rendering React through Web Components in the AngularJS app
 */
import React from 'react';
import ReactDOM from 'react-dom';

const renderSymbol = Symbol.for('r2wc.reactRender');
const shouldRenderSymbol = Symbol.for('r2wc.shouldRender');
const rootSymbol = Symbol.for('r2wc.root');
const isSSR = typeof window === 'undefined';

function toDashedStyle(camelCase = '') {
  return camelCase.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function isAllCaps(word: string) {
  return word.split('').every((char: string) => char.toUpperCase() === char);
}

function flattenIfOne(arr: object) {
  if (!Array.isArray(arr)) {
    return arr;
  }
  if (arr.length === 1) {
    return arr[0];
  }

  return arr;
}

function mapChildren(node: ChildNode) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.toString();
  }

  const arr = Array.from(node.childNodes).map((el) => {
    if (el.nodeType === Node.TEXT_NODE) {
      return el.textContent.toString();
    }
    // BR = br, ReactElement = ReactElement
    const nodeName = isAllCaps(el.nodeName) ? el.nodeName.toLowerCase() : el.nodeName;
    const children = flattenIfOne(mapChildren(el));

    // we need to format el.attributes before passing it to createElement
    const attributes = {};
    for (const attr of (el as any).attributes) {
      attributes[attr.name] = attr.value;
    }

    return React.createElement(nodeName, attributes, children);
  });

  return flattenIfOne(arr);
}

let updateTimeout = null;
const moveUpdateToNextTick = (fn: () => void) => {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  updateTimeout = setTimeout(fn, 0);
};

const define = {
  // Creates a getter/setter that re-renders every time a property is set.
  expand: function (receiver: object, key: string, value: unknown) {
    Object.defineProperty(receiver, key, {
      enumerable: true,
      get: function () {
        return value;
      },
      set: function (newValue) {
        value = newValue;
        moveUpdateToNextTick(() => this[renderSymbol]());
      },
    });

    moveUpdateToNextTick(() => receiver[renderSymbol]());
  },
};

interface R2WCOptions {
  shadow?: string | boolean;
  props?: Array<string> | Record<string, unknown>;
}

/**
 * Converts a React component into a webcomponent by wrapping it in a Proxy object.
 * @param {ReactComponent}
 * @param {React}
 * @param {ReactDOM}
 * @param {Object} options - Optional parameters
 * @param {String?} options.shadow - Shadow DOM mode as either open or closed.
 * @param {Object|Array?} options.props - Array of camelCasedProps to watch as Strings or { [camelCasedProp]: String | Number | Boolean | Function | Object | Array }
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (
  ReactComponent: React.FunctionComponent<any> | React.ComponentClass<any>,
  options: R2WCOptions = {}
): CustomElementConstructor {
  if (isSSR) {
    return;
  }

  const propTypes = {}; // { [camelCasedProp]: String | Number | Boolean | Function | Object | Array }
  const propAttrMap = {}; // @TODO: add option to specify for asymmetric mapping (eg "className" from "class")
  const attrPropMap = {}; // cached inverse of propAttrMap
  if (!options.props) {
    options.props = ReactComponent.propTypes ? Object.keys(ReactComponent.propTypes) : [];
  }
  const propKeys = Array.isArray(options.props) ? options.props.slice() : Object.keys(options.props);
  const optionsPropsIsArray = Array.isArray(options.props);
  propKeys.forEach((key) => {
    propTypes[key] = optionsPropsIsArray ? String : options.props[key];
    propAttrMap[key] = toDashedStyle(key);
    attrPropMap[propAttrMap[key]] = key;
  });
  const renderAddedProperties = {
    isConnected: 'isConnected' in HTMLElement.prototype,
  };
  let rendering = false;
  // Create the web component "class"
  const WebComponent = function (...args) {
    // @ts-expect-error
    const self = Reflect.construct(HTMLElement, args, this.constructor);
    if (typeof options.shadow === 'string') {
      self.attachShadow({ mode: options.shadow });
    } else if (options.shadow) {
      console.warn(
        'Specifying the "shadow" option as a boolean is deprecated and will be removed in a future version.'
      );
      self.attachShadow({ mode: 'open' });
    }

    return self;
  };

  // Make the class extend HTMLElement
  const targetPrototype = Object.create(HTMLElement.prototype);
  targetPrototype.constructor = WebComponent;

  // But have that prototype be wrapped in a proxy.
  const proxyPrototype = new Proxy(targetPrototype, {
    has: function (target, key) {
      return key in propTypes || key in targetPrototype;
    },

    // when any undefined property is set, create a getter/setter that re-renders
    set: function (target, key, value, receiver) {
      if (rendering) {
        renderAddedProperties[key] = true;
      }

      if (typeof key === 'symbol' || renderAddedProperties[key] || key in target) {
        return Reflect.set(target, key, value, receiver);
      } else {
        define.expand(receiver, key, value);
      }

      return true;
    },
    // makes sure the property looks writable
    getOwnPropertyDescriptor: function (target, key) {
      const own = Reflect.getOwnPropertyDescriptor(target, key);
      if (own) {
        return own;
      }
      if (key in propTypes) {
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: undefined,
        };
      }
    },
  });
  WebComponent.prototype = proxyPrototype;

  // Setup lifecycle methods
  targetPrototype.connectedCallback = function () {
    /*
     * Once connected, it will keep updating the innerHTML.
     * We could add a render method to allow this as well.
     */
    this[shouldRenderSymbol] = true;
    moveUpdateToNextTick(() => this[renderSymbol]());
  };
  targetPrototype.disconnectedCallback = function () {
    // @ts-expect-error
    if (typeof ReactDOM.createRoot === 'function') {
      this[rootSymbol].unmount();
    } else {
      ReactDOM.unmountComponentAtNode(this);
    }
  };
  targetPrototype[renderSymbol] = function () {
    if (this[shouldRenderSymbol] === true) {
      const data = {};
      Object.keys(this).forEach(function (key) {
        if (renderAddedProperties[key] !== false) {
          // @ts-expect-error
          data[key] = this[key];
        }
      }, this);
      rendering = true;
      // Container is either shadow DOM or light DOM depending on `shadow` option.
      const container = options.shadow ? this.shadowRoot : this;
      const children = flattenIfOne(mapChildren(this));
      const element = React.createElement(ReactComponent, data, children);

      // Use react to render element in container
      // @ts-expect-error
      if (typeof ReactDOM.createRoot === 'function') {
        if (!this[rootSymbol]) {
          // @ts-expect-error
          this[rootSymbol] = ReactDOM.createRoot(container);
        }

        this[rootSymbol].render(element);
      } else {
        ReactDOM.render(element, container);
      }

      rendering = false;
    }
  };

  // Handle attributes changing
  WebComponent.observedAttributes = Object.keys(attrPropMap);

  targetPrototype.attributeChangedCallback = function (name: string, oldValue, newValue) {
    const propertyName = attrPropMap[name] || name;
    switch (propTypes[propertyName]) {
      case 'ref':
      case Function:
        if (!newValue && propTypes[propertyName] === 'ref') {
          newValue = React.createRef();
          break;
        }
        if (typeof window !== 'undefined') {
          newValue = window[newValue] || newValue;
        } else if (typeof global !== 'undefined') {
          newValue = global[newValue] || newValue;
        }
        if (typeof newValue === 'function') {
          newValue = newValue.bind(this); // this = instance of the WebComponent / HTMLElement
        }
        break;
      case Number:
        newValue = parseFloat(newValue);
        break;
      case Boolean:
        newValue = /^[ty1-9]/i.test(newValue);
        break;
      case Object:
      case Array:
        newValue = JSON.parse(newValue);
        break;
      case String:
      default:
        break;
    }

    this[propertyName] = newValue;
  };

  return WebComponent as any;
}
