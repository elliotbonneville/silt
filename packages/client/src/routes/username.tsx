/**
 * Username entry route
 */

import { useNavigate } from 'react-router';
import { UsernamePrompt } from '../components/UsernamePrompt.js';

export function UsernamePage(): JSX.Element {
  const navigate = useNavigate();

  const handleUsernameSubmitted = (username: string): void => {
    navigate('/characters', { state: { username } });
  };

  return <UsernamePrompt onUsernameSubmitted={handleUsernameSubmitted} />;
}
