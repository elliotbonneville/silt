/**
 * Client entry point
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AdminLayout } from './components/admin/AdminLayout.js';
import AdminEventsRoute from './routes/admin/events.js';
import AdminMapRoute from './routes/admin/map.js';
import CharactersRoute from './routes/characters.js';
import GameRoute from './routes/game.js';
import UsernameRoute from './routes/username.js';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UsernameRoute />} />
        <Route path="characters" element={<CharactersRoute />} />
        <Route path="game/:characterId" element={<GameRoute />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/events" replace />} />
          <Route path="events" element={<AdminEventsRoute />} />
          <Route path="map" element={<AdminMapRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
