import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export const TerminalComponent = React.forwardRef((_, ref) => {
  const terminalRef = useRef(null);
  const terminalInstance = useRef<Terminal | null>(null);

  useImperativeHandle(ref, () => ({
    write: (data: string) => {
      if (terminalInstance.current) {
        terminalInstance.current.write(data.replace(/\n/g, '\r\n'));
      }
    },
  }));

  useEffect(() => {
    const terminal = new Terminal();
    // const fitAddon = new FitAddon();
    // terminal.loadAddon(fitAddon);

    if (!terminalRef.current) {
      return;
    }

    terminal.open(terminalRef.current);
    // fitAddon.fit();
    terminalInstance.current = terminal;

    const handleResize = () => {
      if (terminalRef.current) {
        // fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, []);

  return <div ref={terminalRef} style={{ height: '500px' }} />;
});
