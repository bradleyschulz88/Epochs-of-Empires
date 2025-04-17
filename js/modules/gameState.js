import { ages } from './constants.js';
import { resourcesByAge, resourceTileTypes } from './resources.js';
import { unitTypes } from './units.js';
import { buildingTypes } from './buildings.js';
import { technologies } from './technologies.js';

// Initial game state
export function createInitialGameState() {
  return {
    currentPlayer: 1,
    turn: 1,
    weather: 'Clear',
    ages: ages, // Store ages here for reference
    players: [
      {
        id: 1,
        name: "Player",
        color: "#4299E1",
        faction: "England", // Default faction
        resources: { 
          food: 50, 
          wood: 50
        },
        upkeep: {
          food: 0,
          wood: 0,
          stone: 0,
          ironOre: 0,
          gold: 0,
          coal: 0,
          oil: 0,
          sulfur: 0,
          techPoints: 0
        },
        units: [],
        buildings: [],
        technologies: [],
        researchProgress: 0,
        currentResearch: null,
        age: "Stone Age",
        ageProgress: 0,
        unlockedUnits: ["clubman"],
        diplomacy: { status: "Neutral", allies: [], treaties: [] }
      },
      {
        id: 2,
        name: "AI",
        color: "#F56565",
        faction: "Germany", // Default faction for AI
        resources: { 
          food: 50, 
          wood: 50
        },
        upkeep: {
          food: 0,
          wood: 0,
          stone: 0,
          ironOre: 0,
          gold: 0,
          coal: 0,
          oil: 0,
          sulfur: 0,
          techPoints: 0
        },
        units: [],
        buildings: [],
        technologies: [],
        researchProgress: 0,
        currentResearch: null,
        age: "Stone Age",
        ageProgress: 0,
        unlockedUnits: ["clubman"],
        diplomacy: { status: "Neutral", allies: [], treaties: [] },
        isAI: true
      }
    ],
    map: [],
    worldEvents: [],
    freeForAll: true // Default mode is Free-for-All
  };
}

// Process resource collection from buildings and resource tiles
export function processResourceCollection(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  
  // Collect from buildings
  player.buildings.forEach(building => {
    const buildingType = buildingTypes[building.type];
    if (buildingType && buildingType.production) {
      for (const resource in buildingType.production) {
        if (!player.resources[resource]) {
          player.resources[resource] = 0;
        }
        player.resources[resource] += buildingType.production[resource];
      }
    }
  });
  
  // Collect from resource tiles occupied by worker units
  player.units.forEach(unit => {
    if (unit.type === 'forager' || unit.abilities?.includes('gather')) {
      const tile = gameState.map[unit.y][unit.x];
      if (Object.keys(resourceTileTypes).includes(tile.type) && tile.resourceAmount > 0) {
        // Check if the resource is available in current age
        const availableResources = resourcesByAge[player.age];
        if (availableResources.includes(tile.type)) {
          // Extract resource
          const extractAmount = Math.min(10, tile.resourceAmount);
          tile.resourceAmount -= extractAmount;
          
          // Add to player's resources
          if (!player.resources[tile.type]) {
            player.resources[tile.type] = 0;
          }
          player.resources[tile.type] += extractAmount;
          
          // Convert tile back to basic terrain if depleted
          if (tile.resourceAmount <= 0) {
            if (tile.type === 'wood') {
              tile.type = 'forest';
            } else if (tile.type === 'food') {
              tile.type = 'land';
            } else if (['stone', 'ironOre', 'gold', 'coal'].includes(tile.type)) {
              tile.type = 'mountain';
            } else if (tile.type === 'oil' && tile.type === 'water') {
              tile.type = 'water';
            } else if (tile.type === 'sulfur' || tile.type === 'oil') {
              tile.type = 'desert';
            }
          }
        }
      }
    }
  });
}

// Process unit upkeep costs
export function processUnitUpkeep(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  
  // Reset upkeep counters
  for (const resource in player.upkeep) {
    player.upkeep[resource] = 0;
  }
  
  // Calculate total upkeep from all units
  player.units.forEach(unit => {
    const unitData = unitTypes[unit.type];
    if (unitData && unitData.upkeep) {
      for (const resource in unitData.upkeep) {
        if (!player.upkeep[resource]) {
          player.upkeep[resource] = 0;
        }
        player.upkeep[resource] += unitData.upkeep[resource];
      }
    }
  });
  
  // Deduct upkeep from resources
  for (const resource in player.upkeep) {
    if (player.upkeep[resource] > 0) {
      if (!player.resources[resource]) {
        player.resources[resource] = 0;
      }
      
      // Apply upkeep cost
      player.resources[resource] -= player.upkeep[resource];
      
      // If resources go negative, units might suffer penalties
      if (player.resources[resource] < 0) {
        applyResourceShortageEffects(gameState, playerIndex, resource);
        player.resources[resource] = 0; // Prevent negative resources
      }
    }
  }
}

// Apply effects of resource shortages
export function applyResourceShortageEffects(gameState, playerIndex, resource) {
  const player = gameState.players[playerIndex];
  
  // Different effects based on resource type
  if (resource === 'food') {
    // Food shortage: units lose health
    player.units.forEach(unit => {
      if (!unit.health) unit.health = 100;
      unit.health -= 20;
      if (unit.health <= 0) {
        // Unit dies
        removeUnit(gameState, unit);
      }
    });
    return `Player ${playerIndex + 1}: Food shortage! Units are starving.`;
  } else if (resource === 'oil' || resource === 'coal') {
    // Fuel shortage: mechanical units can't move
    player.units.forEach(unit => {
      if (unitTypes[unit.type]?.hasEngine) {
        unit.canMove = false;
      }
    });
    return `Player ${playerIndex + 1}: Fuel shortage! Mechanical units immobilized.`;
  } else if (resource === 'techPoints') {
    // Tech shortage: advanced abilities disabled
    player.units.forEach(unit => {
      if (unitTypes[unit.type]?.hasSpecialAbilities) {
        unit.abilitiesDisabled = true;
      }
    });
    return `Player ${playerIndex + 1}: Tech point shortage! Advanced abilities disabled.`;
  }
  
  return `Player ${playerIndex + 1}: Resource shortage of ${resource}!`;
}

// Remove a defeated unit
export function removeUnit(gameState, unit) {
  // Remove from map
  gameState.map[unit.y][unit.x].unit = null;
  
  // Remove from player's units
  const player = gameState.players[unit.owner - 1];
  player.units = player.units.filter(u => u !== unit);
}

// Process research progress
export function processResearch(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  
  if (player.currentResearch) {
    // Add progress
    player.researchProgress += 20; // Adjust rate as needed
    
    if (player.researchProgress >= 100) {
      completeResearch(gameState, playerIndex);
    }
    
    return true;
  }
  
  return false;
}

// Complete research and apply benefits
export function completeResearch(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  const research = player.currentResearch;
  
  if (!research) return false;
  
  // Add to completed technologies
  player.technologies.push(research);
  
  // Find technology data
  const technologyData = technologies[player.age]?.[research];
  
  if (technologyData) {
    // Unlock units
    if (technologyData.unlocks) {
      technologyData.unlocks.forEach(unitType => {
        if (!player.unlockedUnits.includes(unitType)) {
          player.unlockedUnits.push(unitType);
        }
      });
    }
    
    // Reset research progress
    player.researchProgress = 0;
    player.currentResearch = null;
    
    return `${player.name} completed research: ${research}!`;
  }
  
  return false;
}

// Process age advancement progress
export function processAgeProgress(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  const currentAgeIndex = ages.indexOf(player.age);
  
  // Don't process if player is at max age
  if (currentAgeIndex >= ages.length - 1) return false;
  
  // Automatically progress age based on buildings and technologies
  const techCount = player.technologies.length;
  const buildingCount = player.buildings.length;
  
  // Base progress on developments
  const progressRate = (techCount * 2) + buildingCount;
  
  // Make age advancement harder in later ages
  const ageMultiplier = 1 / (1 + currentAgeIndex * 0.2);
  
  player.ageProgress += progressRate * ageMultiplier;
  
  // Cap at 100%
  if (player.ageProgress > 100) {
    player.ageProgress = 100;
  }
  
  return true;
}

// Advance to the next age
export function advanceAge(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  const currentAgeIndex = ages.indexOf(player.age);
  
  // Check if we can advance
  if (player.ageProgress < 100 || currentAgeIndex >= ages.length - 1) {
    return false;
  }
  
  // Advance to next age
  player.age = ages[currentAgeIndex + 1];
  player.ageProgress = 0;
  
  return `${player.name} advanced to the ${player.age}!`;
}
