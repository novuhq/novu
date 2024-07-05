import { useEffect } from 'react';

export const useFrameworkTerminalScript = () => {
  useEffect(() => {
    if (!document.getElementById('framework-terminal-loader')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/novuhq/docs/framework-terminal.min.js';
      script.id = 'framework-terminal-loader';
      document.body.appendChild(script);
    }
  }, []);
};
