import { clone } from './clone';
/* eslint no-param-reassign: 0 */

export const normalizeTree = (data: any[]) => {
  const clonedData: any = { children: clone(data) };
  const normalizedData: any = [];

  const run = (d: any, parentId = 0) => {
    if (typeof d.children !== 'undefined') {
      const children: any = [];

      // eslint-disable-next-line array-callback-return
      d.children.map((item: any) => {
        if (parentId !== 0) {
          item.parent = parentId;
        }

        const tmpItem = clone(item);
        delete tmpItem.children;

        normalizedData.push(tmpItem);
        children.push(tmpItem.id);

        run(item, item.id);
      });

      if (parentId !== 0) {
        for (const item of normalizedData) {
          if (item.id === parentId) {
            item.children = children;
          }
        }
      }
    }
  };

  run(clonedData);
  return normalizedData;
};
