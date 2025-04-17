// Game constants
export const tileSize = 40;
export const mapSize = 50; // Increased for "Huge" map
export const ages = ['Stone Age', 'Bronze Age', 'Iron Age', 'Medieval Age', 'Renaissance Age', 'Industrial Age', 'Imperial Age', 'Great War Age'];
export const historicalYears = ['3000 BCE', '2000 BCE', '1000 BCE', '500 CE', '1400 CE', '1800 CE', '1900 CE', '1914 CE'];

// Faction definitions with bonuses
export const factions = {
  England: {
    woodGatheringBonus: 0.1,       // +10% Wood gathering
    dockyardShipBonus: 0.1         // Dockyards build ships 10% faster
  },
  Germany: {
    ironMiningBonus: 0.15,         // +15% Iron Ore mining
    earlyTanksMoveBonus: 1         // Early Tanks move +1 on plains
  },
  France: {
    farmFoodBonus: 0.1,            // +10% Food from farms
    cavalryAttackBonus: 5          // Cavalry attack +5 vs. infantry
  },
  Spain: {
    tradeRouteGoldBonus: 5,        // +5 Gold/turn from trade routes
    conquistadorCostReduction: 10  // Conquistador unit cost –10 Food
  },
  USA: {
    techGenerationBonus: 0.1,      // +10% Tech Point generation
    riflemanCostReduction: 5       // Riflemen cost –5 Gold
  },
  China: {
    forestWoodBonus: 0.1,          // +10% Wood from forests
    gunpowderCostReduction: 5      // Early gunpowder units cost –5 Coal
  },
  Japan: {
    navalSpeedBonus: 0.1,          // +10% speed for naval units
    samuraiAttackBonus: 2          // Samurai (unique infantry) gains +2 Atk
  },
  Russia: {
    foragingFoodBonus: 0.15,       // +15% Food from foraging
    tundraMovementBonus: 1         // Tundra units ignore 1 terrain penalty
  },
  India: {
    spiceTradeGoldBonus: 0.1,      // +10% Gold from spice trade
    elephantCostReduction: 10      // Elephants cost –10 Food
  },
  Ottoman: {
    stoneQuarryBonus: 0.1,         // +10% Stone from quarries
    janissaryAttackBonus: 3        // Janissary (unique rifle) gains +3 Atk
  },
  Brazil: {
    rainforestWoodBonus: 0.1,      // +10% Wood from rainforests
    scoutVisionBonus: 2            // Stealth Scout (unique cavalry) vision +2
  },
  Egypt: {
    desertStoneBonus: 0.1,         // +10% Stone from desert quarries
    chariotArcherRangeBonus: 1     // Chariot Archer range +1
  }
};

// World event types
export const worldEvents = {
  plague: {
    name: "Plague",
    description: "A terrible plague has struck! -25% Food & Population growth for all players for 10 turns.",
    duration: 10,
    effects: {
      foodProduction: -0.25,
      populationGrowth: -0.25
    }
  },
  volcanicEruption: {
    name: "Volcanic Eruption",
    description: "A volcano has erupted! A 3-tile radius has been cleared, but grants +100 Stone to any player who claims those tiles.",
    duration: 1,
    effects: {
      clearRadius: 3,
      stoneBonus: 100
    }
  },
  solarFlare: {
    name: "Solar Flare",
    description: "A solar flare has disrupted electronic systems! All electronic units (Cyber, Drone) are disabled for 1 turn.",
    duration: 1,
    effects: {
      disableElectronics: true
    },
    minAge: 6 // Only occurs in Imperial Age or later
  }
};

// Diplomacy options
export const diplomacyOptions = {
  tradeTreaty: {
    name: "Trade Treaty",
    description: "Create a per-turn exchange of resources valid for a set number of turns",
    minDuration: 5,
    maxDuration: 20
  },
  nonAggressionPact: {
    name: "Non-Aggression Pact",
    description: "Ceasefire for a set number of turns; breaking it gives you the Warmonger status",
    minDuration: 10,
    maxDuration: 30,
    breakPenalty: {
      name: "Warmonger",
      duration: 5,
      effect: "All AI players refuse trades"
    }
  }
};

// Advanced logistics
export const logistics = {
  road: {
    name: "Road Network",
    description: "Increases unit movement by +1 and reduces Food upkeep by 10% for units traveling on roads",
    buildCost: { wood: 20, stone: 10 },
    movementBonus: 1,
    upkeepReduction: 0.1
  },
  transportUnits: {
    wagon: {
      name: "Wagon",
      type: "land",
      capacity: 100,
      move: 2,
      cost: { wood: 30, ironOre: 10 }
    },
    transportShip: {
      name: "Transport Ship",
      type: "naval",
      capacity: 200,
      move: 3,
      cost: { wood: 50, ironOre: 20, coal: 10 }
    }
  }
};
