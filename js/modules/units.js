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
    settler: {
        name: "Settler",
        type: "civilian",
        cost: { food: 50, wood: 30 },
        move: 2,
        defense: 1,
        buildTime: 5,
        age: "Stone Age",
        abilities: ["build", "found_city"],
        description: "Can found new cities and build improvements"
    },
    warrior: {
        name: "Warrior",
        type: "military",
        cost: { food: 30, wood: 20 },
        move: 2,
        attack: 3,
        defense: 2,
        buildTime: 3,
        age: "Stone Age",
        abilities: ["melee"],
        description: "Basic military unit for early combat"
    }
};

// Calculate costs for all units
for (const unitType in unitTypes) {
  const unit = unitTypes[unitType];
  unit.cost = calculateUnitCost(unit);
  unit.upkeep = calculateUnitUpkeep(unit);
}
