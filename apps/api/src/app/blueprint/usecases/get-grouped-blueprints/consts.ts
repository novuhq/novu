export const POPULAR_GROUPED_NAME = 'Popular';
const productionIds = ['646c77cf693b8e668a900a73', '646f123c720b54f89ed2130a'];
const developmentIds = ['646c77cf693b8e668a900a73', '646f123c720b54f89ed2130a'];

export const POPULAR_TEMPLATES_GROUPED = process.env.NODE_ENV === 'production' ? productionIds : developmentIds;
