import { 
  processResourceCollection, 
  processUnitUpkeep, 
  processResearch, 
  processAgeProgress,
  advanceAge,
  updatePopulationCap,
  createNewCity
} from './gameState.js';
import { resetMovementPoints } from './movement.js';

import { 
  updateResourceDisplay, 
  updateUpkeepDisplay, 
  updateBuildingButtons, 
  updateUnitButtons, 
  updateResearchButtons,
  updateAgeProgressDisplay,
  showNotification
} from './ui.js';

import { addResourceNodes, revealArea } from './map.js';
import { unitTypes } from './units.js';
import { buildingTypes, canPlaceBuilding } from './buildings.js';
import { resourcesByAge } from './resources.js';
import { worldEvents, diplomacyOptions, factions, logistics } from './constants.js';

// Handle the end of a turn
export function endTurn(gameState, render) {
  if (!gameState.gameStarted) return;
  
  // Process current player's end-of-turn logic
  processResourceCollection(gameState, gameState.currentPlayer - 1);
  processUnitUpkeep(gameState, gameState.currentPlayer - 1);
  processResearch(gameState, gameState.currentPlayer - 1);
  processAgeProgress(gameState, gameState.currentPlayer - 1);
  // Use our own processProductionQueues function that properly imports from the module
  processProductionQueues(gameState);
  updatePopulationCap(gameState, gameState.currentPlayer - 1);
  
  // Process world events and check for new ones
  if (gameState.worldEvents && gameState.worldEvents.length > 0) {
    for (let i = gameState.worldEvents.length - 1; i >= 0; i--) {
      const event = gameState.worldEvents[i];
      event.turnsRemaining--;
      
      if (event.turnsRemaining <= 0) {
        showNotification(`${event.name} has ended`);
        gameState.worldEvents.splice(i, 1);
      }
    }
  }
  
  // Switch to next player or advance turn
  gameState.currentPlayer = (gameState.currentPlayer % 2) + 1;
  
  // Reset movement points for all units of the current player
  resetMovementPoints(gameState.players[gameState.currentPlayer - 1].units);
  
  if (gameState.currentPlayer === 1) {
    // Start of a new turn
    gameState.turn++;
    updateYearDisplay(gameState);
  }
  
  // Update UI based on current player
  document.getElementById('currentPlayer').textContent = gameState.currentPlayer;
  document.getElementById('currentAge').textContent = gameState.players[gameState.currentPlayer - 1].age;
  
  // Update UI elements
  updateResourceDisplay(gameState);
  updateResearchButtons(gameState, startResearch);
  updateUnitButtons(gameState, createUnit);
  updateBuildingButtons(gameState, startBuilding);
  updateUpkeepDisplay(gameState);
  updateAgeProgressDisplay(gameState);
  
  // If current player is AI, process AI turn
  if (gameState.players[gameState.currentPlayer - 1].isAI) {
    setTimeout(() => {
      // Simple AI logic
      const ai = gameState.players[1];
      
      // Try to create units
      if (ai.unlockedUnits && ai.unlockedUnits.length > 0) {
        for (const unitType of ai.unlockedUnits) {
          createUnit(gameState, unitType);
        }
      }
      
      // End AI turn
      setTimeout(() => endTurn(gameState, render), 1000);
    }, 1000);
  }
  
  // Render updated map
  render(gameState);
  
  showNotification(`Player ${gameState.currentPlayer}'s Turn`);
}

// Update year display based on current turn
export function updateYearDisplay(gameState) {
  const yearCounter = document.getElementById('yearCounter');
  const turnCounter = document.getElementById('turnCounter');
  
  turnCounter.textContent = gameState.turn;
  
  // Calculate historical year based on turn and age
  const currentAge = gameState.players[gameState.currentPlayer - 1].age;
  const ageIndex = gameState.ages.indexOf(currentAge);
  const historicalYears = ['3000 BCE', '2000 BCE', '1000 BCE', '500 CE', '1400 CE', '1800 CE', '1900 CE', '1914 CE'];
  yearCounter.textContent = historicalYears[ageIndex];
}

// Start researching a technology
export function startResearch(gameState, techName) {
  const player = gameState.players[gameState.currentPlayer - 1];
  
  // Check if already researching something
  if (player.currentResearch) {
    showNotification('Already researching something');
    return;
  }
  
  // Set current research
  player.currentResearch = techName;
  player.researchProgress = 0;
  
  updateResearchButtons(gameState, startResearch);
  showNotification(`Researching ${techName}`);
}

// Advance to the next age function
export function advanceToNextAge(gameState) {
  const playerIndex = gameState.currentPlayer - 1;
  const result = advanceAge(gameState, playerIndex);
  
  if (result) {
    // Refresh resource nodes with new age-specific resources
    addResourceNodes(gameState);
    
    // Update displays
    document.getElementById('currentAge').textContent = gameState.players[playerIndex].age;
    updateResourceDisplay(gameState);
    updateUnitButtons(gameState, createUnit);
    updateResearchButtons(gameState, startResearch);
    updateBuildingButtons(gameState, startBuilding);
    updateAgeProgressDisplay(gameState);
    
    showNotification(result);
  }
}

// Toggle fog of war
export function toggleFogOfWar(gameState) {
  gameState.fogOfWarEnabled = !gameState.fogOfWarEnabled;
  showNotification(`Fog of War: ${gameState.fogOfWarEnabled ? 'Enabled' : 'Disabled'}`);
  return gameState.fogOfWarEnabled;
}

// Set AI difficulty
export function setAIDifficulty(gameState, difficulty) {
  gameState.aiDifficulty = difficulty;
  showNotification(`AI Difficulty set to: ${difficulty}`);
}

// Handle diplomacy actions
export function handleDiplomacy(gameState, action) {
  const activePlayer = gameState.players[gameState.currentPlayer - 1];
  const otherPlayerIndex = gameState.currentPlayer % 2;
  const otherPlayer = gameState.players[otherPlayerIndex];
  
  switch (action) {
    case 'ally':
      activePlayer.diplomacy.status = 'Allied';
      otherPlayer.diplomacy.status = 'Allied';
      showNotification(`Alliance formed with ${otherPlayer.name}`);
      break;
      
    case 'trade':
      showNotification(`Trade established with ${otherPlayer.name}`);
      break;
      
    case 'war':
      activePlayer.diplomacy.status = 'War';
      otherPlayer.diplomacy.status = 'War';
      showNotification(`War declared on ${otherPlayer.name}`);
      break;
      
    case 'peace':
      activePlayer.diplomacy.status = 'Neutral';
      otherPlayer.diplomacy.status = 'Neutral';
      showNotification(`Peace negotiated with ${otherPlayer.name}`);
      break;
  }
  
  document.getElementById('diplomacyStatus').textContent = activePlayer.diplomacy.status;
}

// Process production queues for the current player
export function processProductionQueues(gameState) {
  const playerIndex = gameState.currentPlayer - 1;
  
  // First try to use the gameState version if available
  try {
    return import('./gameState.js').then(module => {
      if (module.processProductionQueues) {
        return module.processProductionQueues(gameState, playerIndex);
      }
      return false;
    }).catch(error => {
      console.error('Error importing processProductionQueues:', error);
      return false;
    });
  } catch (error) {
    console.error('Error processing production queues:', error);
    return false;
  }
}

// Process an AI turn
export function processAITurn(gameState, render) {
  const ai = gameState.players[1]; // AI is player 2
  
  // Basic AI actions
  if (ai.unlockedUnits) {
    for (const unitType of ai.unlockedUnits) {
      createUnit(gameState, unitType);
    }
  }
  
  // End AI turn
  setTimeout(() => endTurn(gameState, render), 1000);
}

// Create a new unit
export function createUnit(gameState, unitType) {
  const player = gameState.players[gameState.currentPlayer - 1];
  const unit = unitTypes[unitType];
  
  if (!unit) return false;
  
  // Find valid position near HQ
  let spawnX = -1, spawnY = -1;
  
  for (const building of player.buildings) {
    if (building.type === 'hq') {
      const x = building.x;
      const y = building.y;
      
      // Check surrounding tiles
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const newX = x + dx;
          const newY = y + dy;
          
          if (newX >= 0 && newX < gameState.map.length && newY >= 0 && newY < gameState.map[0].length) {
            const tile = gameState.map[newY][newX];
            if (tile.type !== 'water' && !tile.unit && !tile.building) {
              spawnX = newX;
              spawnY = newY;
              break;
            }
          }
        }
        if (spawnX !== -1) break;
      }
    }
    if (spawnX !== -1) break;
  }
  
  if (spawnX === -1) {
    return false;
  }
  
  // Create unit object
  const newUnit = {
    type: unitType,
    owner: gameState.currentPlayer,
    x: spawnX,
    y: spawnY,
    health: 100,
    canMove: true
  };
  
  // Add to player's units and map
  player.units.push(newUnit);
  gameState.map[spawnY][spawnX].unit = newUnit;
  
  // Update UI
  updateResourceDisplay(gameState);
  
  return true;
}

// Start building construction
export function startBuilding(gameState, buildingType) {
  gameState.selectedBuildingType = buildingType;
  showNotification(`Select location for ${buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
}

// Build a structure at the specified location
export function buildStructure(gameState, x, y) {
  // Remove any existing building suggestion UI
  const existingSuggestion = document.querySelector('.building-suggestion');
  if (existingSuggestion) {
    existingSuggestion.remove();
  }
  
  if (!gameState.selectedBuildingType) return false;
  
  const player = gameState.players[gameState.currentPlayer - 1];
  const building = buildingTypes[gameState.selectedBuildingType];
  const tile = gameState.map[y][x];
  
  // Check if location is valid using the buildings module function
  const { canPlace, reason } = canPlaceBuilding(gameState.selectedBuildingType, x, y, gameState);
  
  if (!canPlace) {
    showNotification(reason);
    gameState.selectedBuildingType = null;
    return false;
  }
  
  // Check if player has resources to build
  if (building.cost) {
    for (const resource in building.cost) {
      if (!player.resources[resource] || player.resources[resource] < building.cost[resource]) {
        showNotification(`Not enough ${resource} to build ${gameState.selectedBuildingType}`);
        gameState.selectedBuildingType = null;
        return false;
      }
    }
    
    // Deduct resources
    for (const resource in building.cost) {
      player.resources[resource] -= building.cost[resource];
    }
  }
  
  // Add to building queue instead of directly building
  player.buildingQueue.push({
    type: gameState.selectedBuildingType,
    x: x,
    y: y,
    progress: 0
  });
  
  // Show building in progress on the map
  tile.buildingInProgress = {
    type: gameState.selectedBuildingType,
    owner: gameState.currentPlayer,
    progress: 0
  };
  
  // Instant build for HQ (city center) at game start
  if (gameState.selectedBuildingType === 'hq' && player.buildings.length === 0) {
    // Create building instantly
    const newBuilding = {
      type: gameState.selectedBuildingType,
      owner: gameState.currentPlayer,
      x: x,
      y: y
    };
    
    // Add to player's buildings and map
    player.buildings.push(newBuilding);
    tile.building = { type: gameState.selectedBuildingType, owner: gameState.currentPlayer };
    tile.buildingInProgress = null;
    player.buildingQueue.shift(); // Remove from queue
    
    // Create new city
    createNewCity(gameState, gameState.currentPlayer - 1, x, y);
    
    // Reveal area around building
    if (building.vision) {
      revealArea(gameState, x, y, building.vision, gameState.currentPlayer - 1);
    }
  }
  
  // Store the building type before resetting selection
  const builtBuildingType = gameState.selectedBuildingType;
  
  // Reset selection
  gameState.selectedBuildingType = null;
  
  // Update UI
  updateResourceDisplay(gameState);
  
  // Show notification about construction
  if (builtBuildingType === 'hq') {
    showNotification(`${builtBuildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} built!`);
  } else {
    showNotification(`${builtBuildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} construction started`);
  }
  
  return true;
}

// Add unit to production queue
export function queueUnit(gameState, buildingId, unitType) {
  const player = gameState.players[gameState.currentPlayer - 1];
  const building = player.buildings[buildingId];
  const unitData = unitTypes[unitType];
  
  if (!building || !unitData) return false;
  
  // Check if building can produce this unit type
  const buildingData = buildingTypes[building.type];
  
  if (buildingData.category !== "production" || buildingData.unitType !== unitData.type) {
    showNotification(`This building cannot produce ${unitType} units`);
    return false;
  }
  
  // Check queue capacity
  if (!building.unitQueue) building.unitQueue = [];
  if (building.unitQueue.length >= buildingData.queueCapacity) {
    showNotification(`Production queue is full (${buildingData.queueCapacity} max)`);
    return false;
  }
  
  // Check if player has resources
  if (unitData.cost) {
    for (const resource in unitData.cost) {
      if (!player.resources[resource] || player.resources[resource] < unitData.cost[resource]) {
        showNotification(`Not enough ${resource} to build ${unitType}`);
        return false;
      }
    }
    
    // Deduct resources
    for (const resource in unitData.cost) {
      player.resources[resource] -= unitData.cost[resource];
    }
  }
  
  // Add to queue
  building.unitQueue.push({
    type: unitType,
    progress: 0
  });
  
  // Update UI
  updateResourceDisplay(gameState);
  updateProductionQueues(gameState);
  
  showNotification(`Added ${unitType} to production queue`);
  return true;
}

// Cancel item from production queue and refund 50% of cost
export function cancelQueueItem(gameState, isBuilding, buildingId, queueIndex) {
  const player = gameState.players[gameState.currentPlayer - 1];
  
  if (isBuilding) {
    // Cancel building
    if (queueIndex >= player.buildingQueue.length) return false;
    
    const buildingItem = player.buildingQueue[queueIndex];
    const buildingData = buildingTypes[buildingItem.type];
    
    // Refund 50% of cost
    if (buildingData.cost) {
      for (const resource in buildingData.cost) {
        const refundAmount = Math.floor(buildingData.cost[resource] * 0.5);
        if (!player.resources[resource]) player.resources[resource] = 0;
        player.resources[resource] += refundAmount;
      }
    }
    
    // Remove from queue
    player.buildingQueue.splice(queueIndex, 1);
    
    // Remove in-progress marker from map
    if (queueIndex === 0) {
      gameState.map[buildingItem.y][buildingItem.x].buildingInProgress = null;
    }
    
  } else {
    // Cancel unit production
    if (buildingId >= player.buildings.length) return false;
    
    const building = player.buildings[buildingId];
    if (!building.unitQueue || queueIndex >= building.unitQueue.length) return false;
    
    const unitItem = building.unitQueue[queueIndex];
    const unitData = unitTypes[unitItem.type];
    
    // Refund 50% of cost
    if (unitData.cost) {
      for (const resource in unitData.cost) {
        const refundAmount = Math.floor(unitData.cost[resource] * 0.5);
        if (!player.resources[resource]) player.resources[resource] = 0;
        player.resources[resource] += refundAmount;
      }
    }
    
    // Remove from queue
    building.unitQueue.splice(queueIndex, 1);
  }
  
  // Update UI
  updateResourceDisplay(gameState);
  
  showNotification('Production cancelled, 50% resources refunded');
  return true;
}
