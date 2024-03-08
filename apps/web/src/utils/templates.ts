import { IconName } from '@fortawesome/fontawesome-svg-core';

export const getWorkflowBlueprintDetails = (templateName: string): { name: string; iconName: IconName } => {
  const regexResult = /^:.{1,}:/.exec(templateName);
  let name = '';
  let iconName = 'fa-solid fa-question';
  if (regexResult !== null) {
    name = templateName.replace(regexResult[0], '').trim();
    iconName = regexResult[0].replace(/:/g, '').trim();
  }

  return { name, iconName: iconName as IconName };
};
