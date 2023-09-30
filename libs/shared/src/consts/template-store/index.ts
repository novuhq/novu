/*
 * 646c77cf693b8e668a900a73 : Password Reset
 * 646f123c720b54f89ed2130a : Mention in a comment
 * 646c7aee958d8bed2e00b8e9 : Account Activation
 */
const productionIds = ['646c77cf693b8e668a900a73', '646f123c720b54f89ed2130a', '646c7aee958d8bed2e00b8e9'];

/*
 * 64731d4e1084f5a48293ce9f : Password Reset
 * 64731d4e1084f5a48293ceab : Mention in a comment
 */
const developmentIds = ['64731d4e1084f5a48293ce9f', '64731d4e1084f5a48293ceab'];

export function getPopularTemplateIds({ production }: { production: boolean }) {
  return production ? productionIds : developmentIds;
}
