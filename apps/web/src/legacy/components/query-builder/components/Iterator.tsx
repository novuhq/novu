import React from 'react';
import { Component, ComponentProps } from './Component';
import { Group, GroupProps } from './Group';
/* eslint react/prop-types: 0 */

export interface IteratorProps {
  originalData: any;
  filteredData: any;
  isRoot?: boolean;
}

export const Iterator: React.FC<IteratorProps> = ({ originalData, filteredData, isRoot = true }) => {
  return (
    <>
      {filteredData.map((item: any) => {
        if (typeof item.children !== 'undefined') {
          const items: any = [];

          item.children.forEach((id: any) => {
            items.push(originalData.filter((fitem: any) => id === fitem.id)[0]);
          });

          if (item.type === 'GROUP') {
            const { id, value, isNegated } = item as GroupProps;

            return (
              <Group key={id} value={value} isNegated={isNegated} id={id} isRoot={isRoot}>
                <Iterator originalData={originalData} filteredData={items} isRoot={false} />
              </Group>
            );
          }

          return null;
        }
        const { field, value, id, operator } = item as ComponentProps;

        return (
          <Component
            key={id}
            field={field}
            value={value}
            operator={operator}
            id={id}
            data-test-id="IteratorComponent"
          />
        );
      })}
    </>
  );
};
