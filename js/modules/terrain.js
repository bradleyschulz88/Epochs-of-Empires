import { resourceTileTypes } from './resources.js';

// Define terrain types
export const terrainTypes = {
  plains: { color: '#8BC34A', moveCost: 1, description: 'Default easy terrain' },
  water: { color: '#2196F3', moveCost: null, description: 'Only naval transports & ships may enter' },
  mountain: { color: '#9E9E9E', moveCost: null, description: 'Impassable to ground units; air may overfly' },
  forest: { color: '#33691E', moveCost: 2, description: 'Slows infantry/cavalry; offers cover' },
  desert: { color: '#FFC107', moveCost: 2, description: 'Harsh; non-desert units pay full cost' },
  hills: { color: '#795548', moveCost: 2, description: 'Grants vision bonus; costs extra effort' },
  river: { color: '#87CEEB', moveCost: 2, description: 'Land units only at bridges/fords; else impassable' },
  tundra: { color: '#E0FFFF', moveCost: 2, description: 'Same as Forest for simplicity' },
  ...resourceTileTypes
};

// Compatibility for existing 'land' terrain references
terrainTypes.land = terrainTypes.plains;
