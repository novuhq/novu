import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
// import IntegrationsListPage from 'remote_app/IntegrationsListPage';
const Providers = React.lazy(() => import('remote_app/Providers'));
const IntegrationsListPage = React.lazy(() => import('remote_app/IntegrationsListPage'));

function App() {
  const [count, setCount] = useState(0);

  return (
    <BrowserRouter>
      <React.Suspense fallback="Loading App...">
        <Providers>
          <div>
            <a href="https://vitejs.dev" target="_blank">
              <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <a href="https://react.dev" target="_blank">
              <img src={reactLogo} className="logo react" alt="React logo" />
            </a>
          </div>
          <h1>Vite + React</h1>
          <div className="card">
            <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
            <p>
              Edit <code>src/App.tsx</code> and save to test HMR
            </p>
          </div>
          <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
          <IntegrationsListPage />
        </Providers>
      </React.Suspense>
    </BrowserRouter>
  );
}

export default App;
