import { useEffect } from 'react';

export const useEchoTerminalScript = () => {
  useEffect(() => {
    if (!document.getElementById('echo-terminal-loader')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/novuhq/docs/echo-terminal.min.js';
      script.id = 'echo-terminal-loader';
      document.body.appendChild(script);
    }
  }, []);
};
