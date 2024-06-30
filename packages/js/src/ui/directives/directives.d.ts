import clickOutside from './click-outside';

declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      clickOutside: typeof clickOutside;
    }
  }
}
