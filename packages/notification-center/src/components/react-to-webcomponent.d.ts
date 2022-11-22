// fix the types
declare module 'react-to-webcomponent' {
  export default function (
    reactComponent: (props?: any) => JSX.Element,
    react: typeof React,
    reactDOM: typeof ReactDOM,
    options?: {
      shadow?: string | boolean;
      props?: Array<string> | Record<string, unknown>;
    }
  ): CustomElementConstructor;
}
