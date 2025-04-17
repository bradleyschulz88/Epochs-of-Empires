// Calculate unit cost based on its stats
export function calculateUnitCost(unit) {
  // Base costs - adjust these values for game balance
  const baseCosts = {
    gold: 25,
    wood: 10,
    ironOre: 15,
    food: 10,
    coal: 0,
    oil: 10,
    techPoints: 0
  };
  
  // Calculate factors based on unit stats
  const powerFactor = (unit.hp + unit.attack) / 200;
  const armorFactor = unit.defense / 50;
  const upkeepFactor = unit.move / 2;
  const mobilityFactor = (unit.move + unit.vision) / 10;
  const specialAbilityFactor = (unit.abilities ? unit.abilities.length : 0) * 0.5;
  
  // Calculate final costs
  const cost = {
    gold: Math.round(baseCosts.gold * (1 + powerFactor)),
    wood: Math.round(baseCosts.wood * (1 + powerFactor)),
    ironOre: Math.round(baseCosts.ironOre * (1 + armorFactor)),
    food: Math.round(baseCosts.food * (1 + upkeepFactor)),
    coal: 0,
    oil: 0,
    techPoints: 0
  };
  
  // Only add fuel costs for units with engines
  if (unit.hasEngine) {
    cost.coal = Math.round(baseCosts.coal * (1 + mobilityFactor));
    cost.oil = Math.round(baseCosts.oil * (1 + mobilityFactor));
  }
  
  // Add tech points for advanced units
  if (unit.hasSpecialAbilities) {
    cost.techPoints = Math.round(baseCosts.techPoints * (1 + specialAbilityFactor));
  }
  
  // Zero out any costs that don't apply to this unit type
  for (const resource in cost) {
    if (cost[resource] <= 0) {
      delete cost[resource];
    }
  }
  
  return cost;
}

// Calculate unit maintenance costs
export function calculateUnitUpkeep(unit) {
  const upkeep = {};
  
  // Food consumption - all units require food
  if (unit.move) {
    upkeep.food = Math.floor(10 * (1 + unit.move/5));
  }
  
  // Fuel consumption for units with engines
  if (unit.hasEngine) {
    // Modern units use more oil, older might use coal
    if (unit.age >= 4) { // Renaissance or later
      upkeep.oil = Math.floor(15 * (1 + unit.move/4));
    } else if (unit.age >= 3) { // Medieval
      upkeep.coal = Math.floor(15 * (1 + unit.move/4));
    }
  }
  
  // Tech point upkeep for special units
  if (unit.hasSpecialAbilities && unit.abilities.length > 1) {
    upkeep.techPoints = unit.abilities.length;
  }
  
  return upkeep;
}

// Unit types with expanded definition including age, abilities, and engine info
export const unitTypes = {
  // Stone Age
  clubman: { 
    age: 0, 
    hp: 35, 
    attack: 10, 
    defense: 0, 
    move: 2, 
    vision: 2, 
    type: 'land',
    abilities: [],
    hasEngine: false,
    hasSpecialAbilities: false,
    isStarterUnit: true,
    upkeep: {} // No upkeep until Hunter's Hut is built
  },
  forager: { 
    age: 0, 
    hp: 10, 
    attack: 1, 
    defense: 1, 
    move: 2, 
    vision: 3, 
    type: 'land',
    abilities: ['gather'],
    hasEngine: false,
    hasSpecialAbilities: false
  },
  spearthrower: { 
    age: 0, 
    hp: 10, 
    attack: 4, 
    defense: 1, 
    move: 1, 
    vision: 2, 
    type: 'land',
    abilities: ['ranged'],
    hasEngine: false,
    hasSpecialAbilities: false
  },
  
  // Bronze Age
  spearman: { 
    age: 1, 
    hp: 20, 
    attack: 5, 
    defense: 4, 
    move: 1, 
    vision: 1, 
    type: 'land',
    abilities: ['formation'],
    hasEngine: false,
    hasSpecialAbilities: false
  },
  slinger: { 
    age: 1, 
    hp: 15, 
    attack: 4, 
    defense: 2, 
    move: 1, 
    vision: 2, 
    type: 'land',
    abilities: ['ranged'],
    hasEngine: false,
    hasSpecialAbilities: false
  },
  chariot: { 
    age: 1, 
    hp: 25, 
    attack: 6, 
    defense: 3, 
    move: 3, 
    vision: 2, 
    type: 'land',
    abilities: ['mobility'],
    hasEngine: false,
    hasSpecialAbilities: false
  },
  trireme: { 
    age: 1, 
    hp: 30, 
    attack: 5, 
    defense: 3, 
    move: 2, 
    vision: 3, 
    type: 'sea',
    abilities: ['naval'],
    hasEngine: false,
    hasSpecialAbilities: false
  },
  
  // Iron Age
  swordsman: { 
    age: 2, 
    hp: 30, 
    attack: 8, 
    defense: 6, 
    move: 1, 
    vision: 1, 
    type: 'land',
    abilities: ['formation'],
    hasEngine: false,
    hasSpecialAbilities: false
  },
  axeman: { 
    age: 2, 
    hp: 25, 
    attack: 10, 
    defense: 4, 
    move: 1, 
    vision: 1, 
    type: 'land',
    abilities: [],
    hasEngine: false,
    hasSpecialAbilities: false
  },
  horseman: { 
    age: 2, 
    hp: 35, 
    attack: 8, 
    defense: 4, 
    move: 3, 
    vision: 2, 
    type: 'land',
    abilities: ['mobility'],
    hasEngine: false,
    hasSpecialAbilities: false
  },
  catapult: { 
    age: 2, 
    hp: 20, 
    attack: 12, 
    defense: 2, 
    move: 1, 
    vision: 2, 
    type: 'land',
    abilities: ['siege'],
    hasEngine: false,
    hasSpecialAbilities: true
  },
  
  // Additional unit example for later ages
  tank: {
    age: 5, // Industrial Age
    hp: 90,
    attack: 35,
    defense: 30,
    move: 3,
    vision: 4,
    type: 'land',
    abilities: ['amphibious', 'armor'],
    hasEngine: true,
    hasSpecialAbilities: true
  }
};

// Calculate costs for all units
for (const unitType in unitTypes) {
  const unit = unitTypes[unitType];
  unit.cost = calculateUnitCost(unit);
  unit.upkeep = calculateUnitUpkeep(unit);
}
