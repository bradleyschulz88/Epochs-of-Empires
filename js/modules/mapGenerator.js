/**
 * Map Generator Module
 * Implements a comprehensive hex-based map generation pipeline.
 */

import { createHexGrid, createHexSpiral, findHexByAxial, hexDistance } from './hexgrid.js';
import { terrainTypes } from './terrain.js';
import { resourceTileTypes, getSimpleResourcesByAge } from './resources.js';

// -------------------------------------------------------------------
// UTILITIES
// -------------------------------------------------------------------

/**
 * Generate 2D Perlin noise (simplified implementation)
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {Number} seed - Random seed value
 * @returns {Number} - Noise value between 0 and 1
 */
function perlin(x, y, seed = 0) {
  // Simple pseudo-random noise function
  function noise(ix, iy) {
    // Generate a pseudo-random value for the given coordinates
    let n = ix * 1277 + iy * 1637 + seed * 2633;
    n = (n << 13) ^ n;
    return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0;
  }
  
  // Grid cell coordinates
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  
  // Interpolation weights
  const sx = x - x0;
  const sy = y - y0;
  
  // Interpolate between grid point values
  let n0 = noise(x0, y0);
  let n1 = noise(x1, y0);
  let ix0 = lerp(n0, n1, sx);
  
  n0 = noise(x0, y1);
  n1 = noise(x1, y1);
  let ix1 = lerp(n0, n1, sx);
  
  // Final value in range 0-1
  return Math.abs(lerp(ix0, ix1, sy)) % 1.0;
}

/**
 * Linear interpolation function
 * @param {Number} a - First value
 * @param {Number} b - Second value
 * @param {Number} t - Interpolation factor (0-1)
 * @returns {Number} - Interpolated value
 */
function lerp(a, b, t) {
  return a + t * (b - a);
}

/**
 * Octave Perlin noise for more natural-looking terrain
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {Number} seed - Random seed
 * @param {Number} octaves - Number of octaves (detail levels)
 * @param {Number} persistence - How much each octave contributes
 * @returns {Number} - Noise value between 0 and 1
 */
function octavePerlin(x, y, seed, octaves = 6, persistence = 0.5) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    total += perlin(x * frequency, y * frequency, seed + i * 1000) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  
  // Normalize to 0-1
  return total / maxValue;
}

/**
 * Generate a random seed
 * @returns {Number} - Random seed value
 */
function generateRandomSeed() {
  return Math.floor(Math.random() * 1000000);
}

// -------------------------------------------------------------------
// STAGE 1: GENERATE HEIGHT & MOISTURE MAPS
// -------------------------------------------------------------------

/**
 * Generate height and moisture maps for a hex grid
 * @param {Array} hexes - Array of hex tiles
 * @param {Object} options - Map generation options
 * @returns {Array} - Updated hexes with elevation and moisture properties
 */
function generateHeightAndMoistureMaps(hexes, options = {}) {
  const {
    elevationFrequency = 0.04,
    moistureFrequency = 0.07,
    seed = generateRandomSeed(),
    mountainousness = 1.0, // 0.5 for flatter maps, 1.5 for more mountains
    wetness = 1.0 // 0.5 for drier maps, 1.5 for wetter maps
  } = options;
  
  console.log(`Generating height and moisture maps with seed: ${seed}`);
  
  for (const hex of hexes) {
    // Generate raw elevation and moisture using Perlin noise
    const rawElevation = octavePerlin(
      hex.q * elevationFrequency, 
      hex.r * elevationFrequency, 
      seed
    );
    
    const rawMoisture = octavePerlin(
      hex.q * moistureFrequency + 500, 
      hex.r * moistureFrequency + 500, 
      seed + 1000
    );
    
    // Apply adjustments for mountainousness and wetness
    hex.elevation = Math.pow(rawElevation, 2 - mountainousness);
    hex.moisture = Math.pow(rawMoisture, 2 - wetness);
    
    // Ensure values stay in 0-1 range
    hex.elevation = Math.max(0, Math.min(1, hex.elevation));
    hex.moisture = Math.max(0, Math.min(1, hex.moisture));
  }
  
  // Post-process: smooth the terrain to reduce noise artifacts
  smoothHeightMap(hexes);
  
  return hexes;
}

/**
 * Smooth the height map to reduce noise artifacts
 * @param {Array} hexes - Array of hex tiles
 */
function smoothHeightMap(hexes) {
  // Create a copy of original elevation values
  const originalElevations = hexes.map(hex => hex.elevation);
  
  for (let i = 0; i < hexes.length; i++) {
    const hex = hexes[i];
    let neighborCount = 1; // Include self
    let totalElevation = originalElevations[i];
    
    // Get neighboring hexes
    for (const neighbor of hex.neighbors) {
      const neighborHex = hexes.find(h => h.q === neighbor.q && h.r === neighbor.r);
      if (neighborHex) {
        const neighborIndex = hexes.indexOf(neighborHex);
        totalElevation += originalElevations[neighborIndex];
        neighborCount++;
      }
    }
    
    // Set smoothed elevation (30% original, 70% average)
    hex.elevation = (hex.elevation * 0.3) + ((totalElevation / neighborCount) * 0.7);
  }
}

// -------------------------------------------------------------------
// STAGE 2: BIOME CLASSIFICATION
// -------------------------------------------------------------------

/**
 * Assign terrain biomes based on elevation and moisture
 * @param {Array} hexes - Array of hex tiles with elevation and moisture
 * @returns {Array} - Updated hexes with terrain property
 */
function assignTerrainBiomes(hexes) {
  console.log("Assigning terrain biomes based on elevation and moisture");
  
  for (const hex of hexes) {
    // Base terrain classification by elevation
    if (hex.elevation < 0.35) {
      hex.terrain = 'SEA';
      // Add depth flag for deep sea (used for offshore oil)
      hex.depth = hex.elevation;
    } 
    else if (hex.elevation < 0.45) {
      hex.terrain = 'COASTAL_PLAIN';
    }
    else if (hex.elevation < 0.70) {
      hex.terrain = 'PLAINS';
    }
    else if (hex.elevation < 0.85) {
      hex.terrain = 'HILLS';
    }
    else {
      hex.terrain = 'MOUNTAIN';
    }
    
    // Moisture-based variations for plains
    if (hex.terrain === 'PLAINS') {
      if (hex.moisture > 0.75) {
        hex.terrain = 'FOREST';
      }
      else if (hex.moisture < 0.25) {
        hex.terrain = 'DESERT';
      }
    }
    
    // Moisture-based variations for coastal plains
    if (hex.terrain === 'COASTAL_PLAIN') {
      if (hex.moisture > 0.8) {
        hex.terrain = 'SWAMP';
      }
      else if (hex.moisture < 0.2) {
        hex.terrain = 'DESERT';
      }
    }
    
    // Convert terrain enum to the game's terrain type
    // This maps our terrain types to the game's existing terrain system
    switch (hex.terrain) {
      case 'SEA': 
        hex.type = 'water'; 
        break;
      case 'COASTAL_PLAIN': 
        hex.type = 'plains'; 
        break;
      case 'PLAINS': 
        hex.type = 'plains'; 
        break;
      case 'FOREST': 
        hex.type = 'forest'; 
        break;
      case 'HILLS': 
        hex.type = 'hills'; 
        break;
      case 'MOUNTAIN': 
        hex.type = 'mountain'; 
        break;
      case 'DESERT': 
        hex.type = 'desert'; 
        break;
      case 'SWAMP': 
        hex.type = 'forest'; 
        hex.isSwamp = true; 
        break;
      default: 
        hex.type = 'plains';
    }
  }
  
  return hexes;
}

// -------------------------------------------------------------------
// STAGE 3: RESOURCE STAMPING
// -------------------------------------------------------------------

/**
 * Place resources on the map based on terrain and rules
 * @param {Array} hexes - Array of hex tiles with terrain
 * @param {Object} gameState - Game state for age and other settings
 * @returns {Array} - Updated hexes with resources
 */
function stampResources(hexes, gameState) {
  console.log("Stamping resources based on terrain types");
  
  // Get available resources for current age
  const currentAge = gameState?.players?.[gameState.currentPlayer - 1]?.age || 'Stone Age';
  const availableResources = getSimpleResourcesByAge(currentAge);
  
  // Clear existing resource assignments
  for (const hex of hexes) {
    hex.resource = null;
  }
  
  // Create resource distribution tracker
  const resourceCounts = {};
  availableResources.forEach(res => resourceCounts[res] = 0);
  
  // First pass - handle clustering resources (forests, mountains)
  placeClusters(hexes, 'FOREST', 'wood', 0.2, 2, resourceCounts);
  
  // Special pass for mountain resources (one resource type per cluster)
  placeMountainResources(hexes, availableResources, resourceCounts);
  
  // Place hill resources with minimum distance constraints
  placeScatteredResources(hexes, ['stone', 'silica'], 'HILLS', 0.15, 2, resourceCounts);
  
  // Place coastal resources
  placeCoastalResources(hexes, resourceCounts);
  
  // Place deep sea resources
  placeDeepSeaResources(hexes, resourceCounts);
  
  // Place farm-eligible tiles
  placeFarmableTiles(hexes, 8, resourceCounts);
  
  // Apply resource quality levels
  applyResourceQualities(hexes);
  
  return hexes;
}

/**
 * Place clustered resources like forests
 * @param {Array} hexes - Array of hex tiles
 * @param {String} terrainType - Target terrain type
 * @param {String} resourceType - Resource to place
 * @param {Number} density - Chance per suitable hex (0-1)
 * @param {Number} clusterRadius - How tightly clustered
 * @param {Object} resourceCounts - Tracking object for placed resources
 */
function placeClusters(hexes, terrainType, resourceType, density, clusterRadius, resourceCounts) {
  const suitableHexes = hexes.filter(h => h.terrain === terrainType);
  const placedHexes = new Set();
  
  for (const hex of suitableHexes) {
    // Skip if already processed
    if (placedHexes.has(`${hex.q},${hex.r}`)) continue;
    
    // Check if this should be a cluster center
    if (Math.random() < density) {
      // This is a cluster center - place the resource here
      hex.resource = resourceType;
      resourceCounts[resourceType] = (resourceCounts[resourceType] || 0) + 1;
      placedHexes.add(`${hex.q},${hex.r}`);
      
      // Place clustered resources around it
      for (const otherHex of suitableHexes) {
        if (placedHexes.has(`${otherHex.q},${otherHex.r}`)) continue;
        
        const distance = hexDistance(hex.q, hex.r, otherHex.q, otherHex.r);
        if (distance <= clusterRadius && Math.random() < (1 - distance/clusterRadius)) {
          otherHex.resource = resourceType;
          resourceCounts[resourceType] = (resourceCounts[resourceType] || 0) + 1;
          placedHexes.add(`${otherHex.q},${otherHex.r}`);
        }
      }
    }
  }
}

/**
 * Place resources in mountain ranges, ensuring one resource type per cluster
 * @param {Array} hexes - Array of hex tiles
 * @param {Array} availableResources - Resources available in current age
 * @param {Object} resourceCounts - Tracking object for placed resources
 */
function placeMountainResources(hexes, availableResources, resourceCounts) {
  const mountainHexes = hexes.filter(h => h.terrain === 'MOUNTAIN');
  const processed = new Set();
  const mountainResources = ['gold', 'ironOre', 'coal', 'uranium'].filter(
    r => availableResources.includes(r)
  );
  
  if (mountainResources.length === 0) return;
  
  // Group mountain hexes into connected clusters
  const clusters = [];
  
  for (const hex of mountainHexes) {
    if (processed.has(`${hex.q},${hex.r}`)) continue;
    
    // Start a new cluster
    const cluster = [];
    const queue = [hex];
    processed.add(`${hex.q},${hex.r}`);
    
    // BFS to find all connected mountain hexes
    while (queue.length > 0) {
      const current = queue.shift();
      cluster.push(current);
      
      // Check all neighbors
      for (const neighbor of hexes) {
        if (hexDistance(current.q, current.r, neighbor.q, neighbor.r) === 1 && 
            neighbor.terrain === 'MOUNTAIN' && 
            !processed.has(`${neighbor.q},${neighbor.r}`)) {
          queue.push(neighbor);
          processed.add(`${neighbor.q},${neighbor.r}`);
        }
      }
    }
    
    // Only add clusters with at least 5 hexes
    if (cluster.length >= 5) {
      clusters.push(cluster);
    }
  }
  
  console.log(`Found ${clusters.length} mountain ranges with 5+ tiles`);
  
  // For each mountain cluster, choose and place one resource type
  for (const cluster of clusters) {
    // Skip very small clusters
    if (cluster.length < 3) continue;
    
    const resource = mountainResources[Math.floor(Math.random() * mountainResources.length)];
    
    // 15% chance for each hex to receive the resource
    for (const hex of cluster) {
      if (Math.random() < 0.15) {
        hex.resource = resource;
        resourceCounts[resource] = (resourceCounts[resource] || 0) + 1;
      }
    }
  }
}

/**
 * Place scattered resources with minimum distance between same types
 * @param {Array} hexes - Array of hex tiles
 * @param {Array} resourceTypes - Resources to place
 * @param {String} terrainType - Target terrain type
 * @param {Number} density - Chance per suitable hex (0-1)
 * @param {Number} minDistance - Minimum distance between same resource
 * @param {Object} resourceCounts - Tracking object for placed resources
 */
function placeScatteredResources(hexes, resourceTypes, terrainType, density, minDistance, resourceCounts) {
  const suitableHexes = hexes.filter(h => h.terrain === terrainType);
  
  for (const hex of suitableHexes) {
    if (Math.random() < density) {
      // Choose a random resource from the available types
      const resource = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
      
      // Check minimum distance constraint
      let tooClose = false;
      for (const otherHex of hexes) {
        if (otherHex.resource === resource) {
          const distance = hexDistance(hex.q, hex.r, otherHex.q, otherHex.r);
          if (distance < minDistance) {
            tooClose = true;
            break;
          }
        }
      }
      
      if (!tooClose) {
        hex.resource = resource;
        resourceCounts[resource] = (resourceCounts[resource] || 0) + 1;
      }
    }
  }
}

/**
 * Place coastal resources like fish and salt
 * @param {Array} hexes - Array of hex tiles
 * @param {Object} resourceCounts - Tracking object for placed resources
 */
function placeCoastalResources(hexes, resourceCounts) {
  // Find coastal water hexes (water hexes adjacent to land)
  const coastalHexes = [];
  
  for (const hex of hexes) {
    if (hex.terrain === 'SEA') {
      // Check if adjacent to land
      const neighbors = hexes.filter(n => 
        hexDistance(hex.q, hex.r, n.q, n.r) === 1
      );
      
      const adjacentToLand = neighbors.some(n => 
        n.terrain !== 'SEA' && n.terrain !== 'COASTAL_PLAIN'
      );
      
      if (adjacentToLand) {
        coastalHexes.push(hex);
      }
    }
  }
  
  // Place fish every 3rd coastal hex
  let counter = 0;
  for (const hex of coastalHexes) {
    counter++;
    if (counter % 3 === 0) {
      hex.resource = 'food';
      hex.isFishingGround = true;
      resourceCounts.food = (resourceCounts.food || 0) + 1;
    } else if (counter % 10 === 0) {
      hex.resource = 'salt';
      resourceCounts.salt = (resourceCounts.salt || 0) + 1;
    }
  }
}

/**
 * Place deep sea resources like offshore oil
 * @param {Array} hexes - Array of hex tiles
 * @param {Object} resourceCounts - Tracking object for placed resources
 */
function placeDeepSeaResources(hexes, resourceCounts) {
  const deepSeaHexes = hexes.filter(h => 
    h.terrain === 'SEA' && h.depth && h.depth < 0.2
  );
  
  for (const hex of deepSeaHexes) {
    if (Math.random() < 0.05) { // 5% chance
      hex.resource = 'offshoreOil';
      resourceCounts.offshoreOil = (resourceCounts.offshoreOil || 0) + 1;
    }
  }
}

/**
 * Place farmable tiles (food resources) with guaranteed distribution
 * @param {Array} hexes - Array of hex tiles
 * @param {Number} windowSize - Size of guarantee window
 * @param {Object} resourceCounts - Tracking object for placed resources
 */
function placeFarmableTiles(hexes, windowSize, resourceCounts) {
  // Get eligible tiles for farms (plains)
  const eligibleHexes = hexes.filter(h => 
    h.terrain === 'PLAINS' && !h.resource
  );
  
  // Group hexes into window sized chunks to guarantee distribution
  const windows = [];
  const hexById = new Map();
  
  // Create a map for quick lookup
  eligibleHexes.forEach(hex => {
    hexById.set(`${hex.q},${hex.r}`, hex);
  });
  
  // Create windows (this is a simplification - ideally we'd use a more sophisticated approach)
  const qValues = [...new Set(eligibleHexes.map(h => h.q))].sort((a, b) => a - b);
  const rValues = [...new Set(eligibleHexes.map(h => h.r))].sort((a, b) => a - b);
  
  for (let q = 0; q < qValues.length; q += windowSize) {
    for (let r = 0; r < rValues.length; r += windowSize) {
      const window = [];
      
      for (let i = 0; i < windowSize && (q + i) < qValues.length; i++) {
        for (let j = 0; j < windowSize && (r + j) < rValues.length; j++) {
          const hex = hexById.get(`${qValues[q + i]},${rValues[r + j]}`);
          if (hex) window.push(hex);
        }
      }
      
      if (window.length > 0) {
        windows.push(window);
      }
    }
  }
  
  // For each window, guarantee at least one farm-eligible tile
  windows.forEach(window => {
    const hasFood = window.some(hex => hex.resource === 'food');
    
    if (!hasFood && window.length > 0) {
      const randomIndex = Math.floor(Math.random() * window.length);
      window[randomIndex].resource = 'food';
      resourceCounts.food = (resourceCounts.food || 0) + 1;
    }
  });
}

/**
 * Apply resource quality levels to placed resources
 * @param {Array} hexes - Array of hex tiles with resources
 */
function applyResourceQualities(hexes) {
  for (const hex of hexes) {
    if (hex.resource) {
      // Determine resource quality based on elevation and moisture
      let qualityChance = Math.random();
      
      // Adjust quality based on position in terrain band
      // Resources near the edge of their terrain band tend to be poorer quality
      if (hex.terrain === 'MOUNTAIN') {
        // Higher mountains have better resources
        qualityChance += (hex.elevation - 0.85) * 2; 
      } else if (hex.terrain === 'HILLS') {
        // Higher hills have better resources
        qualityChance += (hex.elevation - 0.7) * 3; 
      } else if (hex.terrain === 'PLAINS' || hex.terrain === 'FOREST') {
        // More moisture on plains/forest means better resources
        qualityChance += (hex.moisture - 0.5) * 0.5;
      }
      
      // Assign quality level
      if (qualityChance > 0.8) {
        hex.resourceQuality = 'rich';
      } else if (qualityChance > 0.4) {
        hex.resourceQuality = 'standard';
      } else {
        hex.resourceQuality = 'poor';
      }
    }
  }
}

// -------------------------------------------------------------------
// STAGE 4: POST-PROCESS AND VALIDATE
// -------------------------------------------------------------------

/**
 * Post-process and validate the generated map
 * @param {Array} hexes - Array of hex tiles with terrain and resources
 * @param {Object} gameState - Game state for validation criteria
 * @returns {Array} - Final validated hex array
 */
function postProcessAndValidate(hexes, gameState) {
  console.log("Post-processing and validating map");
  
  // Get landmass size for quota calculations
  const landHexes = hexes.filter(h => h.terrain !== 'SEA');
  
  // Check resource quotas
  validateResourceQuotas(hexes, landHexes.length);
  
  // Check mountain ranges
  validateMountainRanges(hexes);
  
  // Check for island pockets and create isthmus if needed
  validateReachability(hexes);
  
  return hexes;
}

/**
 * Ensure minimum resource quotas are met
 * @param {Array} hexes - Array of hex tiles
 * @param {Number} landHexCount - Number of land hexes for quota calculation
 */
function validateResourceQuotas(hexes, landHexCount) {
  // Calculate current resource counts
  const resourceCounts = {};
  for (const hex of hexes) {
    if (hex.resource) {
      resourceCounts[hex.resource] = (resourceCounts[hex.resource] || 0) + 1;
    }
  }
  
  // Define minimum quotas
  const minWoodPerLand = landHexCount / 30;
  const minFoodPerLand = landHexCount / 25;
  
  console.log(`Land hex count: ${landHexCount}`);
  console.log(`Wood quota: ${minWoodPerLand}, Current: ${resourceCounts.wood || 0}`);
  console.log(`Food quota: ${minFoodPerLand}, Current: ${resourceCounts.food || 0}`);
  
  // Add wood if below quota
  if ((resourceCounts.wood || 0) < minWoodPerLand) {
    const needed = Math.ceil(minWoodPerLand - (resourceCounts.wood || 0));
    console.log(`Adding ${needed} wood resources to meet quota`);
    
    // Find eligible forest hexes
    const eligibleHexes = hexes.filter(h => 
      h.terrain === 'FOREST' && !h.resource
    );
    
    // Add wood nodes
    for (let i = 0; i < needed && i < eligibleHexes.length; i++) {
      eligibleHexes[i].resource = 'wood';
      eligibleHexes[i].resourceQuality = 'standard';
    }
  }
  
  // Add food if below quota
  if ((resourceCounts.food || 0) < minFoodPerLand) {
    const needed = Math.ceil(minFoodPerLand - (resourceCounts.food || 0));
    console.log(`Adding ${needed} food resources to meet quota`);
    
    // Find eligible plains hexes
    const eligibleHexes = hexes.filter(h => 
      h.terrain === 'PLAINS' && !h.resource
    );
    
    // Add food nodes
    for (let i = 0; i < needed && i < eligibleHexes.length; i++) {
      eligibleHexes[i].resource = 'food';
      eligibleHexes[i].resourceQuality = 'standard';
    }
  }
}

/**
 * Ensure there are at least 3 mountain ranges
 * @param {Array} hexes - Array of hex tiles
 */
function validateMountainRanges(hexes) {
  const mountainHexes = hexes.filter(h => h.terrain === 'MOUNTAIN');
  const visited = new Set();
  const ranges = [];
  
  // Find all mountain ranges using connected component analysis
  for (const hex of mountainHexes) {
    if (visited.has(`${hex.q},${hex.r}`)) continue;
    
    // Start a new range
    const range = [];
    const queue = [hex];
    visited.add(`${hex.q},${hex.r}`);
    
    // BFS to find all connected mountain hexes
    while (queue.length > 0) {
      const current = queue.shift();
      range.push(current);
      
      // Check all neighbors
      for (const neighbor of hexes) {
        if (hexDistance(current.q, current.r, neighbor.q, neighbor.r) === 1 && 
            neighbor.terrain === 'MOUNTAIN' && 
            !visited.has(`${neighbor.q},${neighbor.r}`)) {
          queue.push(neighbor);
          visited.add(`${neighbor.q},${neighbor.r}`);
        }
      }
    }
    
    ranges.push(range);
  }
  
  // Count large ranges (5+ hexes)
  const largeRanges = ranges.filter(range => range.length >= 5);
  console.log(`Found ${largeRanges.length} mountain ranges with 5+ hexes`);
  
  // If we don't have enough large ranges, expand some smaller ones
  if (largeRanges.length < 3) {
    const smallRanges = ranges.filter(range => range.length < 5)
                              .sort((a, b) => b.length - a.length);
    
    for (let i = 0; i < Math.min(3 - largeRanges.length, smallRanges.length); i++) {
      const range = smallRanges[i];
      
      // Get perimeter hexes around this range
      const perimeter = new Set();
      
      for (const hex of range) {
        for (const neighbor of hexes) {
          if (hexDistance(hex.q, hex.r, neighbor.q, neighbor.r) === 1 && 
              neighbor.terrain !== 'MOUNTAIN' &&
              neighbor.terrain !== 'SEA') {
            perimeter.add(`${neighbor.q},${neighbor.r}`);
          }
        }
      }
      
      // Convert some perimeter hexes to mountains
      const perimeterHexes = Array.from(perimeter).map(key => {
        const [q, r] = key.split(',').map(Number);
        return hexes.find(h => h.q === q && h.r === r);
      }).filter(h => h);
      
      // Take enough hexes to get to 5+
      const hexesToConvert = perimeterHexes.slice(0, 5 - range.length);
      for (const hex of hexesToConvert) {
        hex.terrain = 'MOUNTAIN';
        hex.type = 'mountain';
      }
    }
  }
}

/**
 * Check for unreachable land pockets and create isthmuses if needed
 * @param {Array} hexes - Array of hex tiles
 */
function validateReachability(hexes) {
  console.log("Checking for isolated land pockets");
  
  // Find all land hexes
  const landHexes = hexes.filter(h => h.terrain !== 'SEA');
  if (landHexes.length === 0) return;
  
  // Find potential coastal hexes (land hexes adjacent to sea)
  const coastalHexes = [];
  for (const hex of landHexes) {
    // Check if adjacent to sea
    const hasSeaNeighbor = hexes.some(neighbor => 
      hexDistance(hex.q, hex.r, neighbor.q, neighbor.r) === 1 &&
      neighbor.terrain === 'SEA'
    );
    
    if (hasSeaNeighbor) {
      coastalHexes.push(hex);
    }
  }
  
  // If no coastal hexes, all land is already connected
  if (coastalHexes.length === 0) return;
  
  // Start BFS from the first coastal hex
  const startHex = coastalHexes[0];
  const visited = new Set([`${startHex.q},${startHex.r}`]);
  const queue = [startHex];
  
  // BFS to find all reachable land hexes
  while (queue.length > 0) {
    const current = queue.shift();
    
    // Check all neighbors
    for (const neighbor of hexes) {
      if (hexDistance(current.q, current.r, neighbor.q, neighbor.r) === 1 && 
          neighbor.terrain !== 'SEA' &&
          !visited.has(`${neighbor.q},${neighbor.r}`)) {
        queue.push(neighbor);
        visited.add(`${neighbor.q},${neighbor.r}`);
      }
    }
  }
  
  // Check if all land hexes were visited
  const unreachableHexes = landHexes.filter(hex => 
    !visited.has(`${hex.q},${hex.r}`)
  );
  
  // If there are unreachable land pockets, create an isthmus
  if (unreachableHexes.length > 0) {
    console.log(`Found ${unreachableHexes.length} unreachable land hexes. Creating isthmus.`);
    
    // Find closest unreachable hex to a reachable one
    let minDistance = Infinity;
    let bestUnreachableHex = null;
    let bestReachableHex = null;
    
    for (const unreachableHex of unreachableHexes) {
      for (const visitedKey of visited) {
        const [vq, vr] = visitedKey.split(',').map(Number);
        const reachableHex = hexes.find(h => h.q === vq && h.r === vr);
        if (!reachableHex) continue;
        
        const distance = hexDistance(unreachableHex.q, unreachableHex.r, reachableHex.q, reachableHex.r);
        if (distance < minDistance) {
          minDistance = distance;
          bestUnreachableHex = unreachableHex;
          bestReachableHex = reachableHex;
        }
      }
    }
    
    // Create a path between the two closest hexes
    if (bestUnreachableHex && bestReachableHex) {
      createIsthmus(hexes, bestReachableHex, bestUnreachableHex);
    }
  }
}

/**
 * Create an isthmus (land bridge) between two land masses
 * @param {Array} hexes - Array of hex tiles
 * @param {Object} startHex - Starting hex
 * @param {Object} endHex - Ending hex
 */
function createIsthmus(hexes, startHex, endHex) {
  // Use A* algorithm to find the shortest path between the two hexes
  const path = findShortestPath(hexes, startHex, endHex);
  
  // Convert the path hexes to land
  for (const hex of path) {
    // If it's sea, convert to plains/shallow water
    if (hex.terrain === 'SEA') {
      hex.terrain = 'COASTAL_PLAIN';
      hex.type = 'plains';
      hex.isIsthmus = true; // Mark as isthmus for potential game mechanics
    }
  }
  
  console.log(`Created isthmus of ${path.length} hexes`);
}

/**
 * Find the shortest path between two hexes (simplified A*)
 * @param {Array} hexes - Array of hex tiles
 * @param {Object} startHex - Starting hex
 * @param {Object} endHex - Ending hex
 * @returns {Array} - Path of hexes from start to end
 */
function findShortestPath(hexes, startHex, endHex) {
  // Setup data structures
  const openSet = [startHex];
  const cameFrom = new Map();
  
  // Cost from start to current node
  const gScore = new Map();
  gScore.set(`${startHex.q},${startHex.r}`, 0);
  
  // Estimated total cost
  const fScore = new Map();
  fScore.set(`${startHex.q},${startHex.r}`, 
    hexDistance(startHex.q, startHex.r, endHex.q, endHex.r));
  
  while (openSet.length > 0) {
    // Find hex with lowest fScore
    openSet.sort((a, b) => {
      const aScore = fScore.get(`${a.q},${a.r}`) || Infinity;
      const bScore = fScore.get(`${b.q},${b.r}`) || Infinity;
      return aScore - bScore;
    });
    
    const current = openSet.shift();
    
    // Check if we reached the end
    if (current.q === endHex.q && current.r === endHex.r) {
      return reconstructPath(cameFrom, current);
    }
    
    // Check all neighbors
    for (const neighbor of hexes) {
      if (hexDistance(current.q, current.r, neighbor.q, neighbor.r) !== 1) {
        continue;
      }
      
      // Cost to move to this neighbor (higher for sea)
      let moveCost = 1;
      if (neighbor.terrain === 'SEA') {
        moveCost = 2; // Higher cost to convert sea to land
      }
      if (neighbor.terrain === 'MOUNTAIN') {
        moveCost = 5; // Very high cost to go through mountains
      }
      
      // Calculate tentative gScore
      const tentativeGScore = 
        (gScore.get(`${current.q},${current.r}`) || Infinity) + moveCost;
      
      if (tentativeGScore < (gScore.get(`${neighbor.q},${neighbor.r}`) || Infinity)) {
        // This path is better than any previous one
        cameFrom.set(`${neighbor.q},${neighbor.r}`, current);
        gScore.set(`${neighbor.q},${neighbor.r}`, tentativeGScore);
        fScore.set(`${neighbor.q},${neighbor.r}`, 
          tentativeGScore + hexDistance(neighbor.q, neighbor.r, endHex.q, endHex.r));
        
        // Add to open set if not already there
        if (!openSet.some(h => h.q === neighbor.q && h.r === neighbor.r)) {
          openSet.push(neighbor);
        }
      }
    }
  }
  
  // If no path found, return empty path
  return [];
}

/**
 * Reconstruct path from start to end using the cameFrom map
 * @param {Map} cameFrom - Map of how we reached each hex
 * @param {Object} current - Current (end) hex
 * @returns {Array} - Path of hexes from start to end
 */
function reconstructPath(cameFrom, current) {
  const path = [current];
  
  while (cameFrom.has(`${current.q},${current.r}`)) {
    current = cameFrom.get(`${current.q},${current.r}`);
    path.unshift(current);
  }
  
  return path;
}

// -------------------------------------------------------------------
// MAP GENERATOR API
// -------------------------------------------------------------------

/**
 * Generate a complete map using the hex-based pipeline
 * @param {Array} hexes - Empty hex grid array
 * @param {Object} options - Map generation options
 * @param {Object} gameState - Game state for age-specific resources
 * @returns {Array} - Processed hex grid with terrain and resources
 */
function generateMap(hexes, options = {}, gameState = {}) {
  console.log("Starting hex-based map generation pipeline");
  
  // Stage 1: Generate height and moisture maps
  hexes = generateHeightAndMoistureMaps(hexes, options);
  
  // Stage 2: Assign terrain biomes based on height and moisture
  hexes = assignTerrainBiomes(hexes);
  
  // Stage 3: Place resources
  hexes = stampResources(hexes, gameState);
  
  // Stage 4: Post-process and validate
  hexes = postProcessAndValidate(hexes, gameState);
  
  return hexes;
}

// Export public API
export {
  generateMap,
  createIsthmus,
  perlin,
  octavePerlin
};
