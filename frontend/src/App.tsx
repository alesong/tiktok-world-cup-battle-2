import React from 'react';
import { Home } from './components/Home.js';
import { AdminPanel } from './components/AdminPanel.js';
import { OverlayView } from './components/OverlayView.js';
import { TopDonorsOverlay } from './components/TopDonorsOverlay.js';
import { AlertOverlay } from './components/AlertOverlay.js';

export const App: React.FC = () => {
  const path = window.location.pathname;

  if (path === '/admin') {
    return <AdminPanel />;
  }
  
  if (path === '/overlay') {
    return <OverlayView />;
  }

  if (path === '/overlay/donors') {
    return <TopDonorsOverlay />;
  }

  if (path === '/overlay/alert') {
    return <AlertOverlay />;
  }

  return <Home />;
};
export default App;
