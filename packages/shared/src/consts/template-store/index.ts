/*
 * 646c77cf693b8e668a900a73 : Password Reset
 * 646f123c720b54f89ed2130a : Mention in a comment
 * 646c7aee958d8bed2e00b8e9 : Account Activation
 */
const popularProductionIds = ['646c77cf693b8e668a900a73', '646f123c720b54f89ed2130a', '646c7aee958d8bed2e00b8e9'];

/*
 * 64731d4e1084f5a48293ce9f : Password Reset
 * 64731d4e1084f5a48293ceab : Mention in a comment
 */
const popularDevelopmentIds = ['64731d4e1084f5a48293ce9f', '64731d4e1084f5a48293ceab'];

/*
 * 65c25bd6f4de5ad335bb8e48 : Delay
 * 65c25bd5f4de5ad335bb8dc0 : Digest
 * 65c25bd1f4de5ad335bb8c91 : In-App
 * 65c25bd3f4de5ad335bb8d2a : Multi-channel
 */
const getStartedDevelopmentIds = [
  '65c25bd6f4de5ad335bb8e48',
  '65c25bd5f4de5ad335bb8dc0',
  '65c25bd1f4de5ad335bb8c91',
  '65c25bd3f4de5ad335bb8d2a',
];

export function getPopularTemplateIds({ production }: { production: boolean }) {
  return production ? popularProductionIds : popularDevelopmentIds;
}

export function getGetStartedTemplateIds({ production }: { production: boolean }) {
  return production ? [] : getStartedDevelopmentIds;
}
