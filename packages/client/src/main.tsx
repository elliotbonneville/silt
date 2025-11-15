/**
 * Client entry point
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { CharactersPage } from './routes/characters.js';
import { GameRoute } from './routes/game.js';
import { RootLayout } from './routes/root.js';
import { UsernamePage } from './routes/username.js';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <UsernamePage />,
      },
      {
        path: 'characters',
        element: <CharactersPage />,
      },
      {
        path: 'game/:characterId',
        element: <GameRoute />,
      },
    ],
  },
]);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
