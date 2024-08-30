import React from 'react';
import { createRoot } from 'react-dom/client';
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import App from './App';
import { initializeApp } from './initializeApp';
import reportWebVitals from './reportWebVitals';
import { LAUNCH_DARKLY_CLIENT_SIDE_ID } from './config';

import './index.css';
import '@novu/novui/styles.css';

(async () => {
  initializeApp();

  let FeatureFlagsProvider = ({ children }) => <>{children}</>;

  if (LAUNCH_DARKLY_CLIENT_SIDE_ID) {
    FeatureFlagsProvider = await asyncWithLDProvider({
      clientSideID: LAUNCH_DARKLY_CLIENT_SIDE_ID,
      reactOptions: {
        useCamelCaseFlagKeys: false,
      },
      user: {
        kind: 'user',
        anonymous: true,
      },
      options: {
        // eslint-disable-next-line max-len
        // https://docs.launchdarkly.com/sdk/features/bootstrapping#:~:text=Alternatively%2C%20you%20can%20bootstrap%20feature%20flags%20from%20local%20storage%3A
        bootstrap: 'localStorage',
      },
    });
  }

  const container = document.getElementById('root');
  if (!container) {
    throw new Error("No element 'root' is defined in index.html!");
  }

  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <FeatureFlagsProvider>
        <App />
      </FeatureFlagsProvider>
    </React.StrictMode>
  );
})();

/*
 * If you want to start measuring performance in your app, pass a function
 * to log results (for example: reportWebVitals(console.log))
 * or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals .
 */
reportWebVitals();
