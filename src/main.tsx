// import { StrictMode } from 'react';
// import { createRoot } from 'react-dom/client';
// import App from './App';
// import './index.css';

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>
// );

// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ❌ REMOVE BrowserRouter from here
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* ❌ Remove this BrowserRouter wrapper */}
    <App /> {/* Just render App directly */}
  </React.StrictMode>
);