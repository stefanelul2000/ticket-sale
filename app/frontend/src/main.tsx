import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { router } from './router';
import { Toasts } from './ui/components/Toasts';
import { useSettings } from './state/useSettings';

useSettings.getState().load();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toasts />
  </StrictMode>,
);
