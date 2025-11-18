/**
 * Client entry point
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AdminLayout } from './components/admin/AdminLayout.js';
import AgentLayoutRoute from './routes/admin/agents/agent-layout.js';
import AgentConversationRoute from './routes/admin/agents/conversation.js';
import AgentsLayoutRoute from './routes/admin/agents/layout.js';
import AgentOverviewRoute from './routes/admin/agents/overview.js';
import AgentPromptRoute from './routes/admin/agents/prompt.js';
import AgentRelationshipsRoute from './routes/admin/agents/relationships.js';
import AgentSpatialRoute from './routes/admin/agents/spatial.js';
import EventDetailRoute from './routes/admin/event-detail.js';
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
          <Route path="events/:eventId" element={<EventDetailRoute />} />
          <Route path="map" element={<AdminMapRoute />} />
          <Route path="agents" element={<AgentsLayoutRoute />}>
            <Route index element={<Navigate to="/admin/agents" replace />} />
            <Route path=":agentId" element={<AgentLayoutRoute />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AgentOverviewRoute />} />
              <Route path="prompt" element={<AgentPromptRoute />} />
              <Route path="spatial" element={<AgentSpatialRoute />} />
              <Route path="relationships" element={<AgentRelationshipsRoute />} />
              <Route path="conversation" element={<AgentConversationRoute />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
