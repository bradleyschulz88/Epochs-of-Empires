// Resource types and their availability by age
export const resourcesByAge = {
    'Stone Age': ['food', 'wood', 'stone'],
    'Bronze Age': ['food', 'wood', 'stone', 'copper'],
    'Iron Age': ['food', 'wood', 'stone', 'copper', 'iron'],
    'Medieval Age': ['food', 'wood', 'stone', 'copper', 'iron', 'gold'],
    'Renaissance': ['food', 'wood', 'stone', 'copper', 'iron', 'gold', 'coal']
};

// Resource icons for UI
export const resourceIcons = {
    food: '🌾',
    wood: '🌳',
    stone: '🪨',
    copper: '🟫',
    iron: '⚙️',
    gold: '💰',
    coal: '⬛',
    horses: '🐎',
    fish: '🐟',
    fur: '🦊'
};

// Resource tile types and their properties
export const resourceTileTypes = {
    horses: {
        name: "Horses",
        validTerrain: ['plains'],
        baseAmount: 100,
        respawnRate: 2
    },
    fish: {
        name: "Fish",
        validTerrain: ['water'],
        baseAmount: 150,
        respawnRate: 7
    },
    fur: {
        name: "Fur",
        validTerrain: ['forest'],
        baseAmount: 100,
        respawnRate: 2
    },
    food: {
        name: "Food",
        validTerrain: ['plains'],
        baseAmount: 100,
        respawnRate: 5
    },
    wood: {
        name: "Wood",
        validTerrain: ['forest'],
        baseAmount: 100,
        respawnRate: 3
    },
    stone: {
        name: "Stone",
        validTerrain: ['mountain'],
        baseAmount: 200,
        respawnRate: 0
    },
    copper: {
        name: "Copper",
        validTerrain: ['mountain'],
        baseAmount: 150,
        respawnRate: 0
    },
    iron: {
        name: "Iron",
        validTerrain: ['mountain'],
        baseAmount: 150,
        respawnRate: 0
    },
    gold: {
        name: "Gold",
        validTerrain: ['mountain'],
        baseAmount: 100,
        respawnRate: 0
    },
    coal: {
        name: "Coal",
        validTerrain: ['mountain'],
        baseAmount: 200,
        respawnRate: 0
    }
};

// Helper function to get available resources for an age
export function getSimpleResourcesByAge(age) {
    return resourcesByAge[age] || resourcesByAge['Stone Age'];
}
