import uniqid from 'uniqid';
import { clone } from './clone';
/* eslint react/prop-types: 0 */
/* eslint no-param-reassign: 0 */

export const assignIds = (data: any): any => {
  data = { children: clone(data) };

  const run = (d: any): any => {
    if (typeof d.children !== 'undefined') {
      d.children = d.children.map((item: any) => {
        item.id = uniqid();
        return run(item);
      });
    }

    return d;
  };

  return run(data).children;
};
