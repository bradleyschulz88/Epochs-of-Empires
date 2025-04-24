import { mapSize } from './constants.js';
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
  
  // Add terrain features using cellular automata-like approach
  
  // Create water bodies
  const waterSeeds = Math.floor(mapSize / 5);
  for (let i = 0; i < waterSeeds; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 3 + Math.floor(Math.random() * 5);
    createTerrainFeature(gameState.map, x, y, size, 'water');
  }
  
  // Create mountains
  const mountainSeeds = Math.floor(mapSize / 8);
  for (let i = 0; i < mountainSeeds; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 2 + Math.floor(Math.random() * 3);
    createTerrainFeature(gameState.map, x, y, size, 'mountain');
  }
  
  // Create forests
  const forestSeeds = Math.floor(mapSize / 3);
  for (let i = 0; i < forestSeeds; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 2 + Math.floor(Math.random() * 4);
    createTerrainFeature(gameState.map, x, y, size, 'forest');
  }
  
  // Create hills
  const hillsSeeds = Math.floor(mapSize / 4);
  for (let i = 0; i < hillsSeeds; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 2 + Math.floor(Math.random() * 3);
    createTerrainFeature(gameState.map, x, y, size, 'hills');
  }
  
  // Create desert regions
  const desertSeeds = Math.floor(mapSize / 10);
  for (let i = 0; i < desertSeeds; i++) {
    const x = Math.floor(Math.random() * mapSize);
    const y = Math.floor(Math.random() * mapSize);
    const size = 3 + Math.floor(Math.random() * 4);
    createTerrainFeature(gameState.map, x, y, size, 'desert');
  }
}

/**
 * Create a terrain feature using a simple cellular automata approach
 * @param {Array} map - The game map
 * @param {Number} centerX - X coordinate of the feature center
 * @param {Number} centerY - Y coordinate of the feature center
 * @param {Number} size - Size of the feature
 * @param {String} terrainType - Type of terrain to create
 */
function createTerrainFeature(map, centerX, centerY, size, terrainType) {
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
  
  // Create transition zones between terrain types
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = map[y][x];
      
      // Check surrounding tiles
      const neighbors = getSurroundingTiles(map, x, y);
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
  
  // For now, just add a basic road connecting player starting locations
  const player1X = 3;
  const player1Y = 3;
  const player2X = mapSize - 4;
  const player2Y = mapSize - 4;
  
  // Simple A* pathfinding to create road
  const path = findPath(map, player1X, player1Y, player2X, player2Y);
  
  // Create roads along the path
  for (const point of path) {
    // Only place roads on land
    if (map[point.y][point.x].type !== 'water' && 
        map[point.y][point.x].type !== 'mountain') {
      map[point.y][point.x].type = 'road';
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
 * @returns {Array} - Array of points forming the path
 */
function findPath(map, startX, startY, endX, endY) {
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
 * @returns {Array} - Array of surrounding tiles
 */
function getSurroundingTiles(map, x, y) {
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
  
  // Define starting locations
  const player1X = 3;
  const player1Y = 3;
  const player2X = mapSize - 4;
  const player2Y = mapSize - 4;
  
  // Ensure starting locations are plains and surroundings are suitable
  for (let y = player1Y - 3; y <= player1Y + 3; y++) {
    for (let x = player1X - 3; x <= player1X + 3; x++) {
      if (x >= 0 && y >= 0 && x < mapSize && y < mapSize) {
        // Core starting area is always plains
        if (Math.abs(x - player1X) <= 1 && Math.abs(y - player1Y) <= 1) {
          map[y][x].type = 'plains';
        }
        // No mountains or water too close to start
        else if (Math.abs(x - player1X) <= 2 && Math.abs(y - player1Y) <= 2) {
          if (map[y][x].type === 'mountain' || map[y][x].type === 'water') {
            map[y][x].type = 'plains';
          }
        }
      }
    }
  }
  
  for (let y = player2Y - 3; y <= player2Y + 3; y++) {
    for (let x = player2X - 3; x <= player2X + 3; x++) {
      if (x >= 0 && y >= 0 && x < mapSize && y < mapSize) {
        // Core starting area is always plains
        if (Math.abs(x - player2X) <= 1 && Math.abs(y - player2Y) <= 1) {
          map[y][x].type = 'plains';
        }
        // No mountains or water too close to start
        else if (Math.abs(x - player2X) <= 2 && Math.abs(y - player2Y) <= 2) {
          if (map[y][x].type === 'mountain' || map[y][x].type === 'water') {
            map[y][x].type = 'plains';
          }
        }
      }
    }
  }
}

/**
 * Complete map generation by placing HQs, units and revealing areas
 * @param {Object} gameState - The game state
 * @returns {Object} - Updated game state
 */
function finalizeMap(gameState) {
  // Define starting locations
  const player1X = 3;
  const player1Y = 3;
  const player2X = mapSize - 4;
  const player2Y = mapSize - 4;
  
  // Place HQs
  gameState.map[player1Y][player1X].building = { type: 'hq', owner: 1 };
  gameState.map[player2Y][player2X].building = { type: 'hq', owner: 2 };
  
  // Add buildings to player lists
  gameState.players[0].buildings.push({ type: 'hq', x: player1X, y: player1Y });
  gameState.players[1].buildings.push({ type: 'hq', x: player2X, y: player2Y });
  
  // Add starting units (1 Clubman) for each player with properly initialized movement
  const player1Unit = { 
    type: 'clubman', 
    owner: 1, 
    x: player1X, 
    y: player1Y + 1, 
    health: 100,
    canMove: true,
    remainingMP: unitTypes['clubman'].move,
    isEmbarked: false
  };
  
  const player2Unit = { 
    type: 'clubman', 
    owner: 2, 
    x: player2X, 
    y: player2Y - 1, 
    health: 100,
    canMove: true,
    remainingMP: unitTypes['clubman'].move,
    isEmbarked: false
  };
  
  // Store starting positions for cavalry charge calculations
  player1Unit.startingX = player1Unit.x;
  player1Unit.startingY = player1Unit.y;
  player2Unit.startingX = player2Unit.x;
  player2Unit.startingY = player2Unit.y;
  
  // Add units to map
  gameState.map[player1Y + 1][player1X].unit = player1Unit;
  gameState.map[player2Y - 1][player2X].unit = player2Unit;
  
  // Add units to player lists
  gameState.players[0].units.push(player1Unit);
  gameState.players[1].units.push(player2Unit);
  
  // Reveal areas around HQs
  revealArea(gameState, player1X, player1Y, 4, 0);
  revealArea(gameState, player2X, player2Y, 4, 1);

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
  
  // Add roads
  addRoads(gameState);
  
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
  const maxHotspots = resourceHotspots.maxHotspots;
  const minDistance = resourceHotspots.minDistance;
  const radius = resourceHotspots.radius;
  
  // Create strategic resource hotspots with increased resource density
  // These will be contested areas that players will want to control
  for (let i = 0; i < maxHotspots; i++) {
    let attempts = 0;
    let validSpot = false;
    let x, y;
    
    // Try to find a suitable location away from other hotspots
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
      
      // Ensure not too close to starting positions
      const distToStart1 = Math.sqrt(Math.pow(x - 3, 2) + Math.pow(y - 3, 2));
      const distToStart2 = Math.sqrt(Math.pow(x - (mapSize - 4), 2) + Math.pow(y - (mapSize - 4), 2));
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
        if (x >= 0 && x < mapSize && y >= 0 && y < mapSize) {
          const tile = gameState.map[y][x];
          const resourceInfo = resourceTileTypes[resourceType];
          
          // Check if tile is suitable for this resource
          if (resourceInfo && resourceInfo.terrainRequirements) {
            if (resourceInfo.terrainRequirements.includes(tile.type)) {
              // Resource quality is usually better in hotspots
              const quality = determineResourceQuality(true);
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
  const nodesToPlace = 15 + Math.floor(availableResources.length * 2); // More resources as ages advance
  
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
          // Determine resource quality
          const quality = determineResourceQuality(false);
          const maxAmount = resourceInfo.qualityLevels[quality].maxAmount;
          
          tile.type = resourceType;
          tile.resourceAmount = Math.floor(maxAmount * 0.6) + Math.floor(Math.random() * (maxAmount * 0.4));
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
 * @returns {String} - Quality level: 'poor', 'standard', or 'rich'
 */
function determineResourceQuality(inHotspot) {
  const r = Math.random();
  
  if (inHotspot) {
    // Resources in hotspots are more likely to be rich
    if (r < 0.4) return 'rich';
    if (r < 0.8) return 'standard';
    return 'poor';
  } else {
    // Normal distribution of resource quality
    if (r < 0.2) return 'rich';
    if (r < 0.7) return 'standard';
    return 'poor';
  }
}

// Reveal area around a point
export function revealArea(gameState, centerX, centerY, radius, playerIndex) {
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
