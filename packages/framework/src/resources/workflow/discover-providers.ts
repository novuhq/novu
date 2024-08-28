import { ChannelStepEnum } from '../../constants';
import { providerSchemas } from '../../schemas';
import type { Awaitable, DiscoverStepOutput } from '../../types';
import { WithPassthrough } from '../../types/provider.types';
import { transformSchema } from '../../validators';

export function discoverProviders(
  step: DiscoverStepOutput,
  channelType: ChannelStepEnum,
  providers: Record<
    string,
    ({
      controls,
      outputs,
    }: {
      controls: Record<string, unknown>;
      outputs: Record<string, unknown>;
    }) => Awaitable<WithPassthrough<Record<string, unknown>>>
  >
): void {
  const channelSchemas = providerSchemas[channelType];

  Object.entries(providers).forEach(([type, resolve]) => {
    // eslint-disable-next-line multiline-comment-style
    // TODO: fix the typing for `type` to use the keyof providerSchema[channelType]
    // @ts-expect-error - Element implicitly has an 'any' type because expression of type 'string' can't be used to index type
    const schemas = channelSchemas[type];
    step.providers.push({
      type,
      code: resolve.toString(),
      resolve,
      outputs: {
        schema: transformSchema(schemas.output),
        unknownSchema: schemas.output,
      },
    });
  });
}
