export const POPULAR_GROUPED_NAME = 'Popular';
const productionIds = ['646c77cf693b8e668a900a73', '646f123c720b54f89ed2130a'];
const developmentIds = ['64731d4e1084f5a48293ceab', '64731d4e1084f5a48293ce9f'];

export const POPULAR_TEMPLATES_ID_LIST = process.env.NODE_ENV === 'production' ? productionIds : developmentIds;
