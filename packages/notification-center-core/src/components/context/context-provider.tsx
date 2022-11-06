import { Component, Event, EventEmitter, h, Listen, Prop, State, Watch } from '@stencil/core';

interface ConsumerEvent extends Event {
  detail: {
    setContext: Function;
    contextName: string;
  };
}

@Component({
  tag: 'stencil-provider',
})
export class StencilProvider {
  @Prop() contextName: string;
  @Prop() STENCIL_CONTEXT: { [key: string]: any };
  @State() consumers: Function[] = [];

  @Watch('STENCIL_CONTEXT')
  watchContext(newContext) {
    this.consumers.forEach((consumer) => consumer(newContext));
  }
  @Event({ eventName: 'mountConsumer' }) mountEmitter: EventEmitter;

  @Listen('mountConsumer')
  async mountConsumer(event: ConsumerEvent) {
    const { setContext, contextName } = event.detail;
    if (contextName !== this.contextName) {
      return;
    }

    event.stopPropagation();
    this.consumers = this.consumers.slice().concat([setContext]);
    await setContext(this.STENCIL_CONTEXT);
    const index = this.consumers.indexOf(setContext);
    const newConsumers = this.consumers.slice(0, index).concat(this.consumers.slice(index + 1, this.consumers.length));
    this.consumers = newConsumers;
  }

  disconnectedCallback() {
    this.consumers.map((consumer) => this.mountEmitter.emit(consumer));
  }

  render() {
    return <slot />;
  }
}
