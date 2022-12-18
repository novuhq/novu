import React, { useEffect } from 'react';
import styled from '@emotion/styled';

export function WidgetShell({ children }: { children: JSX.Element }) {
  const WrapperComponent = inIframe() ? TransparentShell : MockPreviewShell;

  return <WrapperComponent>{children}</WrapperComponent>;
}

function TransparentShell({ children }: { children: JSX.Element }) {
  return <div style={{ padding: 7 }}>{children}</div>;
}

function MockPreviewShell({ children }: { children: JSX.Element }) {
  useEffect(() => {
    if (document.querySelector('body')) {
      (document.querySelector('body') as HTMLBodyElement).style.width = 'auto';
    }
  }, []);

  return <ShellWrapper>{children}</ShellWrapper>;
}

function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

const ShellWrapper = styled.div`
  background: lightgrey;
  height: 100vh;
  display: flex;
  justify-content: center;
  padding-top: 25px;

  & > div {
    width: 420px;
  }
`;
