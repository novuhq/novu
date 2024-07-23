import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export const TerminalComponent = React.forwardRef((_, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  // const fitAddon = useRef(new FitAddon());

  useImperativeHandle(
    ref,
    () => ({
      write: (data: string) => {
        terminalInstance.current?.write(data.replace(/\n/g, '\r\n'));
      },
    }),
    []
  );

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal();
    // terminal.loadAddon(fitAddon.current);
    terminal.open(terminalRef.current);
    // fitAddon.current.fit();
    terminalInstance.current = terminal;

    const handleResize = () => {
      // fitAddon.current.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, []);

  return <div ref={terminalRef} style={{ height: '500px' }} />;
});
