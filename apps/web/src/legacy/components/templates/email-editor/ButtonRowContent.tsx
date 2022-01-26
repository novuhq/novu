import { Button, Dropdown, Input } from 'antd';
import { AlignLeftOutlined, LinkOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { IEmailBlock } from '@notifire/shared';
import { ContentRow } from './ContentRow';

export function ButtonRowContent({
  block,
  onTextChange,
  onUrlChange,
}: {
  block: IEmailBlock;
  onTextChange: (text: string) => void;
  onUrlChange: (url: string) => void;
}) {
  const [url, setUrl] = useState<string>();
  const [text, setText] = useState<string>();
  const [dropDownVisible, setDropDownVisible] = useState<boolean>(false);
  const onButtonContentDropdownVisibility = (visibility) => {
    setDropDownVisible(visibility);
  };

  function handleTextChange(e) {
    setText(e.target.value);
    onTextChange(e.target.value);
  }

  function handleUrlChange(e) {
    setUrl(e.target.value);
    onUrlChange(e.target.value);
  }

  useEffect(() => {
    setText(block.content);
  }, [block.content]);

  useEffect(() => {
    setUrl(block.url);
  }, [block.url]);

  const buttonOptionsMenu = (
    <ButtonOptionsMenu>
      <Input
        data-test-id="button-text-input"
        onChange={handleTextChange}
        value={text}
        size="small"
        placeholder="Button Text"
        prefix={<AlignLeftOutlined />}
        style={{ marginBottom: 10 }}
      />
      <Input onChange={handleUrlChange} value={url} size="small" placeholder="Button Link" prefix={<LinkOutlined />} />
    </ButtonOptionsMenu>
  );

  return (
    <div
      style={{ textAlign: 'center', direction: block?.styles?.textDirection || 'ltr' }}
      data-test-id="button-block-wrapper">
      <Dropdown
        visible={dropDownVisible}
        overlay={buttonOptionsMenu}
        arrow
        trigger={['click']}
        onVisibleChange={onButtonContentDropdownVisibility}>
        <Button type="primary">{block.content}</Button>
      </Dropdown>
    </div>
  );
}

const ButtonOptionsMenu = styled.div`
  padding: 5px;
  background: white;
  box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
`;
