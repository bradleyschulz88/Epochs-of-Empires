import { terrainTypes } from './terrain.js';
import { resourceTileTypes } from './resources.js';

export function generateMap(gameState) {
    const size = gameState.mapSize;
    const mapType = gameState.mapType || 'continents';
    const resourceDensity = gameState.resourceDensity || 'standard';
    const seed = gameState.mapSeed || Math.floor(Math.random() * 1000000);
    
    console.log(`Generating ${size}x${size} map of type: ${mapType}, seed: ${seed}`);
    
    // Initialize random with seed
    let rng = createRNG(seed);
    
    const map = [];

    // Initialize empty map with square grid
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
    
    // Generate terrain based on map type
    switch (mapType) {
        case 'continents':
            generateContinentsMap(map, size, rng);
            break;
        case 'archipelago':
            generateArchipelagoMap(map, size, rng);
            break;
        case 'pangaea':
            generatePangaeaMap(map, size, rng);
            break;
        case 'highlands':
            generateHighlandsMap(map, size, rng);
            break;
        case 'desert':
            generateDesertMap(map, size, rng);
            break;
        default:
            generateContinentsMap(map, size, rng); // Default to continents
    }
    
    // Add resources based on density
    addResources(map, size, resourceDensity, rng);
    
    // Place starting units for players
    placePlayerStartingUnits(gameState, map, size, rng);

    // Set initial discovered tiles for players
    const startingVision = 2;
    for (let i = 0; i < gameState.players.length; i++) {
        // Get the player's start position
        const startPos = findPlayerStartPosition(gameState, i, map, size, rng);
        revealArea(gameState, startPos.x, startPos.y, startingVision, i);
    }

    gameState.map = map;
    return gameState;
}

// Simple random number generator with seed
function createRNG(seed) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

// Generate a map with continents and oceans
function generateContinentsMap(map, size, rng) {
    // Start with mostly water
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            map[y][x].type = 'water';
        }
    }
    
    // Add continents
    const numContinents = Math.max(1, Math.floor(size / 10));
    for (let i = 0; i < numContinents; i++) {
        const centerX = Math.floor(rng() * size);
        const centerY = Math.floor(rng() * size);
        const continentSize = Math.floor(size * 0.3 + rng() * size * 0.3);
        
        // Create landmass
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                if (distance < continentSize * (0.5 + rng() * 0.5)) {
                    map[y][x].type = 'plains';
                }
            }
        }
    }
    
    // Add some random terrain variation
    addTerrainVariation(map, size, rng);
}

// Generate a map with lots of small islands
function generateArchipelagoMap(map, size, rng) {
    // Start with all water
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            map[y][x].type = 'water';
        }
    }
    
    // Add small islands
    const numIslands = Math.floor(size / 3);
    for (let i = 0; i < numIslands; i++) {
        const centerX = Math.floor(rng() * size);
        const centerY = Math.floor(rng() * size);
        const islandSize = 2 + Math.floor(rng() * 4);
        
        // Create small landmass
        for (let y = Math.max(0, centerY - islandSize); y < Math.min(size, centerY + islandSize); y++) {
            for (let x = Math.max(0, centerX - islandSize); x < Math.min(size, centerX + islandSize); x++) {
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                if (distance < islandSize) {
                    map[y][x].type = 'plains';
                }
            }
        }
    }
    
    // Add some random terrain variation
    addTerrainVariation(map, size, rng);
}

// Generate a map with one large landmass
function generatePangaeaMap(map, size, rng) {
    // Start with all land
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            map[y][x].type = 'plains';
        }
    }
    
    // Add water at edges
    const centerX = size / 2;
    const centerY = size / 2;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            if (distanceFromCenter > size * 0.4 + rng() * 10) {
                map[y][x].type = 'water';
            }
        }
    }
    
    // Add some random terrain variation
    addTerrainVariation(map, size, rng);
}

// Generate a map with lots of mountains
function generateHighlandsMap(map, size, rng) {
    // Start with all land
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            map[y][x].type = 'plains';
        }
    }
    
    // Add mountainous regions
    const numMountainRanges = Math.floor(size / 5);
    for (let i = 0; i < numMountainRanges; i++) {
        const centerX = Math.floor(rng() * size);
        const centerY = Math.floor(rng() * size);
        const rangeSize = 5 + Math.floor(rng() * 10);
        
        // Create mountain range
        for (let y = Math.max(0, centerY - rangeSize); y < Math.min(size, centerY + rangeSize); y++) {
            for (let x = Math.max(0, centerX - rangeSize); x < Math.min(size, centerX + rangeSize); x++) {
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                if (distance < rangeSize * 0.6) {
                    map[y][x].type = 'mountain';
                } else if (distance < rangeSize * 0.8 && rng() > 0.5) {
                    map[y][x].type = 'hills';
                }
            }
        }
    }
    
    // Add some water bodies
    const numLakes = Math.floor(size / 8);
    for (let i = 0; i < numLakes; i++) {
        const centerX = Math.floor(rng() * size);
        const centerY = Math.floor(rng() * size);
        const lakeSize = 2 + Math.floor(rng() * 4);
        
        // Create lake
        for (let y = Math.max(0, centerY - lakeSize); y < Math.min(size, centerY + lakeSize); y++) {
            for (let x = Math.max(0, centerX - lakeSize); x < Math.min(size, centerX + lakeSize); x++) {
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                if (distance < lakeSize) {
                    map[y][x].type = 'water';
                }
            }
        }
    }
}

// Generate a map with mostly desert
function generateDesertMap(map, size, rng) {
    // Start with mostly desert
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            map[y][x].type = 'desert';
        }
    }
    
    // Add oases
    const numOases = Math.floor(size / 5);
    for (let i = 0; i < numOases; i++) {
        const centerX = Math.floor(rng() * size);
        const centerY = Math.floor(rng() * size);
        const oasisSize = 1 + Math.floor(rng() * 3);
        
        // Create oasis with water and surrounded by plains
        for (let y = Math.max(0, centerY - oasisSize - 1); y < Math.min(size, centerY + oasisSize + 1); y++) {
            for (let x = Math.max(0, centerX - oasisSize - 1); x < Math.min(size, centerX + oasisSize + 1); x++) {
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                if (distance < oasisSize) {
                    map[y][x].type = 'water';
                } else if (distance < oasisSize + 1) {
                    map[y][x].type = 'plains';
                }
            }
        }
    }
    
    // Add some mountains
    const numMountains = Math.floor(size / 10);
    for (let i = 0; i < numMountains; i++) {
        const centerX = Math.floor(rng() * size);
        const centerY = Math.floor(rng() * size);
        const mountainSize = 2 + Math.floor(rng() * 3);
        
        // Create mountain
        for (let y = Math.max(0, centerY - mountainSize); y < Math.min(size, centerY + mountainSize); y++) {
            for (let x = Math.max(0, centerX - mountainSize); x < Math.min(size, centerX + mountainSize); x++) {
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                if (distance < mountainSize) {
                    map[y][x].type = 'mountain';
                }
            }
        }
    }
}

// Add terrain variation (forests, hills, etc.)
function addTerrainVariation(map, size, rng) {
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (map[y][x].type === 'plains') {
                const rand = rng();
                if (rand < 0.2) {
                    map[y][x].type = 'forest';
                } else if (rand < 0.3) {
                    map[y][x].type = 'hills';
                }
            }
        }
    }
}

// Add resources to the map
function addResources(map, size, density, rng) {
    let resourceFrequency;
    
    // Set resource frequency based on density setting
    switch (density) {
        case 'sparse': resourceFrequency = 0.05; break;
        case 'standard': resourceFrequency = 0.1; break;
        case 'abundant': resourceFrequency = 0.15; break;
        case 'rich': resourceFrequency = 0.25; break;
        default: resourceFrequency = 0.1; // Default to standard
    }
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (rng() < resourceFrequency) {
                // Choose a resource type appropriate for the terrain
                addResourceToTile(map[y][x], rng);
            }
        }
    }
}

// Add a resource to a specific tile based on terrain
function addResourceToTile(tile, rng) {
    const terrainType = tile.type;
    let possibleResources = [];
    
    // Define resources by terrain type
    if (terrainType === 'plains' || terrainType === 'grass') {
        possibleResources = ['food', 'horses'];
    } else if (terrainType === 'forest') {
        possibleResources = ['wood', 'food', 'fur'];
    } else if (terrainType === 'hills') {
        possibleResources = ['stone', 'iron', 'gold'];
    } else if (terrainType === 'mountain') {
        possibleResources = ['stone', 'iron', 'gold'];
    } else if (terrainType === 'desert') {
        possibleResources = ['stone', 'gold'];
    } else if (terrainType === 'water') {
        possibleResources = ['fish'];
    }
    
    if (possibleResources.length > 0) {
        const resourceType = possibleResources[Math.floor(rng() * possibleResources.length)];
        tile.resourceType = resourceType;
        tile.resourceAmount = 10 + Math.floor(rng() * 20); // Random amount between 10-30
    }
}

// Place starting units for players
function placePlayerStartingUnits(gameState, map, size, rng) {
    // Create a settler and warrior for each player
    for (let i = 0; i < gameState.players.length; i++) {
        const startPos = findPlayerStartPosition(gameState, i, map, size, rng);
        
        // Place settler
        map[startPos.y][startPos.x].unit = {
            type: 'settler',
            owner: i + 1,
            x: startPos.x,
            y: startPos.y,
            health: 100,
            remainingMP: 2,
            canMove: true
        };
        
        // Find a nearby tile for warrior
        const adjacentTiles = getAdjacentTiles(startPos.x, startPos.y, size);
        let warriorPos = null;
        
        for (const tile of adjacentTiles) {
            if (map[tile.y][tile.x].type !== 'water' && !map[tile.y][tile.x].unit) {
                warriorPos = tile;
                break;
            }
        }
        
        // If no adjacent tile found, skip warrior
        if (warriorPos) {
            map[warriorPos.y][warriorPos.x].unit = {
                type: 'warrior',
                owner: i + 1,
                x: warriorPos.x,
                y: warriorPos.y,
                health: 100,
                remainingMP: 2,
                canMove: true
            };
        }
    }
}

// Find a suitable starting position for a player
function findPlayerStartPosition(gameState, playerIndex, map, size, rng) {
    // Try to find a nice starting position
    let attempts = 0;
    let bestPos = null;
    let bestScore = -1;
    
    while (attempts < 100) {
        const x = Math.floor(rng() * size);
        const y = Math.floor(rng() * size);
        
        // Skip water tiles
        if (map[y][x].type === 'water') {
            attempts++;
            continue;
        }
        
        // Calculate position score based on resources and terrain
        let score = 0;
        
        // Check surrounding tiles
        const surroundingTiles = getSurroundingTiles(x, y, 3, size);
        for (const tile of surroundingTiles) {
            if (map[tile.y][tile.x].type !== 'water') score += 1;
            if (map[tile.y][tile.x].type === 'plains') score += 1;
            if (map[tile.y][tile.x].type === 'forest') score += 2;
            if (map[tile.y][tile.x].resourceType) score += 3;
        }
        
        // Keep the best position
        if (score > bestScore) {
            bestScore = score;
            bestPos = {x, y};
        }
        
        attempts++;
    }
    
    // If no good position found, just pick a random valid one
    if (!bestPos) {
        while (true) {
            const x = Math.floor(rng() * size);
            const y = Math.floor(rng() * size);
            if (map[y][x].type !== 'water') {
                bestPos = {x, y};
                break;
            }
        }
    }
    
    return bestPos;
}

// Get adjacent tiles to a position (square grid)
function getAdjacentTiles(x, y, size) {
    const adjacent = [];
    const directions = [
        {dx: 1, dy: 0}, {dx: -1, dy: 0}, 
        {dx: 0, dy: 1}, {dx: 0, dy: -1},
        {dx: 1, dy: 1}, {dx: -1, dy: -1}, 
        {dx: 1, dy: -1}, {dx: -1, dy: 1} // All 8 directions for square grid
    ];
    
    for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            adjacent.push({x: nx, y: ny});
        }
    }
    
    return adjacent;
}

// Get surrounding tiles within a radius
function getSurroundingTiles(x, y, radius, size) {
    const surrounding = [];
    
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                if (dx !== 0 || dy !== 0) { // Don't include the center tile
                    surrounding.push({x: nx, y: ny});
                }
            }
        }
    }
    
    return surrounding;
}

export function revealArea(gameState, centerX, centerY, radius, playerIndex) {
    const size = gameState.mapSize;
    
    // Use square distance for grid
    for (let y = Math.max(0, centerY - radius); y <= Math.min(size - 1, centerY + radius); y++) {
        for (let x = Math.max(0, centerX - radius); x <= Math.min(size - 1, centerX + radius); x++) {
            if (Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) <= radius) {
                if (y >= 0 && y < gameState.map.length && x >= 0 && x < gameState.map[y].length) {
                    gameState.map[y][x].discovered[playerIndex] = true;
                }
            }
        }
    }
}
