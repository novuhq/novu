import { Component, Prop, State, Watch, h } from '@stencil/core';
import { QueryObserverOptions, QueryObserver, QueryObserverResult } from '@tanstack/query-core';

import { QueryHelper } from '../../utils/queryHelper';

@Component({
  tag: 'stencil-query',
})
export class StencilQuery {
  @Prop() listen?: (result: QueryObserverResult) => void;
  @Prop() renderChildren?: (result: QueryObserverResult) => Element | Element[];
  @Prop() options?: QueryObserverOptions;
  @State() result?: QueryObserverResult;

  private queryObserver: QueryObserver;
  private unsubscribe: () => void;

  connectedCallback() {
    const { result, unsubscribe, queryObserver } = QueryHelper.subscribe({
      options: this.options,
      listener: this.listenQueryResult,
    });

    this.unsubscribe = unsubscribe;
    this.queryObserver = queryObserver;
    this.useResult(result);
  }

  disconnectedCallback() {
    this.unsubscribe?.();
  }

  @Watch('options')
  watchOptionsChange(options: QueryObserverOptions) {
    this.queryObserver.setOptions(options);
  }

  private listenQueryResult = (result: QueryObserverResult): void => {
    this.useResult(result);
  };

  private useResult(result: QueryObserverResult) {
    if (this.listen) {
      // this callback is called during the render flow, the listener might also
      // update the state so we won't to re-render
      setTimeout(() => {
        this.listen(result);
      }, 0);
    } else {
      this.result = result;
    }
  }

  render() {
    return this.renderChildren ? this.renderChildren(this.result) : <slot />;
  }
}
