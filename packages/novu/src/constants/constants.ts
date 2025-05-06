import dotenv from 'dotenv';
// see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
// CLI Server
export const SERVER_HOST = 'localhost';

// Novu Cloud
export const { NOVU_API_URL, NOVU_SECRET_KEY } = process.env;

// segment analytics
export const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== 'false';
export const SEGMENTS_WRITE_KEY = process.env.CLI_SEGMENT_WRITE_KEY || 'tz68K6ytWx6AUqDl30XAwiIoUfr7iWVW';
