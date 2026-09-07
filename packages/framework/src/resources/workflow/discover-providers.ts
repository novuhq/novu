import { ChannelStepEnum } from '../../constants';
import { providerSchemas } from '../../schemas';
import type { Awaitable, DiscoverStepOutput } from '../../types';
import { WithPassthrough } from '../../types/provider.types';
import { transformSchema } from '../../validators';

export async function discoverProviders(
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
): Promise<void> {
  const channelSchemas = providerSchemas[channelType];

  const providerPromises = Object.entries(providers).map(async ([type, resolve]) => {
    // TODO: fix the typing for `type` to use the keyof providerSchema[channelType]
    // @ts-expect-error - Element implicitly has an 'any' type because expression of type 'string' can't be used to index type
    const schemas = channelSchemas[type];

    return {
      type,
      code: resolve.toString(),
      resolve,
      outputs: {
        schema: await transformSchema(schemas.output),
        unknownSchema: schemas.output,
      },
    };
  });

  step.providers.push(...(await Promise.all(providerPromises)));
}
