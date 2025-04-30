import { terrainTypes } from './terrain.js';
import { resourceTileTypes } from './resources.js';

export function generateMap(gameState) {
    const size = gameState.mapSize;
    const map = [];

    // Initialize empty map
    for (let y = 0; y < size; y++) {
        map[y] = [];
        for (let x = 0; x < size; x++) {
            map[y][x] = {
                x: x,
                y: y,
                type: 'plains',
                discovered: Array(gameState.players.length).fill(false),
                resourceType: null,
                resourceAmount: 0,
                unit: null,
                building: null,
                buildingInProgress: null
            };
        }
    }

    // Set initial discovered tiles for players
    const startingVision = 2;
    for (let i = 0; i < gameState.players.length; i++) {
        const centerX = Math.floor(size / 2);
        const centerY = Math.floor(size / 2);
        revealArea(gameState, centerX, centerY, startingVision, i);
    }

    gameState.map = map;
    return gameState;
}

export function revealArea(gameState, centerX, centerY, radius, playerIndex) {
    const size = gameState.mapSize;
    
    for (let y = Math.max(0, centerY - radius); y <= Math.min(size - 1, centerY + radius); y++) {
        for (let x = Math.max(0, centerX - radius); x <= Math.min(size - 1, centerX + radius); x++) {
            if (Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) <= radius) {
                gameState.map[y][x].discovered[playerIndex] = true;
            }
        }
    }
}
