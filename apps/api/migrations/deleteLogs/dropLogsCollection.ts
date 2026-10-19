import { DalService } from '@novu/dal';

(async function dropLogsCollection() {
  const dalService = new DalService();
  try {
    const connection = await dalService.connect(process.env.MONGO_URL);
    await connection.db.collection('logs').drop();
    console.log('Collection "logs" was dropped successfully.');
  } catch (error) {
    console.error('Error dropping "logs" collection:', error);
  } finally {
    await dalService.disconnect();
  }
})();
