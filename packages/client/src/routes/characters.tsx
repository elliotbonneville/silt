/**
 * Character selection route
 */

import { useLocation, useNavigate } from 'react-router';
import { CharacterSelect } from '../components/CharacterSelect.js';

export function CharactersPage(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state;
  const username =
    state && typeof state === 'object' && 'username' in state && typeof state.username === 'string'
      ? state.username
      : null;

  if (!username) {
    navigate('/');
    return <div>Redirecting...</div>;
  }

  const handleCharacterSelected = (characterId: string): void => {
    navigate(`/game/${characterId}`);
  };

  return <CharacterSelect accountId={username} onCharacterSelected={handleCharacterSelected} />;
}
