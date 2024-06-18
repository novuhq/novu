export type CSSProperties = {
  [key: string]: string | number;
};

export type ElementStyles = string | CSSProperties;

export type Elements = {
  button?: ElementStyles;
  root?: ElementStyles;
};

export type Variables = {
  colors: {
    primary: string;
  };
};

export type AppearanceContextType = {
  variables?: Variables;
  elements?: Elements;
  descriptorToCssInJsClass: Record<string, string>;
};
