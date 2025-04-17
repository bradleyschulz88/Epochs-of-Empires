// Building types organized by categories
export const buildingTypes = {
  // City Center
  hq: { 
    category: "city_center",
    defense: 10, 
    vision: 3, 
    production: { food: 10, wood: 5 }, 
    cost: { gold: 0 },
    description: "Your capital city. Passively produces Food and Wood. Can only train Clubman until Basic Tools is researched.",
    canBuild: false, // Cannot build additional capitals
    populationCap: 5, // Base population cap of 5
    cityBorderRadius: 3 // Establishes city borders with radius of 3 tiles
  },
  
  // Resource Nodes - require adjacent terrain
  farm: { 
    category: "resource_node",
    defense: 2, 
    vision: 1, 
    production: { food: 20 }, 
    cost: { wood: 30 },
    description: "Provides food for your population.",
    age: "Stone Age",
    terrainRequirement: ["plains", "land"],
    buildTime: 3
  },
  logging_camp: { 
    category: "resource_node",
    defense: 2, 
    vision: 1, 
    production: { wood: 20 }, 
    cost: { wood: 15 },
    description: "Harvests wood from forests.",
    age: "Stone Age",
    terrainRequirement: ["forest"],
    buildTime: 3
  },
  quarry: { 
    category: "resource_node",
    defense: 3, 
    vision: 1, 
    production: { stone: 15 }, 
    cost: { wood: 20 },
    description: "Extracts stone from hills and mountains.",
    age: "Bronze Age",
    terrainRequirement: ["hills", "mountain"],
    buildTime: 4
  },
  mine: { 
    category: "resource_node",
    defense: 4, 
    vision: 1, 
    production: { ironOre: 15 }, 
    cost: { wood: 25, stone: 15 },
    description: "Extracts iron ore from mountains.",
    age: "Iron Age",
    terrainRequirement: ["mountain"],
    buildTime: 4
  },
  oil_well: { 
    category: "resource_node",
    defense: 3, 
    vision: 1, 
    production: { oil: 20 }, 
    cost: { ironOre: 30, wood: 20 },
    description: "Extracts oil from specific deposits.",
    age: "Renaissance Age",
    terrainRequirement: ["desert", "water"],
    buildTime: 5
  },
  sulfur_pit: { 
    category: "resource_node",
    defense: 3, 
    vision: 1, 
    production: { sulfur: 15 }, 
    cost: { ironOre: 20, stone: 25 },
    description: "Extracts sulfur for gunpowder and explosives.",
    age: "Renaissance Age",
    terrainRequirement: ["desert", "mountain"],
    buildTime: 5
  },
  
  // Production Buildings - military unit training
  barracks: { 
    category: "production",
    defense: 5, 
    vision: 1, 
    production: { manpower: 10 }, 
    cost: { gold: 50, wood: 20 },
    description: "Trains infantry units.",
    age: "Bronze Age",
    unitType: "infantry",
    requiresCity: true, // Must be built inside city borders
    buildTime: 4,
    queueCapacity: 3 // Can queue up to 3 units
  },
  stables: { 
    category: "production",
    defense: 4, 
    vision: 2, 
    production: { manpower: 5 }, 
    cost: { gold: 60, wood: 30 },
    description: "Trains cavalry units.",
    age: "Bronze Age",
    unitType: "cavalry",
    requiresCity: true,
    buildTime: 5,
    queueCapacity: 3
  },
  dockyard: { 
    category: "production",
    defense: 4, 
    vision: 3, 
    production: {}, 
    cost: { gold: 70, wood: 40 },
    description: "Builds naval vessels.",
    age: "Bronze Age",
    unitType: "naval",
    terrainRequirement: ["water"],
    adjacentRequirement: true, // Must be adjacent to water
    buildTime: 6,
    queueCapacity: 3
  },
  airfield: { 
    category: "production",
    defense: 3, 
    vision: 4, 
    production: {}, 
    cost: { gold: 100, ironOre: 30, oil: 20 },
    description: "Builds and maintains aircraft.",
    age: "Industrial Age",
    unitType: "air",
    requiresCity: true,
    terrainRequirement: ["plains", "land"],
    buildTime: 7,
    queueCapacity: 3
  },
  workshop: { 
    category: "production",
    defense: 4, 
    vision: 1, 
    production: {}, 
    cost: { gold: 80, wood: 30, stone: 20 },
    description: "Builds siege equipment and vehicles.",
    age: "Medieval Age",
    unitType: "siege",
    requiresCity: true,
    buildTime: 5,
    queueCapacity: 3
  },
  
  // Economic Buildings
  market: { 
    category: "economic",
    defense: 3, 
    vision: 1, 
    production: { gold: 15 }, 
    cost: { gold: 40, wood: 15 },
    description: "Enables trade routes and boosts gold income.",
    age: "Bronze Age",
    requiresCity: true,
    tradeRoutes: 2, // Enables 2 trade routes
    buildTime: 4
  },
  research_lab: { 
    category: "economic",
    defense: 3, 
    vision: 2, 
    production: { techPoints: 5 }, 
    cost: { gold: 60, stone: 20 },
    description: "Produces tech points and speeds up research.",
    age: "Bronze Age",
    requiresCity: true,
    researchBonus: 20, // +20% research output
    buildTime: 5
  },
  treasury: { 
    category: "economic",
    defense: 5, 
    vision: 1, 
    production: { gold: 10 }, 
    cost: { gold: 50, stone: 30 },
    description: "Stores wealth and improves gold income.",
    age: "Medieval Age",
    requiresCity: true,
    goldBonus: 15, // +15% gold from all sources
    buildTime: 5
  },
  
  // Defenses & Wonders
  wall: { 
    category: "defense",
    defense: 15, 
    vision: 2, 
    production: {}, 
    cost: { stone: 40 },
    description: "Increases city HP and defense.",
    age: "Bronze Age",
    requiresCity: true,
    cityHPBonus: 50, // +50 city HP
    buildTime: 4
  },
  tower: { 
    category: "defense",
    defense: 10, 
    vision: 4, // Good for vision
    production: {}, 
    cost: { stone: 30, wood: 15 },
    description: "Provides vision and can attack enemies.",
    age: "Bronze Age",
    attack: 15, // Can attack with strength 15
    range: 2, // Can attack up to 2 tiles away
    buildTime: 4
  },
  
  // Housing Buildings
  house: { 
    category: "housing",
    defense: 2, 
    vision: 1, 
    production: {}, 
    cost: { wood: 20 },
    description: "Basic housing that increases population cap.",
    age: "Stone Age",
    requiresCity: true,
    populationCap: 2, // +2 population cap
    buildTime: 3
  },
  manor: { 
    category: "housing",
    defense: 3, 
    vision: 1, 
    production: {}, 
    cost: { wood: 30, stone: 15, gold: 10 },
    description: "Improved housing with luxury perks.",
    age: "Medieval Age",
    requiresCity: true,
    populationCap: 4, // +4 population cap
    happiness: 5, // +5 happiness
    buildTime: 4
  },
  tenement: { 
    category: "housing",
    defense: 3, 
    vision: 1, 
    production: {}, 
    cost: { wood: 25, stone: 25, ironOre: 10 },
    description: "Dense housing for industrial cities.",
    age: "Industrial Age",
    requiresCity: true,
    populationCap: 6, // +6 population cap
    happiness: -2, // -2 happiness (overcrowding)
    buildTime: 3
  },
  
  // Additional resource buildings
  hunters_hut: { 
    category: "resource_node",
    defense: 3, 
    vision: 2, 
    production: { food: 15 }, 
    cost: { wood: 30 },
    description: "Provides food and enables Clubman upkeep. Unlocks additional military units.",
    age: "Stone Age",
    unlocks: ["spearthrower"],
    buildTime: 3
  },
  lumber_mill: { 
    category: "resource_node",
    defense: 3, 
    vision: 1, 
    production: { wood: 25 }, 
    cost: { gold: 40, stone: 15 },
    description: "Improves wood production from nearby forests.",
    age: "Bronze Age",
    terrainRequirement: ["plains", "land"],
    adjacentBonus: {type: "forest", resource: "wood", amount: 5},
    buildTime: 4
  },
  coal_mine: { 
    category: "resource_node",
    defense: 4, 
    vision: 1, 
    production: { coal: 15 }, 
    cost: { gold: 65, wood: 25, stone: 20 },
    age: "Renaissance Age",
    terrainRequirement: ["mountain"],
    buildTime: 5
  }
};

// Building category descriptions
export const buildingCategories = {
  city_center: "Central buildings that establish city centers and borders",
  resource_node: "Resource-producing buildings that require specific adjacent terrain",
  production: "Military production buildings for training different unit types",
  economic: "Buildings that improve your economy and research",
  defense: "Defensive structures to protect your cities",
  housing: "Buildings that increase your population capacity",
  wonder: "Special projects that provide unique bonuses and can lead to victory"
};

// Get all buildings of a specific category
export function getBuildingsByCategory(category) {
  return Object.entries(buildingTypes)
    .filter(([_, building]) => building.category === category)
    .map(([key, _]) => key);
}

// Check if a building can be placed at a specific location
export function canPlaceBuilding(buildingType, x, y, gameState) {
  const building = buildingTypes[buildingType];
  const tile = gameState.map[y][x];
  const currentPlayer = gameState.currentPlayer;
  
  // Check if tile already has a building or unit
  if (tile.building || tile.unit) {
    return { canPlace: false, reason: "Tile already occupied" };
  }
  
  // Check terrain requirements
  if (building.terrainRequirement && !building.terrainRequirement.includes(tile.type)) {
    return { 
      canPlace: false, 
      reason: `Requires ${building.terrainRequirement.join(" or ")} terrain` 
    };
  }
  
  // Check adjacent terrain requirements
  if (building.adjacentRequirement) {
    const hasAdjacentTerrain = checkAdjacentTerrain(x, y, building.terrainRequirement, gameState.map);
    if (!hasAdjacentTerrain) {
      return { 
        canPlace: false, 
        reason: `Must be adjacent to ${building.terrainRequirement.join(" or ")}` 
      };
    }
  }
  
  // Check if building requires city borders
  if (building.requiresCity) {
    const withinCity = isWithinCityBorders(x, y, currentPlayer, gameState);
    if (!withinCity) {
      return { canPlace: false, reason: "Must be built within city borders" };
    }
  }
  
  return { canPlace: true, reason: "Valid build location" };
}

// Check if a location has adjacent tiles of the required terrain type
function checkAdjacentTerrain(x, y, requiredTypes, map) {
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];
  
  for (const [dx, dy] of directions) {
    const newX = x + dx;
    const newY = y + dy;
    
    if (newX >= 0 && newX < map.length && newY >= 0 && newY < map.length) {
      if (requiredTypes.includes(map[newY][newX].type)) {
        return true;
      }
    }
  }
  
  return false;
}

// Check if a location is within city borders
export function isWithinCityBorders(x, y, playerID, gameState) {
  const player = gameState.players[playerID - 1];
  
  for (const building of player.buildings) {
    if (buildingTypes[building.type].category === "city_center") {
      const cityX = building.x;
      const cityY = building.y;
      const cityRadius = buildingTypes[building.type].cityBorderRadius || 3;
      
      const distance = Math.sqrt(Math.pow(x - cityX, 2) + Math.pow(y - cityY, 2));
      if (distance <= cityRadius) {
        return true;
      }
    }
  }
  
  return false;
}
