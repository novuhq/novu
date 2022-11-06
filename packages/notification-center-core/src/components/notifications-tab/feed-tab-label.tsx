import { Component, Prop, State, h } from '@stencil/core';
import { cx, css } from '@emotion/css';
import { QueryObserverResult, QueryObserverOptions } from '@tanstack/query-core';
import io from 'socket.io-client';
import { ApiService } from '@novu/client';

import { IStoreQuery, ITab } from '../../types';
import { UnseenBadge } from '../atoms/unseen-badge';

const labelWrapper = css`
  display: flex;
  gap: 10px;
  color: white;
  margin-bottom: 13px;
  min-height: 22px;
  line-height: 19px;
`;
const labelWrapperInactive = css`
  color: #828299;

  &:hover {
    color: white;
  }
`;

const unseenBadge = css`
  width: 25px;
  height: 20px;
`;

const unseenBadgeInactive = css`
  background: transparent;
  color: #828299;
  border: 1px solid #828299;
`;

@Component({
  tag: 'feed-tab-label',
})
export class FeedTabLabel {
  @Prop() api: ApiService;
  @Prop() tab: ITab;
  @Prop() isActive: boolean;
  @Prop() token?: string;
  @Prop() socketUrl?: string;
  @Prop() query: IStoreQuery;
  @State() unseenCount = 0;

  private socket;
  private unseenCountQueryOptions: QueryObserverOptions<{ count: number }, any> = null;

  constructor() {
    this.unseenCountQueryOptions = {
      enabled: true,
      queryKey: ['notifications-unseen-count', this.tab.storeId],
      refetchOnWindowFocus: false,
      queryFn: async () => await this.api.getUnseenCount(this.query),
    };
  }

  connectedCallback() {
    if (this.token && !this.socket) {
      this.socket = io(this.socketUrl, {
        reconnectionDelayMax: 10000,
        transports: ['websocket'],
        query: {
          token: `${this.token}`,
        },
      });

      this.socket.on('connect_error', function handleSocketConnectError(e) {
        // eslint-disable-next-line no-console
        console.error(e);
      });

      this.socket.on('unseen_count_changed', (onData: { unseenCount: number }) => {
        if (!isNaN(onData?.unseenCount)) {
          this.unseenCount = onData.unseenCount;
        }
      });
    }
  }

  disconnectedCallback() {
    this.socket.off('unseen_count_changed');
  }

  private listenUnseenCountChange = (result: QueryObserverResult<{ count: number }, any>) => {
    if (!result.isLoading) {
      this.unseenCount = result.data?.count;
    }
  };

  render() {
    return (
      <stencil-query options={this.unseenCountQueryOptions} listen={this.listenUnseenCountChange}>
        <div class={cx(labelWrapper, this.isActive ? undefined : labelWrapperInactive)}>
          {this.tab.name}
          <UnseenBadge clazz={cx(unseenBadge, this.isActive ? undefined : unseenBadgeInactive)}>
            {this.unseenCount}
          </UnseenBadge>
        </div>
      </stencil-query>
    );
  }
}
