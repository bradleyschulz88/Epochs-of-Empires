import { mapSize } from './constants.js';
import { resourcesByAge } from './resources.js';
import { resourceTileTypes } from './resources.js';
import { terrainTypes } from './terrain.js';

// Generate a procedural map with varied terrain
export function generateMap(gameState) {
  gameState.map = [];
  
  // Generate base terrain
  for (let y = 0; y < mapSize; y++) {
    const row = [];
    for (let x = 0; x < mapSize; x++) {
      // Create more varied terrain with better generation
      let terrainType = 'land';
      
      // Add water bodies
      const centerDist = Math.sqrt(Math.pow(x - mapSize/2, 2) + Math.pow(y - mapSize/2, 2));
      if (Math.random() < 0.25 || (centerDist > mapSize/2.5 && Math.random() < 0.6)) {
        terrainType = 'water';
      }
      
      // Add other terrain types
      if (terrainType === 'land') {
        const r = Math.random();
        if (r < 0.1) {
          terrainType = 'mountain';
        } else if (r < 0.25) {
          terrainType = 'hills';
        } else if (r < 0.45) {
          terrainType = 'forest';
        } else if (r < 0.5) {
          terrainType = 'desert';
        }
      }
      
      row.push({ 
        type: terrainType, 
        x: x, 
        y: y, 
        unit: null, 
        building: null,
        discovered: [false, false],
        resourceAmount: 0
      });
    }
    gameState.map.push(row);
  }
  
  // Add resource nodes appropriate for the initial age
  addResourceNodes(gameState);
  
  // Place starting HQs for both players
  const player1X = 3;
  const player1Y = 3;
  const player2X = mapSize - 4;
  const player2Y = mapSize - 4;
  
  // Ensure starting locations are land
  for (let y = player1Y - 1; y <= player1Y + 1; y++) {
    for (let x = player1X - 1; x <= player1X + 1; x++) {
      if (x >= 0 && y >= 0 && x < mapSize && y < mapSize) {
        gameState.map[y][x].type = 'land';
      }
    }
  }
  
  for (let y = player2Y - 1; y <= player2Y + 1; y++) {
    for (let x = player2X - 1; x <= player2X + 1; x++) {
      if (x >= 0 && y >= 0 && x < mapSize && y < mapSize) {
        gameState.map[y][x].type = 'land';
      }
    }
  }
  
  // Place HQs
  gameState.map[player1Y][player1X].building = { type: 'hq', owner: 1 };
  gameState.map[player2Y][player2X].building = { type: 'hq', owner: 2 };
  
  // Add buildings to player lists
  gameState.players[0].buildings.push({ type: 'hq', x: player1X, y: player1Y });
  gameState.players[1].buildings.push({ type: 'hq', x: player2X, y: player2Y });
  
  // Add starting units (1 Clubman) for each player
  const player1Unit = { 
    type: 'clubman', 
    owner: 1, 
    x: player1X, 
    y: player1Y + 1, 
    health: 100,
    canMove: true
  };
  
  const player2Unit = { 
    type: 'clubman', 
    owner: 2, 
    x: player2X, 
    y: player2Y - 1, 
    health: 100,
    canMove: true
  };
  
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

// Add resource nodes to the map based on current age
export function addResourceNodes(gameState) {
  // Clear existing resource nodes first
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = gameState.map[y][x];
      if (Object.keys(resourceTileTypes).includes(tile.type)) {
        tile.type = 'land'; // Reset to land
      }
    }
  }
  
  // Get the current player's age
  const currentPlayer = gameState.players[gameState.currentPlayer - 1];
  const ageIndex = gameState.ages.indexOf(currentPlayer.age);
  
  // Define which resources to add based on age
  let availableResources = [];
  
  // Stone Age: food, wood
  if (ageIndex >= 0) {
    availableResources.push('food', 'wood');
  }
  
  // Bronze Age: Add stone
  if (ageIndex >= 1) {
    availableResources.push('stone');
  }
  
  // Iron Age: Add iron ore
  if (ageIndex >= 2) {
    availableResources.push('ironOre');
  }
  
  // Medieval Age: Add gold
  if (ageIndex >= 3) {
    availableResources.push('gold');
  }
  
  // Renaissance Age: Add coal and oil
  if (ageIndex >= 4) {
    availableResources.push('coal', 'oil');
  }
  
  // Industrial Age: Add sulfur
  if (ageIndex >= 5) {
    availableResources.push('sulfur');
  }
  
  // Place resource nodes
  const nodesToPlace = 15 + ageIndex * 5; // More resources as ages advance
  
  for (let i = 0; i < nodesToPlace; i++) {
    const resourceType = availableResources[Math.floor(Math.random() * availableResources.length)];
    let placed = false;
    let attempts = 0;
    
    // Try to place the resource node
    while (!placed && attempts < 50) {
      const x = Math.floor(Math.random() * mapSize);
      const y = Math.floor(Math.random() * mapSize);
      const tile = gameState.map[y][x];
      
      // Place the resource on appropriate terrain
      if (resourceType === 'food' && (tile.type === 'land' || tile.type === 'forest')) {
        tile.type = 'food';
        tile.resourceAmount = 50 + Math.floor(Math.random() * 50);
        placed = true;
      } else if (resourceType === 'wood' && tile.type === 'forest') {
        tile.type = 'wood';
        tile.resourceAmount = 50 + Math.floor(Math.random() * 50);
        placed = true;
      } else if (resourceType === 'stone' && (tile.type === 'mountain' || tile.type === 'hills')) {
        tile.type = 'stone';
        tile.resourceAmount = 40 + Math.floor(Math.random() * 40);
        placed = true;
      } else if (resourceType === 'ironOre' && (tile.type === 'mountain')) {
        tile.type = 'ironOre';
        tile.resourceAmount = 30 + Math.floor(Math.random() * 40);
        placed = true;
      } else if (resourceType === 'gold' && (tile.type === 'mountain' || tile.type === 'hills')) {
        tile.type = 'gold';
        tile.resourceAmount = 20 + Math.floor(Math.random() * 30);
        placed = true;
      } else if (resourceType === 'coal' && (tile.type === 'mountain')) {
        tile.type = 'coal';
        tile.resourceAmount = 30 + Math.floor(Math.random() * 40);
        placed = true;
      } else if (resourceType === 'oil' && (tile.type === 'desert' || tile.type === 'water')) {
        tile.type = 'oil';
        tile.resourceAmount = 30 + Math.floor(Math.random() * 30);
        placed = true;
      } else if (resourceType === 'sulfur' && (tile.type === 'desert' || tile.type === 'mountain')) {
        tile.type = 'sulfur';
        tile.resourceAmount = 20 + Math.floor(Math.random() * 30);
        placed = true;
      }
      
      attempts++;
    }
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
