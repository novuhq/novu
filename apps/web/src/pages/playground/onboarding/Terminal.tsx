import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

import { IconMenuBook, IconTerminal } from '@novu/novui/icons';
import { css } from '@novu/novui/css';
import { Button } from '@novu/novui';

import { hstack } from '@novu/novui/patterns';
import { TerminalHandle } from '../../../hooks/useContainer';

interface TerminalComponentProps {
  onChange?: (data: string) => void;
  height?: string;
  onStepAddGuide?: () => void;
}

export const TerminalComponent = React.forwardRef<TerminalHandle, TerminalComponentProps>(({ onStepAddGuide }, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef(new FitAddon());

  useImperativeHandle(
    ref,
    () => ({
      write: (data: string) => {
        terminalInstance.current?.write(data.replace(/\n/g, '\r\n'));
      },
      fit: () => fitAddon.current.fit(),
      proposeDimensions: () => fitAddon.current.proposeDimensions(),
    }),
    []
  );

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal();
    terminal.loadAddon(fitAddon.current);
    terminal.open(terminalRef.current);

    fitAddon.current.activate(terminal);
    fitAddon.current.fit();
    terminalInstance.current = terminal;

    setTimeout(() => {
      fitAddon.current.fit();
    }, 500);

    const handleResize = () => {
      fitAddon.current.fit();
    };

    window.addEventListener('nv-terminal-layout-resize', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('nv-terminal-layout-resize', handleResize);
      terminal.dispose();
    };
  }, []);

  return (
    // Necessary to use `style` prop for dynamic, client-side height.
    <>
      <div
        className={hstack({
          color: 'typography.text.secondary',
          bg: '#23232b', // TODO: replace with semantic value
          lineHeight: '125',
          fontSize: '88',
          p: '25',
          width: 'full',
          justifyContent: 'space-between',
          position: 'sticky',
        })}
      >
        <span className={hstack()}>
          <IconTerminal className={css({ mx: '25' })} />
          Terminal
        </span>

        <Button size="xs" Icon={IconMenuBook} onClick={onStepAddGuide}>
          How to add a Step?
        </Button>
      </div>
      <div
        className={css({
          // Reduce the height by the header height.
          height: `calc(100% - 32px)`,
          // Applying padding to the terminal content.
          '& .xterm-screen': { padding: '75' },
          // !important is necessary to override xterm.js styles.
          '& .xterm-rows': { fontFamily: 'mono !important' },
          '& .xterm .xterm-viewport': { bg: 'transparent !important' },
        })}
        ref={terminalRef}
      />
    </>
  );
});
