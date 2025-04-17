import { 
  processResourceCollection, 
  processUnitUpkeep, 
  processResearch, 
  processAgeProgress,
  advanceAge
} from './gameState.js';

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
import { buildingTypes } from './buildings.js';
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
  if (!gameState.selectedBuildingType) return false;
  
  const player = gameState.players[gameState.currentPlayer - 1];
  const building = buildingTypes[gameState.selectedBuildingType];
  const tile = gameState.map[y][x];
  
  // Check if location is valid
  if (tile.unit || tile.building || tile.type === 'water') {
    showNotification('Cannot build here');
    gameState.selectedBuildingType = null;
    return false;
  }
  
  // Create building
  const newBuilding = {
    type: gameState.selectedBuildingType,
    owner: gameState.currentPlayer,
    x: x,
    y: y
  };
  
  // Add to player's buildings and map
  player.buildings.push(newBuilding);
  tile.building = { type: gameState.selectedBuildingType, owner: gameState.currentPlayer };
  
  // Reveal area around building
  if (building && building.vision) {
    revealArea(gameState, x, y, building.vision, gameState.currentPlayer - 1);
  }
  
  // Reset selection
  gameState.selectedBuildingType = null;
  
  // Update UI
  updateResourceDisplay(gameState);
  
  return true;
}
