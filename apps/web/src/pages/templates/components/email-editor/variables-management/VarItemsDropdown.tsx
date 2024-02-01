import { useState } from 'react';
import { Collapse, UnstyledButton, Center, Highlight } from '@mantine/core';
import { ChevronUp, ChevronDown, colors, Folder } from '@novu/design-system';
import { VarItem } from './VarItem';
import { VarItemTooltip } from './VarItemTooltip';

export const VarItemsDropdown = ({ name, type, highlight, withFolders = false, path = '' }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <UnstyledButton
        data-test-id={`var-items-${name}`}
        onClick={() => {
          setOpen(!open);
        }}
        type="button"
        sx={{
          width: '100%',
        }}
      >
        {withFolders ? (
          <div
            style={{
              color: colors.B60,
              marginBottom: 10,
              padding: 8,
              width: '100%',
            }}
          >
            <Center inline>
              <Folder style={{ marginRight: '8px' }} />
              <Highlight span inline highlight={highlight}>
                {name}
              </Highlight>
            </Center>
            <span
              style={{
                float: 'right',
              }}
            >
              {open ? <ChevronUp /> : <ChevronDown />}
            </span>
          </div>
        ) : (
          <VarItem highlight={highlight} name={name} type="object">
            <span
              style={{
                float: 'right',
              }}
            >
              {open ? <ChevronUp /> : <ChevronDown />}
            </span>
          </VarItem>
        )}
      </UnstyledButton>
      <Collapse in={open}>
        <div
          style={{
            marginBottom: 10,
            paddingLeft: 8,
          }}
        >
          {Object.keys(type).map((key, index) => {
            let varType = type?.[key];

            if (varType !== null && !['boolean', 'string', 'number', 'object', 'array'].includes(varType)) {
              varType = typeof varType;
            }
            if (varType === 'object') {
              return (
                <VarItemsDropdown
                  path={`${name}.${key}`}
                  highlight={highlight}
                  key={index}
                  name={key}
                  type={type?.[key]}
                />
              );
            }

            return (
              <VarItemTooltip
                highlight={highlight}
                pathToCopy={`${path}.${key}`}
                name={key}
                type={varType}
                key={index}
              />
            );
          })}
        </div>
      </Collapse>
    </>
  );
};
