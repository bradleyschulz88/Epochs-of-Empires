// Building types
export const buildingTypes = {
  hq: { 
    defense: 10, 
    vision: 3, 
    production: { food: 10, wood: 5 }, 
    cost: { gold: 0 },
    description: "Your capital city. Passively produces Food and Wood. Can only train Clubman until Basic Tools is researched.",
    canBuild: false // Cannot build additional capitals
  },
  hunters_hut: { 
    defense: 3, 
    vision: 2, 
    production: { food: 15 }, 
    cost: { wood: 30 },
    description: "Provides food and enables Clubman upkeep. Unlocks additional military units.",
    age: "Stone Age",
    unlocks: ["spearthrower"]
  },
  barracks: { defense: 5, vision: 1, production: { manpower: 10 }, cost: { gold: 50, wood: 20 } },
  market: { defense: 3, vision: 1, production: { gold: 15 }, cost: { gold: 40, wood: 15 } },
  research_center: { defense: 4, vision: 2, production: { techPoints: 5 }, cost: { gold: 80, stone: 30, manpower: 15 } },
  tank_yard: { defense: 6, vision: 1, production: { oil: 5 }, cost: { gold: 60, ironOre: 25, oil: 20 } },
  ship_dock: { defense: 5, vision: 2, production: {}, cost: { gold: 70, wood: 40, oil: 20 } },
  farm: { defense: 2, vision: 1, production: { food: 20 }, cost: { gold: 30, wood: 15 } },
  lumber_mill: { defense: 3, vision: 1, production: { wood: 20 }, cost: { gold: 40, stone: 15 } },
  quarry: { defense: 4, vision: 1, production: { stone: 15 }, cost: { gold: 45, wood: 20 } },
  mine: { defense: 4, vision: 1, production: { ironOre: 15 }, cost: { gold: 60, wood: 25, stone: 15 } },
  coal_mine: { defense: 4, vision: 1, production: { coal: 15 }, cost: { gold: 65, wood: 25, stone: 20 } },
  oil_well: { defense: 3, vision: 1, production: { oil: 20 }, cost: { gold: 70, ironOre: 30 } }
};
