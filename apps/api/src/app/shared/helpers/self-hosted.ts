export const COMMUNITY_EDITION_NAME = 'Community Edition';

export const getSelfHostedFindQuery = (): { _id: string } | { name: string } => {
  if (process.env.NOVU_SELF_HOSTING_ORGANIZATION_ID) {
    return {
      _id: process.env.NOVU_SELF_HOSTING_ORGANIZATION_ID,
    };
  }

  return {
    name: COMMUNITY_EDITION_NAME,
  };
};
