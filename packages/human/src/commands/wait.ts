import { getInteraction } from '../api/human';
import { emitResult } from '../output';
import { clientFromConfig, handleError, type InteractOptions, waitForResolution } from './interact';

export async function waitCommand(
  id: string,
  options: Pick<InteractOptions, 'timeout' | 'json' | 'apiUrl'>
): Promise<never> {
  try {
    const { client } = clientFromConfig(options.apiUrl);
    const current = await getInteraction(client, id);

    if (current.status !== 'pending') {
      process.exit(emitResult(current, Boolean(options.json)));
    }

    process.exit(await waitForResolution(client, current, options));
  } catch (err) {
    handleError(err);
  }
}
