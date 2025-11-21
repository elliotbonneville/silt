/**
 * Agent form input fields
 */

interface AgentFormFieldsProps {
  name: string;
  setName: (value: string) => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  homeRoomId: string;
  setHomeRoomId: (value: string) => void;
  currentRoomId: string;
  setCurrentRoomId: (value: string) => void;
  maxRoomsFromHome: number;
  setMaxRoomsFromHome: (value: number) => void;
  hp: number;
  setHp: (value: number) => void;
  maxHp: number;
  setMaxHp: (value: number) => void;
  attackPower: number;
  setAttackPower: (value: number) => void;
  defense: number;
  setDefense: (value: number) => void;
  rooms: Array<{ id: string; name: string }>;
}

export function AgentFormFields({
  name,
  setName,
  systemPrompt,
  setSystemPrompt,
  description,
  setDescription,
  homeRoomId,
  setHomeRoomId,
  currentRoomId,
  setCurrentRoomId,
  maxRoomsFromHome,
  setMaxRoomsFromHome,
  hp,
  setHp,
  maxHp,
  setMaxHp,
  attackPower,
  setAttackPower,
  defense,
  setDefense,
  rooms,
}: AgentFormFieldsProps): JSX.Element {
  return (
    <>
      {/* Name */}
      <div>
        <label htmlFor="agent-name" className="block text-sm font-medium text-gray-300 mb-1">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          id="agent-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={50}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
          placeholder="Agent name"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="agent-description" className="block text-sm font-medium text-gray-300 mb-1">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          id="agent-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          rows={2}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
          placeholder="Brief physical description visible to players..."
        />
      </div>

      {/* System Prompt */}
      <div>
        <label
          htmlFor="agent-system-prompt"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          System Prompt (Personality) <span className="text-red-400">*</span>
        </label>
        <textarea
          id="agent-system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          required
          minLength={10}
          rows={4}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
          placeholder="Describe the agent's personality, goals, and backstory..."
        />
      </div>

      {/* Rooms Section */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="home-room" className="block text-sm font-medium text-gray-300 mb-1">
            Home Room <span className="text-red-400">*</span>
          </label>
          <select
            id="home-room"
            value={homeRoomId}
            onChange={(e) => setHomeRoomId(e.target.value)}
            required
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">Select home room...</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="current-room" className="block text-sm font-medium text-gray-300 mb-1">
            Starting Room <span className="text-red-400">*</span>
          </label>
          <select
            id="current-room"
            value={currentRoomId}
            onChange={(e) => setCurrentRoomId(e.target.value)}
            required
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">Select starting room...</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Max Rooms From Home */}
      <div>
        <label htmlFor="max-rooms" className="block text-sm font-medium text-gray-300 mb-1">
          Max Rooms From Home: {maxRoomsFromHome}
        </label>
        <input
          id="max-rooms"
          type="range"
          min={1}
          max={20}
          value={maxRoomsFromHome}
          onChange={(e) => setMaxRoomsFromHome(Number(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-gray-500">
          How far the agent can wander from their home room
        </span>
      </div>

      {/* Combat Stats */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Combat Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="hp" className="block text-sm font-medium text-gray-300 mb-1">
              HP
            </label>
            <input
              id="hp"
              type="number"
              value={hp}
              onChange={(e) => setHp(Number(e.target.value))}
              min={1}
              max={1000}
              required
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label htmlFor="max-hp" className="block text-sm font-medium text-gray-300 mb-1">
              Max HP
            </label>
            <input
              id="max-hp"
              type="number"
              value={maxHp}
              onChange={(e) => setMaxHp(Number(e.target.value))}
              min={1}
              max={1000}
              required
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label htmlFor="attack-power" className="block text-sm font-medium text-gray-300 mb-1">
              Attack Power
            </label>
            <input
              id="attack-power"
              type="number"
              value={attackPower}
              onChange={(e) => setAttackPower(Number(e.target.value))}
              min={1}
              max={100}
              required
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label htmlFor="defense" className="block text-sm font-medium text-gray-300 mb-1">
              Defense
            </label>
            <input
              id="defense"
              type="number"
              value={defense}
              onChange={(e) => setDefense(Number(e.target.value))}
              min={0}
              max={50}
              required
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>
    </>
  );
}
