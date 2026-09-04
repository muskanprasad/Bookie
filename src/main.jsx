import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(
    (registration) => {
      console.log('Service Worker registered:', registration);
    },
    (error) => {
      console.log('Service Worker registration failed:', error);
    }
  );
}