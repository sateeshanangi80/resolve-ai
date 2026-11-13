import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import Telemetry from './components/Telemetry';
createRoot(document.getElementById('root')!).render(<StrictMode>
    <App />
    <Telemetry />
  </StrictMode>);
