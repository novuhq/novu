import { RedirectTargetEnum } from '@novu/shared';

export const urlTargetTypes = [
  RedirectTargetEnum.SELF,
  RedirectTargetEnum.BLANK,
  RedirectTargetEnum.PARENT,
  RedirectTargetEnum.TOP,
  RedirectTargetEnum.UNFENCED_TOP,
];

export function openInNewTab(url: string) {
  return window.open(url, '_blank', 'noreferrer noopener');
}
