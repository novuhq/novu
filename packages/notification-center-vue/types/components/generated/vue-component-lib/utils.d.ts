export interface InputProps<T> {
  modelValue?: T;
}
/**
 * Create a callback to define a Vue component wrapper around a Web Component.
 *
 * @prop name - The component tag name (i.e. `ion-button`)
 * @prop componentProps - An array of properties on the
 * component. These usually match up with the @Prop definitions
 * in each component's TSX file.
 * @prop customElement - An option custom element instance to pass
 * to customElements.define. Only set if `includeImportCustomElements: true` in your config.
 * @prop modelProp - The prop that v-model binds to (i.e. value)
 * @prop modelUpdateEvent - The event that is fired from your Web Component when the value changes (i.e. ionChange)
 * @prop externalModelUpdateEvent - The external event to fire from your Vue component when modelUpdateEvent fires. This is used for ensuring that v-model references have been
 * correctly updated when a user's event callback fires.
 */
export declare const defineContainer: <Props, VModelType = string | number | boolean>(
  name: string,
  defineCustomElement: any,
  componentProps?: string[],
  modelProp?: string,
  modelUpdateEvent?: string,
  externalModelUpdateEvent?: string
) => import('vue').DefineComponent<
  Props & InputProps<VModelType>,
  object,
  {},
  import('vue').ComputedOptions,
  import('vue').MethodOptions,
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {},
  string,
  import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps,
  Readonly<
    Props & InputProps<VModelType> extends infer T
      ? T extends Props & InputProps<VModelType>
        ? T extends import('vue').ComponentPropsOptions<{
            [x: string]: unknown;
          }>
          ? import('vue').ExtractPropTypes<T>
          : T
        : never
      : never
  >,
  import('vue').ExtractDefaultPropTypes<Props & InputProps<VModelType>>
>;
