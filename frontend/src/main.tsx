import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
