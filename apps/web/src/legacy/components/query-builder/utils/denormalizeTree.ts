import { clone } from './clone';
/* eslint no-param-reassign: 0 */

export const denormalizeTree = (data: any) => {
  const clonedData: any = clone(data);
  const denormalizedData: any = clonedData.filter((item: any) => !item.parent);

  const run = (d: any, originalData: any) => {
    // eslint-disable-next-line array-callback-return
    d.map((item: any) => {
      if (typeof item.children !== 'undefined') {
        const tmpItem = clone(item);

        // eslint-disable-next-line no-param-reassign
        delete item.children;
        delete item.id;
        delete item.parent;
        delete item.operators;

        item.children = [];

        // eslint-disable-next-line array-callback-return
        tmpItem.children.map((id: any) => {
          const clonedChildrenData = clone(originalData.filter((oItem: any) => oItem.id === id)[0]);

          delete clonedChildrenData.id;
          delete clonedChildrenData.parent;
          delete clonedChildrenData.operators;

          item.children.push(clonedChildrenData);
        });

        run(item.children, originalData);
      }
    });
  };

  run(denormalizedData, clonedData);
  return denormalizedData;
};
