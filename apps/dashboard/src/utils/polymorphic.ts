type AsProp<T extends React.ElementType> = {
  as?: T;
};

type PropsToOmit<T extends React.ElementType, P> = keyof (AsProp<T> & P);

type PolymorphicComponentProp<T extends React.ElementType, Props = object> = React.PropsWithChildren<
  Props & AsProp<T>
> &
  Omit<React.ComponentPropsWithoutRef<T>, PropsToOmit<T, Props>>;

export type PolymorphicRef<T extends React.ElementType> = React.ComponentPropsWithRef<T>['ref'];

type PolymorphicComponentPropWithRef<T extends React.ElementType, Props = object> = PolymorphicComponentProp<
  T,
  Props
> & {
  ref?: PolymorphicRef<T>;
};

export type PolymorphicComponentPropsWithRef<T extends React.ElementType, P = object> = PolymorphicComponentPropWithRef<
  T,
  P
>;

export type PolymorphicComponentProps<T extends React.ElementType, P = object> = PolymorphicComponentProp<T, P>;
