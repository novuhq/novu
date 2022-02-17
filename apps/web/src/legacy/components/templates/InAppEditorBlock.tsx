import styled, { css } from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import { InAppWidgetPreview } from '../widget/InAppWidgetPreview';

export function InAppEditorBlock({
  contentPlaceholder,
  onChange,
  value,
}: {
  contentPlaceholder: string;
  value: string;
  onChange: (data: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visiblePlaceholder, setVisiblePlaceholder] = useState(!!value);
  const [content, setContent] = useState<string>(value);

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  useEffect(() => {
    let showPlaceHolder = !value;

    if (value === '<br>') showPlaceHolder = true;

    setVisiblePlaceholder(showPlaceHolder);
  }, [value, content]);

  useEffect(() => {
    if (value !== ref.current?.innerHTML) {
      setContent(value);
    }
  }, [value]);

  function onContentChange(data) {
    onChange(data);

    let showPlaceHolder = !data;

    if (data === '<br>') showPlaceHolder = true;

    setVisiblePlaceholder(showPlaceHolder);
  }

  return (
    <InAppWidgetPreview>
      <ContentWrapper hasContent={visiblePlaceholder}>
        <div
          ref={ref}
          data-test-id="in-app-editor-content-input"
          contentEditable
          dangerouslySetInnerHTML={{
            __html: content,
          }}
          onKeyUp={(e: any) => onContentChange(e.target.innerHTML)}
          suppressContentEditableWarning
          style={{
            display: 'inline-block',
            width: '100%',
          }}
        />

        <PlaceHolder show={visiblePlaceholder}>{contentPlaceholder}</PlaceHolder>
      </ContentWrapper>
    </InAppWidgetPreview>
  );
}

const PlaceHolder = styled.div<{ show: boolean }>`
  position: absolute;
  opacity: 0.3;
  top: 14px;
  z-index: 1;
  pointer-events: visible;
  display: ${({ show }) => (show ? 'block' : 'none')};
  pointer-events: none;
`;

const ContentWrapper = styled.div<{ hasContent: boolean }>`
  border-radius: 2px;
  > div {
    padding: 5px 15px;
    padding-left: 0;
    &:active,
    &:focus {
      outline: none;
    }
  }
`;
