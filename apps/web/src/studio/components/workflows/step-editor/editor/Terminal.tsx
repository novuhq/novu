import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

import { TerminalHandle } from './useContainer';

interface TerminalComponentProps {
  onChange?: (data: string) => void;
  height?: string;
}

export const TerminalComponent = React.forwardRef<TerminalHandle, TerminalComponentProps>(
  ({ onChange, height = '100%' }, ref) => {
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

      const handleResize = () => {
        fitAddon.current.fit();
      };

      /*
       * const observer = new MutationObserver(() => {
       *   handleResize();
       * });
       */

      window.addEventListener('resize', handleResize);
      // observer.observe(terminalRef.current, { attributes: true, childList: true, subtree: true });

      return () => {
        window.removeEventListener('resize', handleResize);
        // observer.disconnect();
        terminal.dispose();
      };
    }, []);

    return (
      <div>
        <div ref={terminalRef} />
      </div>
    );
  }
);