// Resource system definitions
export const resourceIcons = {
  food: '🍖',
  wood: '🪵',
  stone: '🪨',
  ironOre: '⛏️',
  gold: '💰',
  coal: '🪨',
  oil: '🛢️',
  sulfur: '⚗️',
  techPoints: '🔬',
  manpower: '👥'
};

// Define which resources are available in each age
export const resourcesByAge = {
  'Stone Age': ['food', 'wood', 'manpower'],
  'Bronze Age': ['food', 'wood', 'stone', 'manpower'],
  'Iron Age': ['food', 'wood', 'stone', 'ironOre', 'manpower'],
  'Medieval Age': ['food', 'wood', 'stone', 'ironOre', 'gold', 'manpower'],
  'Renaissance Age': ['food', 'wood', 'stone', 'ironOre', 'gold', 'coal', 'oil', 'manpower'],
  'Industrial Age': ['food', 'wood', 'stone', 'ironOre', 'gold', 'coal', 'oil', 'sulfur', 'manpower'],
  'Imperial Age': ['food', 'wood', 'stone', 'ironOre', 'gold', 'coal', 'oil', 'sulfur', 'techPoints', 'manpower'],
  'Great War Age': ['food', 'wood', 'stone', 'ironOre', 'gold', 'coal', 'oil', 'sulfur', 'techPoints', 'manpower']
};

// Resource descriptions
export const resourceDescriptions = {
  food: 'Basic sustenance for your population and units',
  wood: 'Essential for basic tools and structures',
  stone: 'Used for walls and defensive structures',
  ironOre: 'Critical for weapons and tools',
  gold: 'Currency for trade and royal projects',
  coal: 'Fuel for early steam engines',
  oil: 'Powers advanced engines and naval units',
  sulfur: 'Key component for gunpowder and explosives',
  techPoints: 'Research currency for advanced technologies',
  manpower: 'Available population for military service'
};

// Resource node types for map generation
export const resourceTileTypes = {
  food: { color: '#8BC34A', moveCost: 1, description: 'Food source' },
  wood: { color: '#33691E', moveCost: 1, description: 'Forests for wood' },
  stone: { color: '#9E9E9E', moveCost: 1, description: 'Stone quarry' },
  ironOre: { color: '#795548', moveCost: 1, description: 'Iron ore deposit' },
  gold: { color: '#FFD700', moveCost: 1, description: 'Gold deposit' },
  coal: { color: '#263238', moveCost: 1, description: 'Coal mine' },
  oil: { color: '#607D8B', moveCost: 1, description: 'Oil deposit' },
  sulfur: { color: '#FFEB3B', moveCost: 1, description: 'Sulfur deposit' }
};
