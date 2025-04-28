// Map sizes will be determined by settings rather than fixed constants
const DEFAULT_MAP_SIZE = 30;

import { 
  resourcesByAge, 
  getSimpleResourcesByAge, 
  resourceTileTypes, 
  resourceHotspots,
  resourceDistributions
} from './resources.js';
import { terrainTypes } from './terrain.js';
import { unitTypes } from './units.js';

/**
 * Create the base terrain using simplified noise
 * @param {Object} gameState - The game state
 */
function createBaseTerrain(gameState) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  const mapType = gameState.mapType || 'continents';
  
  // Initialize the map with plains
  for (let y = 0; y < mapSize; y++) {
    const row = [];
    for (let x = 0; x < mapSize; x++) {
      row.push({ 
        type: 'plains', 
        x: x, 
        y: y, 
        unit: null, 
        building: null,
        discovered: [false, false],
        resourceAmount: 0,
        resourceQuality: 'standard', // Default resource quality
        hotspot: false // Whether this tile is part of a resource hotspot
      });
    }
    gameState.map.push(row);
  }
  
  // Generate terrain based on selected map type
  switch(mapType) {
    case 'archipelago':
      generateArchipelagoMap(gameState);
      break;
    case 'pangaea':
      generatePangaeaMap(gameState);
      break;
    case 'highlands':
      generateHighlandsMap(gameState);
      break;
    case 'desert':
      generateDesertMap(gameState);
      break;
    default:
      generateContinentsMap(gameState); // Default map type
  }
}

/**
 * Generate a continents-style map (default)
 * @param {Object} gameState - The game state
 */
function generateContinentsMap(gameState) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  
  // Create water bodies
  const waterSeeds = Math.floor(mapSize / 5);
  for (let i = 0; i < waterSeeds; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 3 + Math.floor(Math.random() * 5);
    createTerrainFeature(gameState.map, x, y, size, 'water', mapSize);
  }
  
  // Create mountains
  const mountainSeeds = Math.floor(mapSize / 8);
  for (let i = 0; i < mountainSeeds; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 2 + Math.floor(Math.random() * 3);
    createTerrainFeature(gameState.map, x, y, size, 'mountain', mapSize);
  }
  
  // Create forests
  const forestSeeds = Math.floor(mapSize / 3);
  for (let i = 0; i < forestSeeds; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 2 + Math.floor(Math.random() * 4);
    createTerrainFeature(gameState.map, x, y, size, 'forest', mapSize);
  }
  
  // Create hills
  const hillsSeeds = Math.floor(mapSize / 4);
  for (let i = 0; i < hillsSeeds; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 2 + Math.floor(Math.random() * 3);
    createTerrainFeature(gameState.map, x, y, size, 'hills', mapSize);
  }
  
  // Create desert regions
  const desertSeeds = Math.floor(mapSize / 10);
  for (let i = 0; i < desertSeeds; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 3 + Math.floor(Math.random() * 4);
    createTerrainFeature(gameState.map, x, y, size, 'desert', mapSize);
  }
}

/**
 * Generate an archipelago map with lots of islands
 * @param {Object} gameState - The game state
 */
function generateArchipelagoMap(gameState) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  
  // Fill most of the map with water
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      if (Math.random() < 0.75) { // 75% of the map is water
        gameState.map[y][x].type = 'water';
      }
    }
  }
  
  // Create islands
  const islandCount = Math.floor(mapSize / 3);
  for (let i = 0; i < islandCount; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const islandSize = 2 + Math.floor(Math.random() * 3);
    
    // Create land
    createTerrainFeature(gameState.map, x, y, islandSize, 'plains', mapSize);
    
    // Add some forest to each island
    if (Math.random() > 0.3) {
      createTerrainFeature(gameState.map, x, y, islandSize / 2, 'forest', mapSize);
    }
    
    // Add some mountains to some islands
    if (Math.random() > 0.6) {
      createTerrainFeature(gameState.map, x, y, 1, 'mountain', mapSize);
    }
  }
}

/**
 * Generate a Pangaea map with one large land mass
 * @param {Object} gameState - The game state
 */
function generatePangaeaMap(gameState) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  
  // Start with a water border around the map
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      if (x < 3 || x >= mapSize - 3 || y < 3 || y >= mapSize - 3) {
        gameState.map[y][x].type = 'water';
      }
    }
  }
  
  // Create a central continent
  const centerX = Math.floor(mapSize / 2);
  const centerY = Math.floor(mapSize / 2);
  const continentSize = Math.floor(mapSize * 0.7);
  
  createTerrainFeature(gameState.map, centerX, centerY, continentSize, 'plains', mapSize);
  
  // Add mountains in a ridge
  const mountainCount = Math.floor(mapSize / 5);
  const mountainStartX = centerX - Math.floor(mapSize / 6);
  const mountainStartY = centerY - Math.floor(mapSize / 6);
  
  for (let i = 0; i < mountainCount; i++) {
    const offsetX = Math.floor(Math.random() * (mapSize / 3));
    const offsetY = Math.floor(Math.random() * (mapSize / 3));
    const x = mountainStartX + offsetX;
    const y = mountainStartY + offsetY;
    
    createTerrainFeature(gameState.map, x, y, 2, 'mountain', mapSize);
  }
  
  // Add forests
  const forestCount = Math.floor(mapSize / 2);
  for (let i = 0; i < forestCount; i++) {
    const offsetX = Math.floor(Math.random() * mapSize) - Math.floor(mapSize / 2);
    const offsetY = Math.floor(Math.random() * mapSize) - Math.floor(mapSize / 2);
    const x = centerX + offsetX;
    const y = centerY + offsetY;
    
    if (x >= 0 && x < mapSize && y >= 0 && y < mapSize && gameState.map[y][x].type === 'plains') {
      createTerrainFeature(gameState.map, x, y, 2 + Math.floor(Math.random() * 3), 'forest', mapSize);
    }
  }
  
  // Add some hills
  const hillsCount = Math.floor(mapSize / 3);
  for (let i = 0; i < hillsCount; i++) {
    const offsetX = Math.floor(Math.random() * mapSize) - Math.floor(mapSize / 2);
    const offsetY = Math.floor(Math.random() * mapSize) - Math.floor(mapSize / 2);
    const x = centerX + offsetX;
    const y = centerY + offsetY;
    
    if (x >= 0 && x < mapSize && y >= 0 && y < mapSize && gameState.map[y][x].type === 'plains') {
      createTerrainFeature(gameState.map, x, y, 2, 'hills', mapSize);
    }
  }
}

/**
 * Generate a highlands map with lots of mountains and hills
 * @param {Object} gameState - The game state
 */
function generateHighlandsMap(gameState) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  
  // Create many mountain ranges
  const mountainRanges = Math.floor(mapSize / 6);
  for (let i = 0; i < mountainRanges; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 4 + Math.floor(Math.random() * 4);
    createTerrainFeature(gameState.map, x, y, size, 'mountain', mapSize);
  }
  
  // Create hills around the mountains
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      if (gameState.map[y][x].type === 'plains') {
        // Check if there are mountains nearby
        const surroundingTiles = getSurroundingTiles(gameState.map, x, y, mapSize);
        const nearbyMountains = surroundingTiles.filter(tile => tile.type === 'mountain').length;
        
        if (nearbyMountains > 0 && Math.random() < 0.7) {
          gameState.map[y][x].type = 'hills';
        }
      }
    }
  }
  
  // Add some water bodies (lakes)
  const lakeCount = Math.floor(mapSize / 8);
  for (let i = 0; i < lakeCount; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 1 + Math.floor(Math.random() * 2);
    createTerrainFeature(gameState.map, x, y, size, 'water', mapSize);
  }
  
  // Add some forests at lower elevations
  const forestCount = Math.floor(mapSize / 4);
  for (let i = 0; i < forestCount; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    
    if (gameState.map[y][x].type === 'plains') {
      const size = 2 + Math.floor(Math.random() * 3);
      createTerrainFeature(gameState.map, x, y, size, 'forest', mapSize);
    }
  }
}

/**
 * Generate a desert world with sparse resources
 * @param {Object} gameState - The game state
 */
function generateDesertMap(gameState) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  
  // Set most of the map to desert
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      gameState.map[y][x].type = 'desert';
    }
  }
  
  // Create oases (small water bodies)
  const oasisCount = Math.floor(mapSize / 10);
  for (let i = 0; i < oasisCount; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 1;
    createTerrainFeature(gameState.map, x, y, size, 'water', mapSize);
    
    // Add plains around oases
    createTerrainFeature(gameState.map, x, y, 2, 'plains', mapSize);
  }
  
  // Add scattered plains for some variety
  const plainsPatches = Math.floor(mapSize / 6);
  for (let i = 0; i < plainsPatches; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 1 + Math.floor(Math.random() * 2);
    createTerrainFeature(gameState.map, x, y, size, 'plains', mapSize);
  }
  
  // Add a few hills and mountains
  const hillsCount = Math.floor(mapSize / 8);
  for (let i = 0; i < hillsCount; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 1 + Math.floor(Math.random() * 2);
    createTerrainFeature(gameState.map, x, y, size, 'hills', mapSize);
  }
  
  const mountainCount = Math.floor(mapSize / 12);
  for (let i = 0; i < mountainCount; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 1;
    createTerrainFeature(gameState.map, x, y, size, 'mountain', mapSize);
  }
}

/**
 * Create a terrain feature using a simple cellular automata approach
 * @param {Array} map - The game map
 * @param {Number} centerX - X coordinate of the feature center
 * @param {Number} centerY - Y coordinate of the feature center
 * @param {Number} size - Size of the feature
 * @param {String} terrainType - Type of terrain to create
 * @param {Number} mapSize - Size of the map
 */
function createTerrainFeature(map, centerX, centerY, size, terrainType, mapSize) {
  // Start with the center tile
  if (centerX >= 0 && centerX < mapSize && centerY >= 0 && centerY < mapSize) {
    map[centerY][centerX].type = terrainType;
  }
  
  // Create a cloud of terrain around the center
  for (let i = 0; i < size * 3; i++) {
    // Random point around the center
    const offsetX = Math.floor(Math.random() * size * 2) - size;
    const offsetY = Math.floor(Math.random() * size * 2) - size;
    
    const x = centerX + offsetX;
    const y = centerY + offsetY;
    
    // Check if coordinates are within bounds
    if (x >= 0 && x < mapSize && y >= 0 && y < mapSize) {
      // Distance from center affects probability
      const dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      const probability = 1 - (dist / size);
      
      if (Math.random() < probability) {
        map[y][x].type = terrainType;
      }
    }
  }
}

/**
 * Post-process the terrain to make it more structured and playable
 * @param {Object} gameState - The game state
 */
function structureTerrain(gameState) {
  const map = gameState.map;
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  
  // Create transition zones between terrain types
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = map[y][x];
      
      // Check surrounding tiles
      const neighbors = getSurroundingTiles(map, x, y, mapSize);
      const neighborTypes = neighbors.map(t => t.type);
      
      // Create hills as transition between plains and mountains
      if (tile.type === 'plains' && neighborTypes.includes('mountain') && Math.random() < 0.8) {
        tile.type = 'hills';
      }
      
      // Create shallow water near land
      if (tile.type === 'water' && 
          (neighborTypes.includes('plains') || 
           neighborTypes.includes('desert') || 
           neighborTypes.includes('forest'))) {
        // Flag as shallow water (could be used later for gameplay mechanics)
        tile.isShallowWater = true;
      }
    }
  }
}

/**
 * Add roads to connect important areas
 * @param {Object} gameState - The game state
 */
function addRoads(gameState) {
  const map = gameState.map;
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  const activePlayerCount = getActivePlayerCount(gameState);
  
  // Use starting positions for road connections
  const startPositions = gameState.startingPositions;
  if (!startPositions || startPositions.length < 2) return;
  
  // Create roads between starting positions
  for (let i = 0; i < startPositions.length - 1; i++) {
    const from = startPositions[i];
    
    // Connect to the next position
    const to = startPositions[i + 1];
    
    // Create road between these two positions
    const path = findPath(map, from.x, from.y, to.x, to.y, mapSize);
    
    // Create roads along the path
    for (const point of path) {
      // Only place roads on land
      if (map[point.y][point.x].type !== 'water' && 
          map[point.y][point.x].type !== 'mountain') {
        map[point.y][point.x].type = 'road';
      }
    }
  }
  
  // For more than 2 players, create a central road network connecting all start positions
  if (activePlayerCount > 2) {
    // Find center of the map
    const centerX = Math.floor(mapSize / 2);
    const centerY = Math.floor(mapSize / 2);
    
    // Connect each starting position to the center
    for (let i = 0; i < startPositions.length; i++) {
      const pos = startPositions[i];
      const path = findPath(map, pos.x, pos.y, centerX, centerY, mapSize);
      
      // Create roads along the path
      for (const point of path) {
        // Only place roads on land
        if (map[point.y][point.x].type !== 'water' && 
            map[point.y][point.x].type !== 'mountain') {
          map[point.y][point.x].type = 'road';
        }
      }
    }
  }
}

/**
 * Simple A* pathfinding to create roads
 * @param {Array} map - The game map
 * @param {Number} startX - Starting X coordinate
 * @param {Number} startY - Starting Y coordinate
 * @param {Number} endX - Ending X coordinate
 * @param {Number} endY - Ending Y coordinate
 * @param {Number} mapSize - Size of the map
 * @returns {Array} - Array of points forming the path
 */
function findPath(map, startX, startY, endX, endY, mapSize) {
  // Simplified path for now - just a direct line
  const path = [];
  const dx = endX - startX;
  const dy = endY - startY;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(startX + (dx * i / steps));
    const y = Math.round(startY + (dy * i / steps));
    
    if (x >= 0 && x < mapSize && y >= 0 && y < mapSize) {
      path.push({x, y});
    }
  }
  
  return path;
}

/**
 * Get all surrounding tiles of a given position
 * @param {Array} map - The game map
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {Number} mapSize - Size of the map
 * @returns {Array} - Array of surrounding tiles
 */
function getSurroundingTiles(map, x, y, mapSize) {
  const surrounding = [];
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];
  
  for (const [dx, dy] of directions) {
    const newX = x + dx;
    const newY = y + dy;
    
    if (newX >= 0 && newX < mapSize && newY >= 0 && newY < mapSize) {
      surrounding.push(map[newY][newX]);
    }
  }
  
  return surrounding;
}

/**
 * Place starting positions and HQs for players
 * @param {Object} gameState - The game state
 */
function placeStartingPositions(gameState) {
  const map = gameState.map;
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  const activePlayerCount = getActivePlayerCount(gameState);
  
  // Initialize starting positions array
  gameState.startingPositions = [];
  
  // Calculate positions based on number of players
  const startingPositions = calculateStartingPositions(mapSize, activePlayerCount);
  
  // Store starting positions in gameState for reference
  gameState.startingPositions = startingPositions;
  
  // Make sure all starting areas are suitable
  for (const position of startingPositions) {
    ensureSuitableStartingArea(map, position.x, position.y, mapSize);
  }
}

/**
 * Calculate evenly distributed starting positions for the given number of players
 * @param {Number} mapSize - Size of the map
 * @param {Number} playerCount - Number of active players
 * @returns {Array} - Array of position objects
 */
function calculateStartingPositions(mapSize, playerCount) {
  const positions = [];
  const margin = Math.max(3, Math.floor(mapSize * 0.1));
  
  if (playerCount <= 2) {
    // For 1-2 players, place in opposite corners
    positions.push({ x: margin, y: margin }); // Player 1 (human)
    positions.push({ x: mapSize - margin - 1, y: mapSize - margin - 1 }); // Player 2
  }
  else if (playerCount === 3) {
    // For 3 players, place in triangle formation
    positions.push({ x: margin, y: margin }); // Player 1 (human)
    positions.push({ x: mapSize - margin - 1, y: margin }); // Player 2
    positions.push({ x: Math.floor(mapSize / 2), y: mapSize - margin - 1 }); // Player 3
  }
  else if (playerCount === 4) {
    // For 4 players, place in all four corners
    positions.push({ x: margin, y: margin }); // Player 1 (human)
    positions.push({ x: mapSize - margin - 1, y: margin }); // Player 2
    positions.push({ x: margin, y: mapSize - margin - 1 }); // Player 3
    positions.push({ x: mapSize - margin - 1, y: mapSize - margin - 1 }); // Player 4
  }
  else if (playerCount === 5) {
    // For 5 players, place in pentagon formation
    const centerX = Math.floor(mapSize / 2);
    const centerY = Math.floor(mapSize / 2);
    const radius = Math.floor(mapSize * 0.4);
    
    // Calculate positions in a circle
    positions.push({ x: margin, y: margin }); // Player 1 (human) at top-left
    positions.push({ x: mapSize - margin - 1, y: margin }); // Player 2 at top-right
    positions.push({ x: margin, y: mapSize - margin - 1 }); // Player 3 at bottom-left
    positions.push({ x: mapSize - margin - 1, y: mapSize - margin - 1 }); // Player 4 at bottom-right
    positions.push({ x: centerX, y: centerY }); // Player 5 at center
  }
  else {
    // For 6 players, place in hexagon formation
    const centerX = Math.floor(mapSize / 2);
    const centerY = Math.floor(mapSize / 2);
    const radius = Math.floor(mapSize * 0.4);
    
    positions.push({ x: margin, y: margin }); // Player 1 (human) at top-left
    positions.push({ x: mapSize - margin - 1, y: margin }); // Player 2 at top-right
    positions.push({ x: margin, y: centerY }); // Player 3 at middle-left
    positions.push({ x: mapSize - margin - 1, y: centerY }); // Player 4 at middle-right
    positions.push({ x: margin, y: mapSize - margin - 1 }); // Player 5 at bottom-left
    positions.push({ x: mapSize - margin - 1, y: mapSize - margin - 1 }); // Player 6 at bottom-right
  }
  
  return positions;
}

/**
 * Ensure the starting area is suitable (plains, no water/mountains)
 * @param {Array} map - The game map
 * @param {Number} centerX - X coordinate of starting position
 * @param {Number} centerY - Y coordinate of starting position
 * @param {Number} mapSize - Size of the map
 */
function ensureSuitableStartingArea(map, centerX, centerY, mapSize) {
  for (let y = centerY - 3; y <= centerY + 3; y++) {
    for (let x = centerX - 3; x <= centerX + 3; x++) {
      if (x >= 0 && y >= 0 && x < mapSize && y < mapSize) {
        // Core starting area is always plains
        if (Math.abs(x - centerX) <= 1 && Math.abs(y - centerY) <= 1) {
          map[y][x].type = 'plains';
        }
        // No mountains or water too close to start
        else if (Math.abs(x - centerX) <= 2 && Math.abs(y - centerY) <= 2) {
          if (map[y][x].type === 'mountain' || map[y][x].type === 'water') {
            map[y][x].type = 'plains';
          }
        }
      }
    }
  }
}

/**
 * Get the number of active players in the game
 * @param {Object} gameState - The game state
 * @returns {Number} - Number of active players
 */
function getActivePlayerCount(gameState) {
  // Count the number of active players
  let count = 1; // Human player is always active
  
  // Add AI players if specified
  if (gameState.aiPlayerCount) {
    count += gameState.aiPlayerCount;
  }
  
  return Math.min(count, gameState.maxPlayers || 6);
}

/**
 * Complete map generation by placing HQs, units and revealing areas
 * @param {Object} gameState - The game state
 * @returns {Object} - Updated game state
 */
function finalizeMap(gameState) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  const activePlayerCount = getActivePlayerCount(gameState);
  
  // Use stored starting positions or default fallback positions
  const startPositions = gameState.startingPositions || [
    { x: 3, y: 3 },
    { x: mapSize - 4, y: mapSize - 4 }
  ];
  
  // Setup each active player
  for (let i = 0; i < activePlayerCount && i < gameState.players.length; i++) {
    if (i >= startPositions.length) break; // Safety check for positions
    
    const player = gameState.players[i];
    const pos = startPositions[i];
    
    // Skip inactive players
    if (player.inactive) continue;
    
    // Place HQ for this player
    gameState.map[pos.y][pos.x].building = { type: 'hq', owner: player.id };
    player.buildings.push({ type: 'hq', x: pos.x, y: pos.y });
    
    // Determine unit position (alternates between south and north of HQ based on player index)
    let unitX = pos.x;
    let unitY = i % 2 === 0 ? pos.y + 1 : pos.y - 1;
    
    // Make sure unit position is within map bounds
    if (unitY < 0) unitY = 0;
    if (unitY >= mapSize) unitY = mapSize - 1;
    
    // Create starting unit
    const newUnit = { 
      type: 'clubman', 
      owner: player.id, 
      x: unitX, 
      y: unitY, 
      health: 100,
      canMove: true,
      remainingMP: unitTypes['clubman'].move,
      isEmbarked: false,
      startingX: unitX,  // Store starting position for cavalry charge calculations
      startingY: unitY
    };
    
    // Add unit to map and player
    gameState.map[unitY][unitX].unit = newUnit;
    player.units.push(newUnit);
    
    // Reveal area around HQ for this player
    revealArea(gameState, pos.x, pos.y, 4, i);
  }

  return gameState;
}

// Complete map generation process
export function generateMap(gameState) {
  gameState.map = [];
  
  // Create base terrain
  createBaseTerrain(gameState);
  
  // Structure the terrain
  structureTerrain(gameState);
  
  // Create resource hotspots
  createResourceHotspots(gameState);
  
  // Place starting positions and ensure they're suitable
  placeStartingPositions(gameState);
  
  // Add resource nodes appropriate for the initial age
  addResourceNodes(gameState);
  
  // Place HQs and units
  finalizeMap(gameState);
  
  return gameState;
}

/**
 * Create resource hotspot areas that will have increased resource density
 * @param {Object} gameState - The game state
 */
function createResourceHotspots(gameState) {
  const map = gameState.map;
  const hotspots = [];
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  const resourceDensity = gameState.resourceDensity || 'standard';
  
  // Adjust number of hotspots based on resource density setting
  let maxHotspots = resourceHotspots.maxHotspots;
  switch(resourceDensity) {
    case 'sparse':
      maxHotspots = Math.max(2, Math.floor(resourceHotspots.maxHotspots * 0.6));
      break;
    case 'abundant':
      maxHotspots = Math.min(12, Math.floor(resourceHotspots.maxHotspots * 1.5));
      break;
    case 'rich':
      maxHotspots = Math.min(15, Math.floor(resourceHotspots.maxHotspots * 2));
      break;
  }
  
  const minDistance = resourceHotspots.minDistance;
  const radius = resourceHotspots.radius;
  
  // Create strategic resource hotspots with increased resource density
  for (let i = 0; i < maxHotspots; i++) {
    let attempts = 0;
    let validSpot = false;
    let x, y;
    
    // Try to find a suitable location
    while (!validSpot && attempts < 50) {
      attempts++;
      x = Math.floor(Math.random() * mapSize);
      y = Math.floor(Math.random() * mapSize);
      
      // Check minimum distance from other hotspots
      validSpot = true;
      for (const spot of hotspots) {
        const dist = Math.sqrt(Math.pow(x - spot.x, 2) + Math.pow(y - spot.y, 2));
        if (dist < minDistance) {
          validSpot = false;
          break;
        }
      }
      
      // Ensure not too close to starting positions (these positions will be adjusted based on map size)
      const startPosMargin = Math.max(3, Math.floor(mapSize * 0.1));
      const distToStart1 = Math.sqrt(Math.pow(x - startPosMargin, 2) + Math.pow(y - startPosMargin, 2));
      const distToStart2 = Math.sqrt(Math.pow(x - (mapSize - startPosMargin), 2) + Math.pow(y - (mapSize - startPosMargin), 2));
      
      if (distToStart1 < minDistance / 2 || distToStart2 < minDistance / 2) {
        validSpot = false;
      }
    }
    
    // If we found a good spot, create a hotspot
    if (validSpot) {
      // Add to hotspots list
      hotspots.push({ x, y, radius, type: selectHotspotType() });
      
      // Mark tiles in radius as hotspot
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= radius) {
              gameState.map[ny][nx].hotspot = true;
              gameState.map[ny][nx].hotspotType = hotspots[hotspots.length - 1].type;
            }
          }
        }
      }
    }
  }
  
  // Store hotspots in gameState for reference
  gameState.resourceHotspots = hotspots;
}

/**
 * Select a resource cluster type for a hotspot
 * @returns {Object} - Selected cluster type
 */
function selectHotspotType() {
  const clusters = resourceDistributions.clusters;
  return clusters[Math.floor(Math.random() * clusters.length)];
}

/**
 * Add resource nodes to the map based on current age
 * @param {Object} gameState - The game state
 */
export function addResourceNodes(gameState) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  
  // Clear existing resource nodes first
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = gameState.map[y][x];
      if (Object.keys(resourceTileTypes).includes(tile.type)) {
        tile.type = 'plains'; // Reset to plains
        tile.resourceAmount = 0;
        tile.resourceQuality = 'standard';
      }
    }
  }
  
  // Get the current player's age
  const currentPlayer = gameState.players[gameState.currentPlayer - 1];
  const currentAge = currentPlayer.age;
  
  // Define which resources to add based on age
  const availableResources = getSimpleResourcesByAge(currentAge);
  
  // First place strategic resources at hotspots
  if (gameState.resourceHotspots && gameState.resourceHotspots.length > 0) {
    placeHotspotResources(gameState, availableResources);
  }
  
  // Then scatter other resources across the map
  placeScatteredResources(gameState, availableResources);
}

/**
 * Place resources at designated hotspot areas
 * @param {Object} gameState - The game state 
 * @param {Array} availableResources - Resources available in the current age
 */
function placeHotspotResources(gameState, availableResources) {
  for (const hotspot of gameState.resourceHotspots) {
    const hotspotType = hotspot.type;
    const resourcesForCluster = hotspotType.resources.filter(r => availableResources.includes(r));
    
    // Skip if no resources are available for this cluster in current age
    if (resourcesForCluster.length === 0) continue;
    
    // Place strategic resources at the hotspot
    const nodesToPlace = 3 + Math.floor(Math.random() * 3); // 3-5 nodes per hotspot
    
    for (let i = 0; i < nodesToPlace; i++) {
      // Choose a resource from this cluster's available resources
      const resourceType = resourcesForCluster[Math.floor(Math.random() * resourcesForCluster.length)];
      let placed = false;
      let attempts = 0;
      
      // Try to place the resource node within the hotspot
      while (!placed && attempts < 20) {
        attempts++;
        
        // Random point within hotspot radius
        const offsetX = Math.floor(Math.random() * (hotspot.radius * 2)) - hotspot.radius;
        const offsetY = Math.floor(Math.random() * (hotspot.radius * 2)) - hotspot.radius;
        
        const x = hotspot.x + offsetX;
        const y = hotspot.y + offsetY;
        
        // Check if coordinates are valid
        if (x >= 0 && x < (gameState.mapSize || DEFAULT_MAP_SIZE) && 
            y >= 0 && y < (gameState.mapSize || DEFAULT_MAP_SIZE)) {
          const tile = gameState.map[y][x];
          const resourceInfo = resourceTileTypes[resourceType];
          
          // Check if tile is suitable for this resource
          if (resourceInfo && resourceInfo.terrainRequirements) {
            if (resourceInfo.terrainRequirements.includes(tile.type)) {
              // Resource quality is usually better in hotspots
              const quality = determineResourceQuality(true, gameState.resourceDensity);
              const maxAmount = resourceInfo.qualityLevels[quality].maxAmount;
              
              tile.type = resourceType;
              tile.resourceAmount = Math.floor(maxAmount * 0.7) + Math.floor(Math.random() * (maxAmount * 0.3));
              tile.resourceQuality = quality;
              placed = true;
            }
          }
        }
      }
    }
  }
}

/**
 * Place scattered resources across the map
 * @param {Object} gameState - The game state 
 * @param {Array} availableResources - Resources available in the current age
 */
function placeScatteredResources(gameState, availableResources) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  const resourceDensity = gameState.resourceDensity || 'standard';
  
  // Adjust number of resources based on density setting
  let baseNodeCount = 15 + Math.floor(availableResources.length * 2);
  
  switch(resourceDensity) {
    case 'sparse':
      baseNodeCount = Math.floor(baseNodeCount * 0.6);
      break;
    case 'abundant':
      baseNodeCount = Math.floor(baseNodeCount * 1.5);
      break;
    case 'rich':
      baseNodeCount = Math.floor(baseNodeCount * 2.5);
      break;
  }
  
  const nodesToPlace = baseNodeCount;
  
  for (let i = 0; i < nodesToPlace; i++) {
    const resourceType = availableResources[Math.floor(Math.random() * availableResources.length)];
    let placed = false;
    let attempts = 0;
    
    // Try to place the resource node
    while (!placed && attempts < 50) {
      attempts++;
      const x = Math.floor(Math.random() * mapSize);
      const y = Math.floor(Math.random() * mapSize);
      const tile = gameState.map[y][x];
      const resourceInfo = resourceTileTypes[resourceType];
      
      // Skip if tile is already a resource or is in a hotspot
      if (Object.keys(resourceTileTypes).includes(tile.type) || tile.hotspot) {
        continue;
      }
      
      // Check if tile is suitable for this resource
      if (resourceInfo && resourceInfo.terrainRequirements) {
        if (resourceInfo.terrainRequirements.includes(tile.type)) {
          // Determine resource quality based on resource density setting
          const quality = determineResourceQuality(false, resourceDensity);
          const maxAmount = resourceInfo.qualityLevels[quality].maxAmount;
          
          // Adjust resource amount based on density
          let multiplier = 0.6;
          if (resourceDensity === 'abundant') multiplier = 0.7;
          if (resourceDensity === 'rich') multiplier = 0.8;
          
          tile.type = resourceType;
          tile.resourceAmount = Math.floor(maxAmount * multiplier) + 
                               Math.floor(Math.random() * (maxAmount * (1 - multiplier)));
          tile.resourceQuality = quality;
          placed = true;
        }
      }
    }
  }
}

/**
 * Determine the quality level of a resource deposit
 * @param {Boolean} inHotspot - Whether the resource is in a hotspot
 * @param {String} resourceDensity - Resource density setting
 * @returns {String} - Quality level: 'poor', 'standard', or 'rich'
 */
function determineResourceQuality(inHotspot, resourceDensity = 'standard') {
  const r = Math.random();
  
  if (inHotspot) {
    // Resources in hotspots are more likely to be rich
    switch(resourceDensity) {
      case 'sparse':
        if (r < 0.3) return 'rich';
        if (r < 0.7) return 'standard';
        return 'poor';
      case 'rich':
        if (r < 0.6) return 'rich';
        if (r < 0.9) return 'standard';
        return 'poor';
      default: // standard or abundant
        if (r < 0.4) return 'rich';
        if (r < 0.8) return 'standard';
        return 'poor';
    }
  } else {
    // Normal distribution of resource quality
    switch(resourceDensity) {
      case 'sparse':
        if (r < 0.1) return 'rich';
        if (r < 0.5) return 'standard';
        return 'poor';
      case 'abundant':
        if (r < 0.3) return 'rich';
        if (r < 0.8) return 'standard';
        return 'poor';
      case 'rich':
        if (r < 0.5) return 'rich';
        if (r < 0.9) return 'standard';
        return 'poor';
      default: // standard
        if (r < 0.2) return 'rich';
        if (r < 0.7) return 'standard';
        return 'poor';
    }
  }
}

// Reveal area around a point
export function revealArea(gameState, centerX, centerY, radius, playerIndex) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  
  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      if (x >= 0 && y >= 0 && x < mapSize && y < mapSize) {
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (dist <= radius) {
          gameState.map[y][x].discovered[playerIndex] = true;
        }
      }
    }
  }
}
