// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************
// load the global Cypress types
/// <reference types="cypress" />

import 'cypress-localstorage-commands';

// Import commands.js using ES2015 syntax:
import './commands';

import 'cypress-network-idle';
// Alternatively you can use CommonJS syntax:
// require('./commands')

const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/;
Cypress.on('uncaught:exception', (err) => {
  /* returning false here prevents Cypress from failing the test */
  if (resizeObserverLoopErrRe.test(err.message)) {
    return false;
  }
});

/**
 * Cypress has known issues with testing clipboard (i.e. copy) functionality, so this attempts to circumvent that.
 * Ref: https://github.com/cypress-io/cypress/issues/2752#issuecomment-1039285381
 */
Cypress.on('window:before:load', (win) => {
  let copyText;

  if (!win.navigator.clipboard) {
    // @ts-ignore
    win.navigator.clipboard = {
      __proto__: {},
    };
  }

  // @ts-ignore
  win.navigator.clipboard.__proto__.writeText = (text) => (copyText = text);
  // @ts-ignore
  win.navigator.clipboard.__proto__.readText = () => copyText;
});
