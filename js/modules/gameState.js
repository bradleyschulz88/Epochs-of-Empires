import { ages } from './constants.js';
import { resourcesByAge, resourceTileTypes } from './resources.js';
import { unitTypes } from './units.js';
import { buildingTypes, isWithinCityBorders } from './buildings.js';
import { technologies } from './technologies.js';

// Initial game state
export function createInitialGameState() {
  return {
    currentPlayer: 1,
    turn: 1,
    weather: 'Clear',
    ages: ages, // Store ages here for reference
    players: [
      createPlayerObject(1, "Player", "#4299E1", "England", false),
      createPlayerObject(2, "AI 1", "#F56565", "Germany", true),
      // 3 more AI players that can be activated in game settings
      createPlayerObject(3, "AI 2", "#48BB78", "France", true, true), // inactive by default
      createPlayerObject(4, "AI 3", "#ECC94B", "Japan", true, true),  // inactive by default
      createPlayerObject(5, "AI 4", "#9F7AEA", "Egypt", true, true),  // inactive by default
      createPlayerObject(6, "AI 5", "#ED8936", "Rome", true, true)    // inactive by default
    ],
    map: [],
    worldEvents: [],
    freeForAll: true, // Default mode is Free-for-All
    aiPlayerCount: 1, // Default number of active AI players
    maxPlayers: 6 // Maximum number of players (including human player)
  };
}

// Helper function to create a player object
function createPlayerObject(id, name, color, faction, isAI = false, inactive = false) {
  return {
    id: id,
    name: name,
    color: color,
    faction: faction,
    resources: { 
      food: 100, 
      wood: 100,
      manpower: 10
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
    isAI: isAI,
    inactive: inactive, // Whether this player is active in the current game
    
    // City & Population systems
    cities: [], // Will contain city objects
    totalPopulation: 5, // Starting population
    populationCap: 5, // Base population cap
    happiness: 0, // Happiness modifier (positive boosts growth)
    health: 0, // Health modifier (negative impacts growth)
    
    // Production queues
    buildingQueue: [], // Building construction queue
    unitQueue: [], // Unit production queue
    
    // Trade & Economy
    tradeRoutes: [], // Active trade routes
    prices: {}, // Market price fluctuations
    taxRate: 0 // 0-20% tax rate
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
        
        // Calculate base production
        let productionAmount = buildingType.production[resource];
        
        // Apply adjacent bonuses if applicable
        if (buildingType.adjacentBonus) {
          const bonus = calculateAdjacentBonus(building, buildingType.adjacentBonus, gameState);
          productionAmount += bonus;
        }
        
        // Apply city bonuses if within city
        if (isWithinCity(building.x, building.y, gameState)) {
          // Apply bonus based on city productivity
          const city = getCityAtLocation(building.x, building.y, gameState);
          if (city && city.productivity > 0) {
            productionAmount *= (1 + (city.productivity / 100));
          }
        }
        
        player.resources[resource] += Math.floor(productionAmount);
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
        
        // Apply logistic bonuses for units on roads
        let upkeepAmount = unitData.upkeep[resource];
        if (resource === 'food' && isUnitOnRoad(unit, gameState)) {
          upkeepAmount *= 0.9; // 10% food upkeep reduction on roads
        }
        
        player.upkeep[resource] += Math.floor(upkeepAmount);
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
  
  // Process population food consumption
  processFoodConsumption(gameState, playerIndex);
}

// Process food consumption for population
function processFoodConsumption(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  
  // Base food consumption per population unit
  const baseConsumption = 2;
  const totalConsumption = player.totalPopulation * baseConsumption;
  
  // Apply happiness modifier
  const consumptionWithModifier = Math.floor(totalConsumption * (1 - player.happiness / 100));
  
  // Add to upkeep
  if (!player.upkeep.food) {
    player.upkeep.food = 0;
  }
  player.upkeep.food += consumptionWithModifier;
  
  // Check for food surplus/deficit for population growth/decline
  const foodProduction = calculateTotalResourceProduction(player, 'food');
  const surplus = foodProduction - player.upkeep.food;
  
  if (surplus > 0) {
    // Food surplus increases growth rate
    const growthFactor = 0.1 * (surplus / (player.totalPopulation || 1));
    processPopulationGrowth(gameState, playerIndex, growthFactor);
  } else if (surplus < 0) {
    // Food deficit causes population decline
    const growthFactor = -0.2; // Population declines faster than it grows
    processPopulationGrowth(gameState, playerIndex, growthFactor);
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

// Calculate total production of a specific resource from all sources
function calculateTotalResourceProduction(player, resourceType) {
  let total = 0;
  
  // From buildings
  player.buildings.forEach(building => {
    const buildingType = buildingTypes[building.type];
    if (buildingType && buildingType.production && buildingType.production[resourceType]) {
      total += buildingType.production[resourceType];
    }
  });
  
  // From trade routes
  player.tradeRoutes.forEach(route => {
    if (route.resource === resourceType && route.direction === 'import') {
      total += route.amount;
    }
  });
  
  return total;
}

// Process population growth based on food, happiness, and health
function processPopulationGrowth(gameState, playerIndex, growthFactor) {
  const player = gameState.players[playerIndex];
  
  // Adjust growth factor based on happiness and health
  let adjustedGrowthFactor = growthFactor;
  adjustedGrowthFactor += player.happiness * 0.01; // +1% per happiness point
  adjustedGrowthFactor -= Math.abs(player.health) * 0.02; // -2% per negative health point
  
  // Check if population is at cap
  if (player.totalPopulation >= player.populationCap) {
    // Overcrowding reduces happiness
    player.happiness -= 1;
    return; // No growth beyond cap
  }
  
  // Calculate population growth
  const growthAmount = player.totalPopulation * adjustedGrowthFactor;
  
  // Update population (growth can be negative for population decline)
  player.totalPopulation = Math.max(1, Math.floor(player.totalPopulation + growthAmount));
  
  // Cap at population limit
  player.totalPopulation = Math.min(player.totalPopulation, player.populationCap);
}

// Update population cap based on housing buildings
export function updatePopulationCap(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  
  // Start with base cap from HQ
  let popCap = 5;
  
  // Add cap from housing buildings
  player.buildings.forEach(building => {
    const buildingType = buildingTypes[building.type];
    if (buildingType && buildingType.populationCap) {
      popCap += buildingType.populationCap;
    }
  });
  
  player.populationCap = popCap;
}

// Process research progress
export function processResearch(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  
  if (player.currentResearch) {
    // Calculate base progress
    let progressRate = 20; // Base rate
    
    // Apply research lab bonus
    let researchBonus = 0;
    player.buildings.forEach(building => {
      if (building.type === 'research_lab') {
        researchBonus += buildingTypes['research_lab'].researchBonus;
      }
    });
    
    // Apply bonus
    if (researchBonus > 0) {
      progressRate *= (1 + (researchBonus / 100));
    }
    
    // Add progress
    player.researchProgress += progressRate;
    
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

// Process production queues for buildings and units
export function processProductionQueues(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  
  // Process building queue
  processBuildingQueue(gameState, playerIndex);
  
  // Process unit queue for each production building
  processUnitQueues(gameState, playerIndex);
  
  return true;
}

// Process building construction queue
function processBuildingQueue(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  
  if (player.buildingQueue.length === 0) return;
  
  // Process first item in the queue
  const buildingItem = player.buildingQueue[0];
  buildingItem.progress += 25; // Base progress amount
  
  // Construction completed
  if (buildingItem.progress >= 100) {
    // Create the building
    const newBuilding = {
      type: buildingItem.type,
      owner: player.id,
      x: buildingItem.x,
      y: buildingItem.y
    };
    
    // Add to player's buildings and map
    player.buildings.push(newBuilding);
    gameState.map[buildingItem.y][buildingItem.x].building = {
      type: buildingItem.type,
      owner: player.id
    };
    
    // Remove from queue
    player.buildingQueue.shift();
    
    // Check if building is a city center and create a city if so
    const buildingType = buildingTypes[buildingItem.type];
    if (buildingType.category === "city_center") {
      createNewCity(gameState, playerIndex, buildingItem.x, buildingItem.y);
    }
    
    // Update population cap since a new building might affect it
    updatePopulationCap(gameState, playerIndex);
    
    return {
      completed: true,
      building: newBuilding
    };
  }
  
  return {
    completed: false,
    progress: buildingItem.progress
  };
}

// Process unit production queues for each production building
function processUnitQueues(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  
  // Process each production building's queue
  player.buildings.forEach(building => {
    const buildingType = buildingTypes[building.type];
    
    // Check if it's a production building with a queue
    if (buildingType.category === "production" && building.unitQueue && building.unitQueue.length > 0) {
      // Process first unit in queue
      const unitItem = building.unitQueue[0];
      
      // Calculate production speed
      let productionSpeed = 25; // Base amount of progress per turn
      
      // Get count of similar production buildings for speed bonus
      const similarBuildingCount = player.buildings.filter(b => b.type === building.type).length;
      
      // Speed up production for multiple production centers
      // Formula: BaseTime × (1 – (BuildingCount×0.05))
      const speedMultiplier = 1 + (similarBuildingCount * 0.05);
      productionSpeed *= speedMultiplier;
      
      // Apply technology bonuses
      if (player.technologies.includes("Industrialization")) {
        productionSpeed *= 1.25; // 25% faster with Industrialization
      }
      
      unitItem.progress += productionSpeed;
      
      // Unit production completed
      if (unitItem.progress >= 100) {
        // Create unit near the production building
        const spawnLocation = findValidUnitSpawnLocation(building.x, building.y, gameState);
        
        if (spawnLocation) {
          const newUnit = {
            type: unitItem.type,
            owner: player.id,
            x: spawnLocation.x,
            y: spawnLocation.y,
            health: 100,
            canMove: true
          };
          
          // Add to player's units and map
          player.units.push(newUnit);
          gameState.map[spawnLocation.y][spawnLocation.x].unit = newUnit;
          
          // Remove from queue
          building.unitQueue.shift();
          
          return {
            completed: true,
            unit: newUnit
          };
        }
      }
    }
  });
  
  return {
    completed: false
  };
}

// Find a valid location to spawn a unit near a building
function findValidUnitSpawnLocation(buildingX, buildingY, gameState) {
  const directions = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1], [-1, 1], [-1, 0], [-1, -1]
  ];
  
  for (const [dx, dy] of directions) {
    const x = buildingX + dx;
    const y = buildingY + dy;
    
    // Check bounds
    if (x >= 0 && x < gameState.map.length && y >= 0 && y < gameState.map.length) {
      const tile = gameState.map[y][x];
      
      // Check if tile is valid (no units, no buildings, passable terrain)
      if (!tile.unit && !tile.building && tile.type !== 'water' && tile.type !== 'mountain') {
        return { x, y };
      }
    }
  }
  
  return null; // No valid spawn location found
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
  const cityCount = player.cities.length;
  
  // Base progress on developments
  const progressRate = (techCount * 2) + buildingCount + (cityCount * 3);
  
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
  
  // Any age-up bonuses
  player.happiness += 5; // Temporary happiness boost from advancing
  
  return `${player.name} advanced to the ${player.age}!`;
}

// Create a new city
export function createNewCity(gameState, playerIndex, x, y) {
  const player = gameState.players[playerIndex];
  
  // Create city object
  const newCity = {
    id: player.cities.length + 1,
    name: generateCityName(player),
    x: x,
    y: y,
    buildingId: player.buildings.length, // ID of the city center building
    population: 5, // Starting population
    foodStockpile: 0, // For population growth calculation
    growth: 0, // Current growth progress
    health: 0, // Health modifier
    happiness: 0, // Happiness modifier
    productivity: 0, // Production bonus
    hp: 100, // City hitpoints
    maxHP: 100, // Maximum city hitpoints
    buildings: [], // Buildings within this city's radius
    borderRadius: 3 // Tiles claimed as city territory
  };
  
  // Add city to player
  player.cities.push(newCity);
  
  // Reveal area around city
  const visionRadius = 3; // Default city vision radius
  
  // Return city creation notification
  return `${player.name} founded the city of ${newCity.name}!`;
}

// Generate a city name
function generateCityName(player) {
  // Simple name generator based on faction
  const factionNames = {
    England: ["London", "York", "Oxford", "Cambridge", "Bristol"],
    Germany: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt"],
    France: ["Paris", "Lyon", "Marseille", "Bordeaux", "Toulouse"],
    Egypt: ["Cairo", "Alexandria", "Thebes", "Memphis", "Luxor"]
  };
  
  const names = factionNames[player.faction] || ["Settlement", "Colony", "Outpost", "Fortress", "Village"];
  const cityNumber = player.cities.length + 1;
  
  // Return a name based on the city number
  if (cityNumber <= names.length) {
    return names[cityNumber - 1];
  } else {
    return `${player.name}'s City ${cityNumber}`;
  }
}

// Check if a point is within a city
function isWithinCity(x, y, gameState) {
  return getCityAtLocation(x, y, gameState) !== null;
}

// Get city at a specific location
function getCityAtLocation(x, y, gameState) {
  for (const player of gameState.players) {
    for (const city of player.cities) {
      const distance = Math.sqrt(Math.pow(x - city.x, 2) + Math.pow(y - city.y, 2));
      if (distance <= city.borderRadius) {
        return city;
      }
    }
  }
  return null;
}

// Calculate adjacent bonus for a building
function calculateAdjacentBonus(building, bonusInfo, gameState) {
  const { type, resource, amount } = bonusInfo;
  let bonus = 0;
  
  // Check adjacent tiles for the specified terrain type
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];
  
  for (const [dx, dy] of directions) {
    const newX = building.x + dx;
    const newY = building.y + dy;
    
    if (newX >= 0 && newX < gameState.map.length && newY >= 0 && newY < gameState.map.length) {
      if (gameState.map[newY][newX].type === type) {
        bonus += amount;
      }
    }
  }
  
  return bonus;
}

// Check if a unit is on a road tile
function isUnitOnRoad(unit, gameState) {
  if (unit.x >= 0 && unit.x < gameState.map.length && unit.y >= 0 && unit.y < gameState.map.length) {
    return gameState.map[unit.y][unit.x].type === 'road';
  }
  return false;
}
