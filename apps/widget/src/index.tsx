import React from 'react';
import ReactDOM from 'react-dom';
import reportWebVitals from './reportWebVitals';
import { WidgetHost } from './WidgetHost';

ReactDOM.render(
  <React.StrictMode>
    <WidgetHost />
  </React.StrictMode>,
  document.getElementById('root')
);

/*
 * If you want to start measuring performance in your app, pass a function
 * to log results (for example: reportWebVitals(console.log))
 * or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
 */
reportWebVitals();
