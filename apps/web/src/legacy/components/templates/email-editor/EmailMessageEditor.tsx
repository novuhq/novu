import { Card, Form, Input, Button, Popconfirm, Radio } from 'antd';

import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { IEmailBlock } from '@notifire/shared';
import { useNavigate } from 'react-router-dom';
import { ButtonRowContent } from './ButtonRowContent';
import { ContentRow } from './ContentRow';
import { ControlBar } from './ControlBar';

export function EmailMessageEditor({
  onChange,
  value,
  branding,
}: {
  onChange?: (blocks: IEmailBlock[]) => void;
  value?: IEmailBlock[];
  branding: { color: string; logo: string } | undefined;
}) {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<IEmailBlock[]>(
    value?.length
      ? value
      : [
          {
            type: 'text',
            content: 'Content',
          },
        ]
  );
  const [top, setTop] = useState<number>(0);
  const [controlBarVisible, setActionBarVisible] = useState<boolean>(false);

  useEffect(() => {
    if (onChange) {
      onChange(blocks);
    }
  }, [blocks]);

  function onBlockStyleChanged(blockIndex: number, styles: { textDirection: 'rtl' | 'ltr' }) {
    blocks[blockIndex].styles = {
      ...styles,
    };

    setBlocks([...blocks]);
  }

  function onHoverElement(e) {
    setTop(e.top + e.height);
  }

  function onEnterPress(e) {
    const ENTER_CODE = 13;
    const BACKSPACE_CODE = 8;

    if (e.keyCode === ENTER_CODE || e.keyCode === BACKSPACE_CODE) {
      /*
       * TODO: Currently disabled, because causes to not create new line on first time
       * setActionBarVisible(false);
       */
    }
  }

  function navigateToBrandSettings() {
    navigate('/settings/widget');
  }

  function onBlockAdd(type: 'button' | 'text') {
    const modifiedBlocks = [...blocks];

    if (type === 'button') {
      modifiedBlocks.push({
        type: 'button',
        content: 'Button text',
      });
    }

    if (type === 'text') {
      modifiedBlocks.push({
        type: 'text',
        content: '',
      });
    }

    setBlocks(modifiedBlocks);
  }

  function removeBlock(index: number) {
    const modified = [...blocks];

    modified.splice(index, 1);
    setBlocks(modified);
  }

  function onTextChange(block, e) {
    // eslint-disable-next-line no-param-reassign
    block.content = e.target.innerHTML;
  }

  if (!Array.isArray(blocks)) {
    return null;
  }

  return (
    <>
      <SectionWrapper data-test-id="email-editor">
        <LogoWrapper>
          {branding?.logo ? (
            <img data-test-id="brand-logo" src={branding?.logo} alt="" />
          ) : (
            <LogoUploaderWrapper>
              <Popconfirm
                title={
                  <>
                    This action will navigate to the settings page, <br /> any unsaved changes will be deleted. <br />{' '}
                    <br />
                    Proceed anyway?
                  </>
                }
                onConfirm={navigateToBrandSettings}
                okText="Yes"
                cancelText="No">
                <Button type="link" data-test-id="logo-upload-button">
                  Upload a brand Logo
                </Button>
              </Popconfirm>
            </LogoUploaderWrapper>
          )}
        </LogoWrapper>
        <Wrapper onMouseEnter={() => setActionBarVisible(true)} onMouseLeave={() => setActionBarVisible(false)}>
          <div style={{ position: 'relative' }}>
            <Body onKeyUp={onEnterPress}>
              {blocks.map((block, index) => {
                return (
                  <ContentRow
                    onStyleChanged={(data) => onBlockStyleChanged(index, data)}
                    key={index}
                    block={block}
                    onHoverElement={onHoverElement}
                    onRemove={() => removeBlock(index)}
                    allowRemove={blocks?.length > 1}>
                    {[block.type].map((type, blockIndex) => {
                      if (type === 'text') {
                        return (
                          <div
                            key={blockIndex}
                            data-test-id="editable-text-content"
                            dangerouslySetInnerHTML={{
                              __html: block.content,
                            }}
                            contentEditable
                            suppressContentEditableWarning
                            onKeyUp={(e) => onTextChange(block, e)}
                            style={{
                              display: 'inline-block',
                              width: '100%',
                              direction: block.styles?.textDirection || 'ltr',
                            }}
                          />
                        );
                      }

                      if (type === 'button') {
                        return (
                          <ButtonRowContent
                            key={blockIndex}
                            block={block}
                            onUrlChange={(url) => {
                              // eslint-disable-next-line no-param-reassign
                              block.url = url;
                            }}
                            onTextChange={(text) => {
                              // eslint-disable-next-line no-param-reassign
                              block.content = text;
                            }}
                          />
                        );
                      }

                      return <></>;
                    })}
                  </ContentRow>
                );
              })}
            </Body>
            {controlBarVisible && <ControlBar top={top} onBlockAdd={onBlockAdd} />}
          </div>
        </Wrapper>
      </SectionWrapper>
    </>
  );
}

const Body = styled.div`
  outline: transparent;
  z-index: 2;
  background: transparent;
  position: relative;
  display: inline-block;
  width: 100%;
  * {
    outline: none;
  }
`;

const Wrapper = styled.div`
  width: 590px;
  background: white;
  border: 1px solid #e0e0e0;
  border-top: 5px solid #ff6f61;
  padding: 30px;
  position: relative;
`;

const SectionWrapper = styled.div`
  background-color: #f9f9f9;
  display: flex;
  padding: 30px;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  align-items: center;
`;

const LogoWrapper = styled.div`
  margin-bottom: 20px;

  img {
    max-width: 240px;
  }
`;

const LogoUploaderWrapper = styled.div`
  border: 1px dashed #cdcdcd;
  padding: 15px 25px;
  display: flex;
  align-items: center;
  justify-content: center;

  flex-direction: column;
`;
