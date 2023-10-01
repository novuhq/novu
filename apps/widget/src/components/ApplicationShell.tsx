import React, { useEffect } from 'react';
import styled from '@emotion/styled';

export function WidgetShell({ children }: { children: JSX.Element }) {
  const WrapperComponent = inIframe() ? TransparentShell : MockPreviewShell;

  return <WrapperComponent>{children}</WrapperComponent>;
}

function TransparentShell({ children }: { children: JSX.Element }) {
  return <div className="transparent-shell">{children}</div>;
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

// Additional CSS for reset and modular styling
const GlobalStyles = styled.div`
  body {
    margin: 0;
    padding: 0;
    font-family: 'Arial', sans-serif;
  }

  .transparent-shell {
    padding: 7px;
  }
`;
