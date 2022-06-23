---
    to: providers/<%= name %>/src/lib/<%= name %>.provider.ts
---

<% PascalType = h.changeCase.pascal(type) -%>
<% UpperType = h.changeCase.upper(type) -%>
<% PascalName = h.changeCase.pascal(name) -%>
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  I<%= PascalType %>Options,
  I<%= PascalType %>Provider,
} from '@novu/stateless';
import { <%= PascalName %>Config } from './<%= name %>.config';

export class <%= PascalName %><%= PascalType %>Provider implements I<%= PascalType %>Provider {
  channelType = ChannelTypeEnum.<%= UpperType %> as ChannelTypeEnum.<%= UpperType %>;

  constructor(
    private config: <%= PascalName %>Config
  ) {
  }

  async sendMessage(
    options: I<%= PascalType %>Options
  ): Promise<ISendMessageSuccessResponse> {


    return {
      id: 'PLACEHOLDER',
      date: 'PLACEHOLDER'
    };
  }
}
