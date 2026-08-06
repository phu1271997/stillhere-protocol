import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

if (typeof BigInt !== 'undefined') {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

if (typeof JSON !== 'undefined' && JSON.stringify) {
  const origStringify = JSON.stringify;
  JSON.stringify = function (value: any, replacer?: any, space?: any) {
    const safeReplacer = (key: string, val: any) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }
      if (typeof replacer === 'function') {
        return replacer(key, val);
      }
      return val;
    };
    return origStringify(value, safeReplacer, space);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
