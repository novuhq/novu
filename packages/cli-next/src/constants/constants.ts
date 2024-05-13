import * as dotenv from 'dotenv';

dotenv.config();

// segment analytics
export const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED === 'false' ? false : true;
export const SEGMENTS_WRITE_KEY = process.env.CLI_SEGMENT_WRITE_KEY || 'tz68K6ytWx6AUqDl30XAwiIoUfr7iWVW';
