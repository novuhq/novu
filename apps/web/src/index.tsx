import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { initializeApp } from './initializeApp';
import reportWebVitals from './reportWebVitals';

import './styled-system/styles.css';

initializeApp();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

/*
 * If you want to start measuring performance in your app, pass a function
 * to log results (for example: reportWebVitals(console.log))
 * or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals .
 */
reportWebVitals();
