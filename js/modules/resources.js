// Resource system definitions
export const resourceIcons = {
  food: '🍖',
  wood: '🪵',
  stone: '🪨',
  ironOre: '⛏️',
  gold: '💰',
  coal: '⚫',
  oil: '🛢️',
  sulfur: '⚗️',
  techPoints: '🔬',
  manpower: '👥',
  offshoreOil: '🌊',
  salt: '🧂',
  silica: '🔍',
  uranium: '☢️',
  diamonds: '💎',
  geothermal: '♨️',
  peat: '🟫',
  rubber: '🌳',
  grapes: '🍇',
  seaSalt: '🧂',
  pearls: '🦪'
};

// Resource categories for organization
export const resourceCategories = {
  basic: ['food', 'wood', 'manpower'],
  construction: ['wood', 'stone'],
  metals: ['ironOre', 'gold'],
  fuels: ['coal', 'oil'],
  special: ['sulfur', 'techPoints']
};

// Define which resources are available in each age along with their primary extraction method
export const resourcesByAge = {
  'Stone Age': [
    { id: 'food', primaryMethod: 'farm', secondaryMethod: 'hunters_hut' },
    { id: 'wood', primaryMethod: 'logging_camp', secondaryMethod: null },
    { id: 'manpower', primaryMethod: null, secondaryMethod: null }
  ],
  
  'Bronze Age': [
    { id: 'food', primaryMethod: 'farm', secondaryMethod: 'hunters_hut' },
    { id: 'wood', primaryMethod: 'logging_camp', secondaryMethod: 'lumber_mill' },
    { id: 'stone', primaryMethod: 'quarry', secondaryMethod: null },
    { id: 'manpower', primaryMethod: null, secondaryMethod: null }
  ],
  
  'Iron Age': [
    { id: 'food', primaryMethod: 'farm', secondaryMethod: 'hunters_hut' },
    { id: 'wood', primaryMethod: 'logging_camp', secondaryMethod: 'lumber_mill' },
    { id: 'stone', primaryMethod: 'quarry', secondaryMethod: null },
    { id: 'ironOre', primaryMethod: 'mine', secondaryMethod: null },
    { id: 'manpower', primaryMethod: null, secondaryMethod: null }
  ],
  
  'Medieval Age': [
    { id: 'food', primaryMethod: 'farm', secondaryMethod: 'hunters_hut' },
    { id: 'wood', primaryMethod: 'logging_camp', secondaryMethod: 'lumber_mill' },
    { id: 'stone', primaryMethod: 'quarry', secondaryMethod: null },
    { id: 'ironOre', primaryMethod: 'mine', secondaryMethod: null },
    { id: 'gold', primaryMethod: 'gold_mine', secondaryMethod: null },
    { id: 'manpower', primaryMethod: null, secondaryMethod: null }
  ],
  
  'Renaissance Age': [
    { id: 'food', primaryMethod: 'farm', secondaryMethod: 'hunters_hut' },
    { id: 'wood', primaryMethod: 'logging_camp', secondaryMethod: 'lumber_mill' },
    { id: 'stone', primaryMethod: 'quarry', secondaryMethod: null },
    { id: 'ironOre', primaryMethod: 'mine', secondaryMethod: null },
    { id: 'gold', primaryMethod: 'gold_mine', secondaryMethod: null },
    { id: 'coal', primaryMethod: 'coal_mine', secondaryMethod: null },
    { id: 'oil', primaryMethod: 'oil_well', secondaryMethod: null },
    { id: 'manpower', primaryMethod: null, secondaryMethod: null }
  ],
  
  'Industrial Age': [
    { id: 'food', primaryMethod: 'farm', secondaryMethod: 'hunters_hut' },
    { id: 'wood', primaryMethod: 'logging_camp', secondaryMethod: 'lumber_mill' },
    { id: 'stone', primaryMethod: 'quarry', secondaryMethod: null },
    { id: 'ironOre', primaryMethod: 'mine', secondaryMethod: null },
    { id: 'gold', primaryMethod: 'gold_mine', secondaryMethod: null },
    { id: 'coal', primaryMethod: 'coal_mine', secondaryMethod: null },
    { id: 'oil', primaryMethod: 'oil_well', secondaryMethod: null },
    { id: 'sulfur', primaryMethod: 'sulfur_pit', secondaryMethod: null },
    { id: 'manpower', primaryMethod: null, secondaryMethod: null }
  ],
  
  'Imperial Age': [
    { id: 'food', primaryMethod: 'farm', secondaryMethod: 'hunters_hut' },
    { id: 'wood', primaryMethod: 'logging_camp', secondaryMethod: 'lumber_mill' },
    { id: 'stone', primaryMethod: 'quarry', secondaryMethod: null },
    { id: 'ironOre', primaryMethod: 'mine', secondaryMethod: null },
    { id: 'gold', primaryMethod: 'gold_mine', secondaryMethod: null },
    { id: 'coal', primaryMethod: 'coal_mine', secondaryMethod: null },
    { id: 'oil', primaryMethod: 'oil_well', secondaryMethod: null },
    { id: 'sulfur', primaryMethod: 'sulfur_pit', secondaryMethod: null },
    { id: 'techPoints', primaryMethod: 'research_lab', secondaryMethod: null },
    { id: 'manpower', primaryMethod: null, secondaryMethod: null }
  ],
  
  'Great War Age': [
    { id: 'food', primaryMethod: 'farm', secondaryMethod: 'hunters_hut' },
    { id: 'wood', primaryMethod: 'logging_camp', secondaryMethod: 'lumber_mill' },
    { id: 'stone', primaryMethod: 'quarry', secondaryMethod: null },
    { id: 'ironOre', primaryMethod: 'mine', secondaryMethod: null },
    { id: 'gold', primaryMethod: 'gold_mine', secondaryMethod: null },
    { id: 'coal', primaryMethod: 'coal_mine', secondaryMethod: null },
    { id: 'oil', primaryMethod: 'oil_well', secondaryMethod: null },
    { id: 'sulfur', primaryMethod: 'sulfur_pit', secondaryMethod: null },
    { id: 'techPoints', primaryMethod: 'research_lab', secondaryMethod: null },
    { id: 'manpower', primaryMethod: null, secondaryMethod: null }
  ]
};

// Helper function to get simple list of resources by age (for backwards compatibility)
export function getSimpleResourcesByAge(age) {
  return resourcesByAge[age].map(item => item.id);
}

// Resource descriptions
export const resourceDescriptions = {
  food: 'Basic sustenance for your population and units. Harvested from farms or hunting.',
  wood: 'Essential for basic tools and structures. Harvested from forests using logging camps.',
  stone: 'Used for walls and defensive structures. Requires a quarry to extract.',
  ironOre: 'Critical for weapons and tools. Must be mined from mountains.',
  gold: 'Currency for trade and royal projects. Found in specific deposits in mountains.',
  coal: 'Fuel for early steam engines and industry. Must be mined from specific deposits.',
  oil: 'Powers advanced engines and naval units. Requires an oil well to extract.',
  sulfur: 'Key component for gunpowder and explosives. Found in desert and mountain deposits.',
  techPoints: 'Research currency for advanced technologies. Generated by research buildings.',
  manpower: 'Available population for military service. Grows with your city population.'
};

// Resource node types for map generation with quality levels
export const resourceTileTypes = {
  food: {
    color: '#8BC34A',
    moveCost: 1,
    description: 'Food source',
    qualityLevels: {
      poor: { color: '#A5D6A7', multiplier: 0.7, maxAmount: 40 },
      standard: { color: '#8BC34A', multiplier: 1.0, maxAmount: 70 },
      rich: { color: '#66BB6A', multiplier: 1.5, maxAmount: 100 }
    },
    terrainRequirements: ['plains', 'forest'],
    buildingRequired: true,
    buildingType: 'hunting_lodge'
  },
  wood: {
    color: '#33691E',
    moveCost: 1,
    description: 'Forests for wood',
    qualityLevels: {
      poor: { color: '#81C784', multiplier: 0.7, maxAmount: 40 },
      standard: { color: '#33691E', multiplier: 1.0, maxAmount: 70 },
      rich: { color: '#2E7D32', multiplier: 1.5, maxAmount: 100 }
    },
    terrainRequirements: ['forest'],
    buildingRequired: true,
    buildingType: 'logging_camp'
  },
  stone: {
    color: '#9E9E9E',
    moveCost: 1,
    description: 'Stone quarry',
    qualityLevels: {
      poor: { color: '#BDBDBD', multiplier: 0.7, maxAmount: 30 },
      standard: { color: '#9E9E9E', multiplier: 1.0, maxAmount: 60 },
      rich: { color: '#757575', multiplier: 1.5, maxAmount: 90 }
    },
    terrainRequirements: ['mountain', 'hills'],
    buildingRequired: true,
    minAge: 'Bronze Age'
  },
  ironOre: {
    color: '#795548',
    moveCost: 1,
    description: 'Iron ore deposit',
    qualityLevels: {
      poor: { color: '#A1887F', multiplier: 0.7, maxAmount: 25 },
      standard: { color: '#795548', multiplier: 1.0, maxAmount: 50 },
      rich: { color: '#5D4037', multiplier: 1.5, maxAmount: 75 }
    },
    terrainRequirements: ['mountain'],
    buildingRequired: true,
    minAge: 'Iron Age'
  },
  gold: {
    color: '#FFD700',
    moveCost: 1,
    description: 'Gold deposit',
    qualityLevels: {
      poor: { color: '#FFF176', multiplier: 0.7, maxAmount: 15 },
      standard: { color: '#FFD700', multiplier: 1.0, maxAmount: 30 },
      rich: { color: '#FFC107', multiplier: 1.5, maxAmount: 50 }
    },
    terrainRequirements: ['mountain', 'hills'],
    buildingRequired: true,
    minAge: 'Medieval Age',
    rarity: 'rare'
  },
  coal: {
    color: '#263238',
    moveCost: 1,
    description: 'Coal mine',
    qualityLevels: {
      poor: { color: '#546E7A', multiplier: 0.7, maxAmount: 20 },
      standard: { color: '#263238', multiplier: 1.0, maxAmount: 40 },
      rich: { color: '#212121', multiplier: 1.5, maxAmount: 70 }
    },
    terrainRequirements: ['mountain'],
    buildingRequired: true,
    minAge: 'Renaissance Age'
  },
  oil: {
    color: '#607D8B',
    moveCost: 1,
    description: 'Oil deposit',
    qualityLevels: {
      poor: { color: '#90A4AE', multiplier: 0.7, maxAmount: 20 },
      standard: { color: '#607D8B', multiplier: 1.0, maxAmount: 40 },
      rich: { color: '#455A64', multiplier: 1.5, maxAmount: 70 }
    },
    terrainRequirements: ['desert', 'water'],
    buildingRequired: true,
    minAge: 'Renaissance Age',
    rarity: 'uncommon'
  },
  sulfur: {
    color: '#FFEB3B',
    moveCost: 1,
    description: 'Sulfur deposit',
    qualityLevels: {
      poor: { color: '#FFF59D', multiplier: 0.7, maxAmount: 15 },
      standard: { color: '#FFEB3B', multiplier: 1.0, maxAmount: 30 },
      rich: { color: '#FDD835', multiplier: 1.5, maxAmount: 50 }
    },
    terrainRequirements: ['desert', 'mountain'],
    buildingRequired: true,
    minAge: 'Industrial Age',
    rarity: 'rare'
  },
  offshoreOil: {
    color: '#1A237E',
    moveCost: 2,
    description: 'Offshore oil deposit',
    qualityLevels: {
      poor: { color: '#3949AB', multiplier: 0.7, maxAmount: 25 },
      standard: { color: '#1A237E', multiplier: 1.0, maxAmount: 50 },
      rich: { color: '#0D47A1', multiplier: 1.5, maxAmount: 80 }
    },
    terrainRequirements: ['water'],
    buildingRequired: true,
    minAge: 'Industrial Age',
    rarity: 'uncommon'
  },
  salt: {
    color: '#E0E0E0',
    moveCost: 1,
    description: 'Salt flats',
    qualityLevels: {
      poor: { color: '#F5F5F5', multiplier: 0.7, maxAmount: 20 },
      standard: { color: '#E0E0E0', multiplier: 1.0, maxAmount: 40 },
      rich: { color: '#BDBDBD', multiplier: 1.5, maxAmount: 60 }
    },
    terrainRequirements: ['desert', 'water'],
    buildingRequired: true,
    minAge: 'Bronze Age'
  },
  silica: {
    color: '#B2EBF2',
    moveCost: 1,
    description: 'Quartz vein',
    qualityLevels: {
      poor: { color: '#E0F7FA', multiplier: 0.7, maxAmount: 20 },
      standard: { color: '#B2EBF2', multiplier: 1.0, maxAmount: 40 },
      rich: { color: '#80DEEA', multiplier: 1.5, maxAmount: 60 }
    },
    terrainRequirements: ['hills'],
    buildingRequired: true,
    minAge: 'Medieval Age'
  },
  uranium: {
    color: '#4CAF50',
    moveCost: 1,
    description: 'Uranium deposit',
    qualityLevels: {
      poor: { color: '#81C784', multiplier: 0.7, maxAmount: 15 },
      standard: { color: '#4CAF50', multiplier: 1.0, maxAmount: 30 },
      rich: { color: '#388E3C', multiplier: 1.5, maxAmount: 50 }
    },
    terrainRequirements: ['mountain'],
    buildingRequired: true,
    minAge: 'Great War Age',
    rarity: 'rare'
  },
  diamonds: {
    color: '#B39DDB',
    moveCost: 1,
    description: 'Diamond deposit',
    qualityLevels: {
      poor: { color: '#D1C4E9', multiplier: 0.7, maxAmount: 10 },
      standard: { color: '#B39DDB', multiplier: 1.0, maxAmount: 25 },
      rich: { color: '#9575CD', multiplier: 1.5, maxAmount: 40 }
    },
    terrainRequirements: ['mountain'],
    buildingRequired: true,
    minAge: 'Renaissance Age',
    rarity: 'rare'
  },
  geothermal: {
    color: '#FF5722',
    moveCost: 1,
    description: 'Geothermal vent',
    qualityLevels: {
      poor: { color: '#FF8A65', multiplier: 0.7, maxAmount: 20 },
      standard: { color: '#FF5722', multiplier: 1.0, maxAmount: 40 },
      rich: { color: '#E64A19', multiplier: 1.5, maxAmount: 60 }
    },
    terrainRequirements: ['mountain', 'hills'],
    buildingRequired: true,
    minAge: 'Industrial Age',
    rarity: 'uncommon'
  },
  peat: {
    color: '#795548',
    moveCost: 2,
    description: 'Peat bog',
    qualityLevels: {
      poor: { color: '#A1887F', multiplier: 0.7, maxAmount: 20 },
      standard: { color: '#795548', multiplier: 1.0, maxAmount: 40 },
      rich: { color: '#5D4037', multiplier: 1.5, maxAmount: 60 }
    },
    terrainRequirements: ['plains', 'water'],
    buildingRequired: true,
    minAge: 'Medieval Age'
  },
  rubber: {
    color: '#33691E',
    moveCost: 1,
    description: 'Rubber trees',
    qualityLevels: {
      poor: { color: '#558B2F', multiplier: 0.7, maxAmount: 20 },
      standard: { color: '#33691E', multiplier: 1.0, maxAmount: 40 },
      rich: { color: '#1B5E20', multiplier: 1.5, maxAmount: 60 }
    },
    terrainRequirements: ['forest'],
    buildingRequired: true,
    minAge: 'Industrial Age'
  },
  grapes: {
    color: '#8E24AA',
    moveCost: 1,
    description: 'Vineyard',
    qualityLevels: {
      poor: { color: '#AB47BC', multiplier: 0.7, maxAmount: 15 },
      standard: { color: '#8E24AA', multiplier: 1.0, maxAmount: 30 },
      rich: { color: '#6A1B9A', multiplier: 1.5, maxAmount: 50 }
    },
    terrainRequirements: ['hills', 'plains'],
    buildingRequired: true,
    minAge: 'Medieval Age'
  },
  seaSalt: {
    color: '#B0BEC5',
    moveCost: 2,
    description: 'Saltwater marsh',
    qualityLevels: {
      poor: { color: '#CFD8DC', multiplier: 0.7, maxAmount: 15 },
      standard: { color: '#B0BEC5', multiplier: 1.0, maxAmount: 30 },
      rich: { color: '#90A4AE', multiplier: 1.5, maxAmount: 50 }
    },
    terrainRequirements: ['water', 'plains'],
    buildingRequired: true,
    minAge: 'Bronze Age'
  },
  pearls: {
    color: '#E1BEE7',
    moveCost: 2,
    description: 'Coral reef',
    qualityLevels: {
      poor: { color: '#F3E5F5', multiplier: 0.7, maxAmount: 10 },
      standard: { color: '#E1BEE7', multiplier: 1.0, maxAmount: 25 },
      rich: { color: '#CE93D8', multiplier: 1.5, maxAmount: 40 }
    },
    terrainRequirements: ['water'],
    buildingRequired: true,
    minAge: 'Medieval Age',
    rarity: 'rare'
  }
};

// Resource efficiency boosters by technology
export const resourceTechBoosters = {
  'Stone Age': {
    'Basic Agriculture': { resource: 'food', bonus: 0.1 },
    'Stone Tools': { resource: 'stone', bonus: 0.1 }
  },
  'Bronze Age': {
    'Bronze Working': { resource: 'ironOre', bonus: 0.15 },
    'Masonry': { resource: 'stone', bonus: 0.2 }
  },
  'Iron Age': {
    'Iron Working': { resource: 'ironOre', bonus: 0.25 },
    'Crop Rotation': { resource: 'food', bonus: 0.2 }
  },
  'Medieval Age': {
    'Mining Techniques': { resource: 'gold', bonus: 0.2 },
    'Forestry': { resource: 'wood', bonus: 0.2 }
  },
  'Renaissance Age': {
    'Deep Mining': { resources: ['coal', 'ironOre'], bonus: 0.25 },
    'Oil Drilling': { resource: 'oil', bonus: 0.2 }
  },
  'Industrial Age': {
    'Industrial Extraction': { resources: ['coal', 'ironOre', 'stone'], bonus: 0.3 },
    'Chemical Processing': { resource: 'sulfur', bonus: 0.25 }
  }
};

// Resource hotspots configuration
export const resourceHotspots = {
  minDistance: 10,  // Minimum distance between hotspots
  maxHotspots: 5,   // Maximum number of hotspots on map
  radius: 3,        // Radius of hotspot influence
  densityBonus: 0.3 // Increased chance of finding resources in hotspot
};

// Resource distribution patterns
export const resourceDistributions = {
  // Clustered resources that tend to appear together
  clusters: [
    { resources: ['ironOre', 'coal'], terrain: 'mountain', name: 'Mining District' },
    { resources: ['food', 'wood'], terrain: 'forest', name: 'Fertile Woodland' },
    { resources: ['gold', 'stone'], terrain: 'mountain', name: 'Rich Mountains' },
    { resources: ['oil', 'sulfur'], terrain: 'desert', name: 'Oil Fields' }
  ],
  
  // Strategic resources that should be placed in contested areas
  strategic: ['gold', 'oil', 'sulfur']
};

// Helper function to determine if a resource is available in the current age
export function isResourceAvailableInAge(resourceId, age) {
  const ageResources = resourcesByAge[age];
  return ageResources.some(resource => resource.id === resourceId);
}

// Helper function to get the extraction building needed for a resource
export function getExtractionBuildingForResource(resourceId, age) {
  const ageResources = resourcesByAge[age];
  const resourceInfo = ageResources.find(resource => resource.id === resourceId);
  return resourceInfo ? resourceInfo.primaryMethod : null;
}

// Helper function to get resource quality level colors
export function getResourceQualityColor(resourceId, qualityLevel) {
  if (!resourceTileTypes[resourceId] || !resourceTileTypes[resourceId].qualityLevels) {
    return '#FFFFFF';
  }
  return resourceTileTypes[resourceId].qualityLevels[qualityLevel]?.color || resourceTileTypes[resourceId].color;
}

// Helper function to determine resource depletion rate based on quality
export function getResourceDepletionRate(resourceId, qualityLevel) {
  const baseRate = 1; // Base depletion rate per extraction
  
  if (!resourceTileTypes[resourceId] || !resourceTileTypes[resourceId].qualityLevels) {
    return baseRate;
  }
  
  const quality = resourceTileTypes[resourceId].qualityLevels[qualityLevel];
  if (!quality) return baseRate;
  
  // Rich deposits deplete slower, poor deposits deplete faster
  return baseRate / quality.multiplier;
}
