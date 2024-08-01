import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from 'xterm-addon-fit';
import { IconMenuBook, IconTerminal } from '@novu/novui/icons';
import 'xterm/css/xterm.css';

import { TerminalHandle } from './useContainer';
import { css } from '@novu/novui/css';
import { Button } from '@novu/novui';

interface TerminalComponentProps {
  onChange?: (data: string) => void;
  height?: string;
  onStepAddGuide?: () => void;
}

export const TerminalComponent = React.forwardRef<TerminalHandle, TerminalComponentProps>(
  ({ onChange, height = '100%', onStepAddGuide }, ref) => {
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
      <div className={css({ height: '100%' })}>
        <div
          className={css({
            color: 'typography.text.secondary',
            bg: '#292933',
            lineHeight: '20px',
            fontSize: '14px',
            p: '4',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          })}
        >
          <span className={css({ display: 'flex', alignItems: 'center' })}>
            <IconTerminal className={css({ mr: '4' })} />
            Terminal
          </span>

          <Button size="xs" Icon={IconMenuBook} onClick={onStepAddGuide}>
            How to add a Step?
          </Button>
        </div>
        <div style={{ height: '100%' }} ref={terminalRef} />
      </div>
    );
  }
);
