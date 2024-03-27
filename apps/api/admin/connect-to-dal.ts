import { DalService } from '@novu/dal';

const dalService = new DalService();

export async function connect(databaseQuery: () => Promise<void>) {
  try {
    await dalService.connect(process.env.MONGO_URL);
    await databaseQuery();
  } catch (e) {
    console.error(e);
  } finally {
    if (dalService.isConnected()) {
      await dalService.disconnect();
    }
    process.exit(0);
  }
}
