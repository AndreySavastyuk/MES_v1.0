import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Заглушки для отсутствующих Assets
try {
  // Попытка импорта Assets, если они доступны
  require('@sap-ui/webcomponents/dist/Assets.js');
} catch (e) {
  console.warn('UI5 Assets not found, using fallback');
}

try {
  require('@sap-ui/webcomponents-react/dist/Assets.js');
} catch (e) {
  console.warn('UI5 React Assets not found, using fallback');
}

try {
  require('@sap-ui/webcomponents-fiori/dist/Assets.js');
} catch (e) {
  console.warn('UI5 Fiori Assets not found, using fallback');
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 

