/**
 * Client entry point
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
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
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
