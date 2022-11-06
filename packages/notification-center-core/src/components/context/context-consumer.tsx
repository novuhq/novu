import { Component, Event, EventEmitter, Prop, State } from '@stencil/core';

@Component({
  tag: 'stencil-consumer',
})
export class StencilConsumer {
  @Prop() renderer: any;
  @Prop() contextName: string;
  @State() context: any;
  @Event({ eventName: 'mountConsumer' }) mountEmitter: EventEmitter;
  @State() promise: Promise<any>;
  @State() resolvePromise: any;

  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  setContext = async (context: any) => {
    this.context = context;

    return this.promise;
  };

  componentWillLoad() {
    this.mountEmitter.emit({ setContext: this.setContext, contextName: this.contextName });
  }

  disconnectedCallback() {
    this.resolvePromise();
  }

  render() {
    if (!this.context) {
      return null;
    }

    return this.renderer(this.context);
  }
}
