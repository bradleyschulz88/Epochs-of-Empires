// Import the hex grid module
import { 
  createHexGrid,
  HEX_DIRECTIONS,
  axialToPixel,
  pixelToAxial,
  roundToHex,
  getHexNeighbors,
  hexDistance,
  areHexesAdjacent,
  findHexByAxial
} from './hexgrid.js';

// Import the new map generator module
import { generateMap as generateHexMap } from './mapGenerator.js';

// Map sizes will be determined by settings rather than fixed constants
const DEFAULT_MAP_SIZE = 30;

// Hex grid constants
const HEX_SIZE = 30; // Size of hexagon (distance from center to corner)

// Re-export hex functions for backward compatibility
export { HEX_DIRECTIONS, axialToPixel, pixelToAxial };

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
 * Create the base terrain using hex axial coordinates
 * @param {Object} gameState - The game state
 */
function createBaseTerrain(gameState) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  const mapType = gameState.mapType || 'continents';
  const useNewGenerator = gameState.useNewGenerator || false;
  
  console.log(`Creating base terrain for map type: ${mapType}, size: ${mapSize}`);
  console.log(`Using new hex-based generator: ${useNewGenerator}`);
  
  // Clear existing map
  gameState.map = [];
  
  // Calculate effective radius for a hexagonal map
  const effectiveRadius = Math.floor(mapSize / 2);
  
  // Store map properties
  gameState.mapRadius = effectiveRadius;
  gameState.usingHexGrid = true;
  
  // Use the new hex-based map generator if requested
  if (useNewGenerator) {
    console.log("Using new hex-based map generation pipeline");
    return createBaseTerrainWithNewGenerator(gameState);
  }
  
  // Otherwise use the legacy map generation
  console.log(`Creating hex grid with radius: ${effectiveRadius} using legacy generator`);
  
  // Generate the tiles using our reusable createHexGrid function
  const width = mapSize;
  const height = mapSize;
  const origin = [0, 0]; // or adjust as needed
  const tiles = createHexGrid(width, height, HEX_SIZE, origin);
  
  // Filter and organize the tiles to create a hexagonal shape
  for (let r = -effectiveRadius; r <= effectiveRadius; r++) {
    const row = [];
    
    // Calculate bounds for q based on r to create a hexagonal shape
    const qStart = Math.max(-effectiveRadius, -r - effectiveRadius);
    const qEnd = Math.min(effectiveRadius, -r + effectiveRadius);
    
    for (let q = qStart; q <= qEnd; q++) {
      // Calculate array indices (for backward compatibility)
      // We add an offset to ensure all indices are positive
      const arrayX = q + effectiveRadius;
      const arrayY = r + effectiveRadius;
      
      // Find the matching hex from our createHexGrid output
      // or create a new one if not found
      const tile = findHexByAxial(tiles, q + effectiveRadius, r + effectiveRadius) || {
        q: q,
        r: r,
        x: axialToPixel(q, r, HEX_SIZE).x,
        y: axialToPixel(q, r, HEX_SIZE).y,
        neighbors: getHexNeighbors(q, r)
      };
      
      row.push({ 
        type: 'plains',
        // Store both coordinate systems
        x: arrayX,
        y: arrayY,
        // Store canonical axial coordinates
        q: q,
        r: r,
        // Store pixel coordinates for rendering
        pixelX: tile.x,
        pixelY: tile.y,
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
      console.log("Starting archipelago map generation...");
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
      console.log("Using default continents map generation");
      generateContinentsMap(gameState); // Default map type
  }
}

/**
 * Create the base terrain using the new hex-based map generator
 * @param {Object} gameState - The game state
 */
function createBaseTerrainWithNewGenerator(gameState) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  const mapType = gameState.mapType || 'continents';
  
  console.log(`Creating hex grid with new generator, size: ${mapSize}`);
  
  // Generate the tiles using our reusable createHexGrid function
  const width = mapSize;
  const height = mapSize;
  const origin = [0, 0]; // or adjust as needed
  let tiles = createHexGrid(width, height, HEX_SIZE, origin);
  
  // Generate map options based on map type
  const options = {
    seed: gameState.mapSeed || Math.floor(Math.random() * 1000000),
    mountainousness: 1.0,
    wetness: 1.0
  };
  
  // Adjust generation parameters based on map type
  switch(mapType) {
    case 'archipelago':
      options.wetness = 1.5;       // More water
      options.mountainousness = 0.9; 
      break;
    case 'pangaea':
      options.wetness = 0.7;       // Less water
      options.mountainousness = 1.1;
      break;
    case 'highlands':
      options.mountainousness = 1.5; // More mountains
      options.wetness = 0.9;
      break;
    case 'desert':
      options.wetness = 0.5;       // Very dry
      options.mountainousness = 0.8;
      break;
    // Default is balanced (continents)
  }
  
  console.log(`Map generation options:`, options);
  
  // Generate the map using our new pipeline
  tiles = generateHexMap(tiles, options, gameState);
  
  // Convert to the game state's map format (2D array)
  // We'll create a grid format that matches the existing map structure
  // but contains our newly generated hex data
  
  // Calculate effective radius for a hexagonal map
  const effectiveRadius = Math.floor(mapSize / 2);
  
  // Create 2D grid structure
  for (let r = -effectiveRadius; r <= effectiveRadius; r++) {
    const row = [];
    
    // Calculate bounds for q based on r to create a hexagonal shape
    const qStart = Math.max(-effectiveRadius, -r - effectiveRadius);
    const qEnd = Math.min(effectiveRadius, -r + effectiveRadius);
    
    for (let q = qStart; q <= qEnd; q++) {
      // Calculate array indices (for backward compatibility)
      const arrayX = q + effectiveRadius;
      const arrayY = r + effectiveRadius;
      
      // Find the matching hex from our generated tiles
      const tile = findHexByAxial(tiles, q + effectiveRadius, r + effectiveRadius);
      
      if (tile) {
        // Create game map tile from the generated hex
        const mapTile = {
          type: tile.type,
          // Store both coordinate systems
          x: arrayX,
          y: arrayY,
          // Store canonical axial coordinates
          q: q,
          r: r,
          // Store pixel coordinates for rendering
          pixelX: tile.x,
          pixelY: tile.y,
          // Terrain data
          elevation: tile.elevation,
          moisture: tile.moisture,
          terrain: tile.terrain,
          // Resource data
          resource: tile.resource,
          resourceQuality: tile.resourceQuality || 'standard',
          resourceAmount: tile.resource ? 
            (tile.resourceQuality === 'rich' ? 80 : 
             tile.resourceQuality === 'standard' ? 50 : 30) : 0,
          // Game state
          unit: null, 
          building: null,
          discovered: [false, false],
          hotspot: !!tile.hotspot
        };
        
        row.push(mapTile);
      } else {
        // Fallback if tile not found (should not happen)
        row.push({
          type: 'plains',
          x: arrayX,
          y: arrayY,
          q: q,
          r: r,
          pixelX: axialToPixel(q, r, HEX_SIZE).x,
          pixelY: axialToPixel(q, r, HEX_SIZE).y,
          unit: null,
          building: null,
          discovered: [false, false],
          resourceAmount: 0,
          resourceQuality: 'standard',
          hotspot: false
        });
      }
    }
    
    gameState.map.push(row);
  }
  
  console.log(`Created map with ${gameState.map.length} rows using new generator`);
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
  
  console.log("Generating archipelago (island) map of size: " + mapSize);
  
  try {
    // MANDATORY - FIRST MAKE THE ENTIRE MAP WATER
    console.log("Setting entire map to water");
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        gameState.map[y][x].type = 'water';
      }
    }
    
    // Count water tiles to verify
    let waterTiles = 0;
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        if (gameState.map[y][x].type === 'water') {
          waterTiles++;
        }
      }
    }
    console.log(`Initial water tiles: ${waterTiles} out of ${mapSize * mapSize}`);
    
    // Create small islands
    const smallIslandCount = Math.floor(mapSize / 2); // More islands
    console.log(`Creating ${smallIslandCount} small islands`);
    
    for (let i = 0; i < smallIslandCount; i++) {
      const x = Math.floor(Math.random() * mapSize);
      const y = Math.floor(Math.random() * mapSize);
      const islandSize = 2 + Math.floor(Math.random() * 3);
      
      // Create land (plains) for the island - DIRECTLY SET TILES instead of using createTerrainFeature
      const radius = islandSize;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= radius * 0.8) {
              // Core island area
              gameState.map[ny][nx].type = 'plains';
              
              // Add forest to some tiles (30% chance)
              if (Math.random() < 0.3) {
                gameState.map[ny][nx].type = 'forest';
              }
              
              // Add hills to some tiles (20% chance)
              if (Math.random() < 0.2) {
                gameState.map[ny][nx].type = 'hills';
              }
            }
          }
        }
      }
      
      // Verify this island was created by counting non-water tiles
      let landTiles = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
            if (gameState.map[ny][nx].type !== 'water') {
              landTiles++;
            }
          }
        }
      }
      console.log(`Island ${i+1}: Created with approximately ${landTiles} land tiles`);
    }
    
    // Add a few larger islands (2-4 depending on map size)
    const largeIslandCount = 2 + Math.floor(mapSize / 20);
    console.log(`Creating ${largeIslandCount} larger islands`);
    
    for (let i = 0; i < largeIslandCount; i++) {
      const x = Math.floor(Math.random() * mapSize);
      const y = Math.floor(Math.random() * mapSize);
      const islandSize = 4 + Math.floor(Math.random() * 5); // Larger islands
      
      // Create land for the larger island - DIRECTLY SET TILES
      const radius = islandSize;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= radius) {
              // Core island area
              gameState.map[ny][nx].type = 'plains';
              
              // Add forest to some tiles (50% chance)
              if (Math.random() < 0.5) {
                gameState.map[ny][nx].type = 'forest';
              }
              
              // Add hills to some tiles (25% chance)
              if (Math.random() < 0.25) {
                gameState.map[ny][nx].type = 'hills';
              }
              
              // Add mountains to some tiles (10% chance)
              if (Math.random() < 0.1) {
                gameState.map[ny][nx].type = 'mountain';
              }
            }
          }
        }
      }
      
      // Verify this large island was created by counting non-water tiles
      let landTiles = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
            if (gameState.map[ny][nx].type !== 'water') {
              landTiles++;
            }
          }
        }
      }
      console.log(`Large island ${i+1}: Created with approximately ${landTiles} land tiles`);
    }
    
    // Final verification - count water vs. land tiles
    let finalWaterTiles = 0;
    let finalLandTiles = 0;
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        if (gameState.map[y][x].type === 'water') {
          finalWaterTiles++;
        } else {
          finalLandTiles++;
        }
      }
    }
    console.log(`Final map composition: ${finalWaterTiles} water tiles, ${finalLandTiles} land tiles`);
    console.log(`Water percentage: ${(finalWaterTiles / (mapSize * mapSize) * 100).toFixed(1)}%`);
  } catch (error) {
    console.error("Error in archipelago generation:", error);
    // Emergency fallback - ensure we have some islands
    try {
      // Fill with water
      for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
          gameState.map[y][x].type = 'water';
        }
      }
      
      // Create at least a few basic islands
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(Math.random() * mapSize);
        const y = Math.floor(Math.random() * mapSize);
        
        // Simple square island
        const size = 3;
        for (let dy = -size; dy <= size; dy++) {
          for (let dx = -size; dx <= size; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
              gameState.map[ny][nx].type = 'plains';
            }
          }
        }
      }
      
      console.log("Created emergency fallback islands");
    } catch (fallbackError) {
      console.error("Critical error in fallback island generation:", fallbackError);
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
 * Create a terrain feature using a hexagonal approach
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
  
  // Get the center tile's axial coordinates if available
  let centerQ, centerR;
  if (map[centerY][centerX].q !== undefined && map[centerY][centerX].r !== undefined) {
    centerQ = map[centerY][centerX].q;
    centerR = map[centerY][centerX].r;
  } else {
    // Fallback if axial coordinates aren't available
    centerQ = centerX;
    centerR = centerY;
  }
  
  // Create a cloud of terrain around the center using axial coordinates
  for (let i = 0; i < size * 6; i++) {  // More iterations for better coverage
    // Random offset in axial space
    // For proper hex distribution, we need to use axial offsets
    const offsetQ = Math.floor(Math.random() * size * 2) - size;
    const offsetR = Math.floor(Math.random() * size * 2) - size;
    
    const targetQ = centerQ + offsetQ;
    const targetR = centerR + offsetR;
    
    // Find the corresponding tile with these axial coordinates
    let targetTile = null;
    let targetX = -1, targetY = -1;
    
    // Find the tile with matching q,r coordinates
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        if (map[y][x].q === targetQ && map[y][x].r === targetR) {
          targetTile = map[y][x];
          targetX = x;
          targetY = y;
          break;
        }
      }
      if (targetTile) break;
    }
    
    // If no tile was found with those exact coordinates (common during transition)
    // then try using array indices if they're in bounds
    if (!targetTile && targetQ >= 0 && targetQ < mapSize && targetR >= 0 && targetR < mapSize) {
      try {
        // During transition, q,r might be used as direct array indices
        targetTile = map[targetR][targetQ];
        targetX = targetQ;
        targetY = targetR;
      } catch (e) {
        // Skip if out of bounds
        continue;
      }
    }
    
    // If we found a valid tile
    if (targetTile) {
      // Calculate hex distance from center
      const hexDist = (
        Math.abs(centerQ - targetQ) + 
        Math.abs(centerR - targetR) + 
        Math.abs(centerQ + centerR - targetQ - targetR)
      ) / 2;
      
      // Distance affects probability (more gradual falloff for hex grid)
      const probability = 1 - (hexDist / (size * 1.5));
      
      if (Math.random() < probability) {
        map[targetY][targetX].type = terrainType;
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
  
  try {
    // Create roads between starting positions
    for (let i = 0; i < startPositions.length - 1; i++) {
      const from = startPositions[i];
      if (!from) continue;
      
      // Connect to the next position
      const to = startPositions[i + 1];
      if (!to) continue;
      
      // Create road between these two positions
      const path = findPath(map, from.x, from.y, to.x, to.y, mapSize);
      
      // Create roads along the path
      for (const point of path) {
        // Only place roads on land if point exists and coordinates are valid
        if (point && map[point.y] && map[point.y][point.x] &&
            map[point.y][point.x].type !== 'water' && 
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
        if (!pos) continue;
        
        const path = findPath(map, pos.x, pos.y, centerX, centerY, mapSize);
        
        // Create roads along the path
        for (const point of path) {
          // Only place roads on land if point exists and coordinates are valid
          if (point && map[point.y] && map[point.y][point.x] &&
              map[point.y][point.x].type !== 'water' && 
              map[point.y][point.x].type !== 'mountain') {
            map[point.y][point.x].type = 'road';
          }
        }
      }
    }
  } catch (error) {
    console.error("Error adding roads:", error);
    // Skip road creation if there's an error, but don't fail map generation
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
 * Get all surrounding tiles of a given position using hex axial coordinates
 * @param {Array} map - The game map
 * @param {Number} q - Q axial coordinate
 * @param {Number} r - R axial coordinate
 * @param {Number} mapSize - Size of the map
 * @returns {Array} - Array of surrounding tiles
 */
function getSurroundingTiles(map, q, r, mapSize) {
  const surrounding = [];
  // Hexagonal grid has six neighbors in these axial directions
  const directions = [
    {q: +1, r: 0}, {q: +1, r: -1}, {q: 0, r: -1},
    {q: -1, r: 0}, {q: -1, r: +1}, {q: 0, r: +1}
  ];
  
  for (const dir of directions) {
    const newQ = q + dir.q;
    const newR = r + dir.r;
    
    // Check bounds - for backward compatibility during transition, we'll still use x,y style access
    // but will update the actual tiles to have q,r properties
    if (newQ >= 0 && newQ < mapSize && newR >= 0 && newR < mapSize) {
      // Try to find the tile with matching q,r coordinates
      // During transition we need to handle both old and new coordinate systems
      let found = false;
      for (let y = 0; y < mapSize; y++) {
        for (let x = 0; x < mapSize; x++) {
          if (map[y][x].q === newQ && map[y][x].r === newR) {
            surrounding.push(map[y][x]);
            found = true;
            break;
          }
        }
        if (found) break;
      }
      
      // Fallback for maps that haven't been fully converted
      if (!found && newR < mapSize && newQ < mapSize) {
        surrounding.push(map[newR][newQ]);
      }
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
  try {
    gameState.map = [];
    
    // Check if we should use the new generator
    const useNewGenerator = gameState.useNewGenerator || false;
    
    // Create base terrain
    createBaseTerrain(gameState);
    
    // When using the new generator, we've already done everything in one step
    if (useNewGenerator) {
      // Just place start positions and finalize
      placeStartingPositions(gameState);
      finalizeMap(gameState);
      return gameState;
    }
    
    // For the legacy generator, continue with the usual steps
    structureTerrain(gameState);
    createResourceHotspots(gameState);
    placeStartingPositions(gameState);
    
    // Try to add roads - wrapped in try/catch so it doesn't fail the whole map generation
    try {
      addRoads(gameState);
    } catch (roadError) {
      console.error("Error adding roads:", roadError);
      // Continue with map generation even if roads fail
    }
    
    // Add resource nodes appropriate for the initial age
    addResourceNodes(gameState);
    
    // Place HQs and units
    finalizeMap(gameState);
    
    return gameState;
  } catch (error) {
    console.error("Error in map generation:", error);
    // Return a basic empty map as fallback
    gameState.map = [];
    for (let y = 0; y < (gameState.mapSize || DEFAULT_MAP_SIZE); y++) {
      const row = [];
      for (let x = 0; x < (gameState.mapSize || DEFAULT_MAP_SIZE); x++) {
        row.push({ 
          type: 'plains', 
          x: x, 
          y: y, 
          unit: null, 
          building: null,
          discovered: [true, true], // Make all visible for debugging
          resourceAmount: 0,
          resourceQuality: 'standard',
          hotspot: false
        });
      }
      gameState.map.push(row);
    }
    return gameState;
  }
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

// Reveal area around a point using hexagonal coordinates
export function revealArea(gameState, centerX, centerY, radius, playerIndex) {
  const mapSize = gameState.mapSize || DEFAULT_MAP_SIZE;
  
  // Get q, r coordinates of the center point
  // During transition, use x, y as q, r for simple mapping
  const centerQ = gameState.map[centerY][centerX].q || centerX;
  const centerR = gameState.map[centerY][centerX].r || centerY;
  
  // For backward compatibility, use a square-based scanning approach first
  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      if (x >= 0 && y >= 0 && x < mapSize && y < mapSize) {
        // Get the tile
        const tile = gameState.map[y][x];
        
        // Get the axial coordinates (q,r)
        const q = tile.q || x;
        const r = tile.r || y;
        
        // For hex grids, distance is different
        // In axial coordinates: distance = (abs(q1-q2) + abs(r1-r2) + abs(q1+r1-q2-r2)) / 2
        const hexDist = (Math.abs(centerQ - q) + Math.abs(centerR - r) + Math.abs(centerQ + centerR - q - r)) / 2;
        
        // For backward compatibility, also calculate Euclidean distance
        const euclideanDist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        
        // Use the appropriate distance based on whether we're fully on hex coordinates
        const dist = (tile.q !== undefined && tile.r !== undefined) ? hexDist : euclideanDist;
        
        if (dist <= radius) {
          gameState.map[y][x].discovered[playerIndex] = true;
        }
      }
    }
  }
}
