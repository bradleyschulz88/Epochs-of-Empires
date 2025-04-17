import { resourceTileTypes } from './resources.js';

// Define terrain types
export const terrainTypes = {
  land: { color: '#8BC34A', moveCost: 1, description: 'Basic land terrain' },
  water: { color: '#2196F3', moveCost: 2, description: 'Water - only naval units can cross' },
  mountain: { color: '#9E9E9E', moveCost: 3, description: 'Mountains - difficult to cross, defense bonus' },
  forest: { color: '#33691E', moveCost: 2, description: 'Forest - provides cover and resources' },
  desert: { color: '#FFC107', moveCost: 2, description: 'Desert - difficult to traverse' },
  hills: { color: '#795548', moveCost: 2, description: 'Hills - provide defensive advantage' },
  ...resourceTileTypes
};
