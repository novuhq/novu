import pc from 'picocolors';
import { listInteractions, type InteractionStatus } from '../api/human';
import { clientFromConfig, handleError } from './interact';

export async function listCommand(options: {
  status?: string;
  limit?: string;
  json?: boolean;
  apiUrl?: string;
}): Promise<never> {
  try {
    const { client } = clientFromConfig(options.apiUrl);
    const interactions = await listInteractions(client, {
      status: options.status as InteractionStatus | undefined,
      limit: options.limit ? Number(options.limit) : undefined,
    });

    if (options.json) {
      process.stdout.write(`${JSON.stringify(interactions, null, 2)}\n`);
      process.exit(0);
    }

    if (interactions.length === 0) {
      process.stdout.write('No interactions found.\n');
      process.exit(0);
    }

    for (const interaction of interactions) {
      const status = interaction.status === 'pending' ? pc.yellow(interaction.status) : pc.dim(interaction.status);
      const from = interaction.from ? pc.dim(` [${interaction.from}]`) : '';
      const prompt = interaction.prompt.length > 60 ? `${interaction.prompt.slice(0, 59)}…` : interaction.prompt;
      process.stdout.write(`${interaction.id}  ${status.padEnd(18)} ${interaction.kind.padEnd(7)} ${prompt}${from}\n`);
    }

    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

export async function cancelCommand(id: string, options: { json?: boolean; apiUrl?: string }): Promise<never> {
  try {
    const { client } = clientFromConfig(options.apiUrl);
    const { cancelInteraction } = await import('../api/human');
    const interaction = await cancelInteraction(client, id);

    if (options.json) {
      process.stdout.write(`${JSON.stringify(interaction, null, 2)}\n`);
    } else {
      process.stdout.write(`Interaction ${interaction.id} is now ${interaction.status}.\n`);
    }

    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}
