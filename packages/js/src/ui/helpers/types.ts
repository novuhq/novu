export type Path<T, K extends string = ''> = T extends string
  ? K
  : {
      [P in keyof T]-?: Path<T[P], `${K}${K extends '' ? '' : '.'}${P & string}`>;
    }[keyof T];
