# Time & World Cycles - Design Document

## Core Decisions

### Time Scale: 20x
We have chosen a **20:1** time ratio.
- **1 Real Minute = 20 Game Minutes**
- **3 Real Minutes = 1 Game Hour**
- **1 Real Hour = 20 Game Hours**

### The Daily Cycle
A full 24-hour in-game day passes in **72 minutes (1 hour 12 minutes)** of real time.

| Phase | Game Time | Real Duration | Description |
|:---|:---|:---|:---|
| **Morning** | 06:00 - 11:00 | 15 mins | Sunrise, shops open, NPCs wake up. |
| **Day** | 11:00 - 18:00 | 21 mins | Peak activity, bright light, safe travel. |
| **Evening** | 18:00 - 22:00 | 12 mins | Sunset, taverns fill up, shops close. |
| **Night** | 22:00 - 06:00 | 24 mins | Darkness, dangerous mobs spawn, stealth bonus. |

## Design Philosophy

### Why 20x?
We want the world to feel dynamic during a single play session.
- **At 10x (2.4h day):** A casual player might play for an hour and never see the sun set. The world feels static.
- **At 60x (24m day):** Days fly by too fast to accomplish "night tasks" or "day tasks" without feeling rushed.
- **At 20x (72m day):** A player logging in for an hour will experience a significant shift in time (e.g., Day -> Night), making the world feel alive, but still has ~30 minutes of stable "Night" to execute plans.

## Gameplay Impacts

### Lighting & Visibility
- **Day:** Full visibility outdoors. standard view distance.
- **Night:** Reduced view distance outdoors unless holding a light source. "It is too dark to see clearly."
- **Indoors:** Unaffected by time unless the room has windows/skylights.

### NPC Schedules
Time is the primary driver for AI behavior states.
1.  **Work:** Merchants are only available 08:00 - 18:00.
2.  **Leisure:** NPCs move to social hubs (taverns, parks) in the evening.
3.  **Sleep:** Most NPCs are inactive/unresponsive at night (or asleep in locked rooms).

### Economy
- Shops have opening/closing hours.
- Some items/mobs may only be available at specific times (e.g., Nightshade herbs, Moon beasts).

