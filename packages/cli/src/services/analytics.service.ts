const ANALYTICS = require('analytics-node');

import { SEGMENTS_WRITE_KEY } from '../constants';

export const analytics = new ANALYTICS(SEGMENTS_WRITE_KEY);
