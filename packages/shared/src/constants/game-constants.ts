/**
 * Game constants - centralized configuration for all gameplay values
 * Changing values here affects entire game without touching game logic
 */

/**
 * Event propagation ranges - how many rooms away events can be heard
 */
export const EVENT_RANGES = {
  whisper: 0,
  speech: 0,
  emote: 0,
  combat_start: 1,
  combat_hit: 0,
  death: 2,
  movement: 0,
  shout: 3,
  explosion: 5,
  admin_action: 0,
  global: Number.POSITIVE_INFINITY,
} as const;

/**
 * Combat configuration
 */
export const COMBAT = {
  BASE_ATTACK_COOLDOWN: 2000,
  BASE_DAMAGE: 10,
  MINIMUM_DAMAGE: 1,
  CRITICAL_HIT_CHANCE: 0.1,
  FLEE_SUCCESS_RATE: 0.7,
} as const;

/**
 * Character starting stats
 */
export const CHARACTER = {
  STARTING_HP: 100,
  STARTING_ATTACK: 10,
  STARTING_DEFENSE: 5,
} as const;

/**
 * AI agent cooldowns and limits
 */
export const AI_AGENT = {
  CONVERSE_COOLDOWN: 30000,
  OBSERVE_COOLDOWN: 60000,
  MOVE_COOLDOWN: 120000,
  COMBAT_COOLDOWN: 2000,
  ITEM_INTERACTION_COOLDOWN: 10000,
  MAX_CONVERSATION_HISTORY: 50,
  MAX_ROOMS_FROM_HOME: 3,
} as const;

/**
 * Item stats and bonuses
 */
export const ITEMS = {
  HEALTH_POTION_HEALING: 50,
  WEAPON_DAMAGE_BONUS: 15,
  ARMOR_DEFENSE_BONUS: 10,
} as const;

/**
 * System limits and timing
 */
export const SYSTEM = {
  COMMAND_RATE_LIMIT: 500,
  MAX_MESSAGE_LENGTH: 500,
  EVENT_LOG_RETENTION_DAYS: 30,
} as const;

/**
 * All game constants exported as single object
 */
export const GAME_CONSTANTS = {
  EVENT_RANGES,
  COMBAT,
  CHARACTER,
  AI_AGENT,
  ITEMS,
  SYSTEM,
} as const;
