import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './responsive-globals.css';

// Force HashRouter initialization for Electron
console.log('[MAIN] Protocol:', window.location.protocol, 'Hash:', window.location.hash);
console.log('[MAIN] Full URL:', window.location.href);

if (window.location.protocol === 'file:' && !window.location.hash) {
  console.log('[MAIN] No hash detected - redirecting to #/');
  window.location.replace(window.location.pathname + '#/');
} else {
  console.log('[MAIN] Hash detected or not file protocol - mounting React');
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
