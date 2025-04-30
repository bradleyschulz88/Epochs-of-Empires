// Building categories and their descriptions
export const buildingCategories = {
    resource_node: "Resource Gathering",
    production: "Unit Production",
    economic: "Economic",
    defense: "Defensive",
    housing: "Population"
};

// Building types and their properties
export const buildingTypes = {
    farm: {
        name: "Farm",
        category: "resource_node",
        cost: { wood: 50 },
        production: { food: 5 },
        buildTime: 2,
        age: "Stone Age",
        terrainRequirement: ["plains"],
        description: "Produces food from fertile plains"
    },
    house: {
        name: "House",
        category: "housing",
        cost: { wood: 40, stone: 20 },
        populationBonus: 5,
        buildTime: 3,
        age: "Stone Age",
        description: "Provides housing for additional population"
    },
    logging_camp: {
        name: "Logging Camp",
        category: "resource_node",
        cost: { wood: 30 },
        production: { wood: 3 },
        buildTime: 2,
        age: "Stone Age",
        terrainRequirement: ["forest"],
        description: "Harvests wood from forests"
    },
    hunters_hut: {
        name: "Hunter's Hut",
        category: "resource_node",
        cost: { wood: 40 },
        production: { food: 3 },
        buildTime: 2,
        age: "Stone Age",
        terrainRequirement: ["forest"],
        description: "Gathers food from hunting"
    }
};

// Resource extractors mapping
export const resourceExtractors = {
    food: ['farm', 'hunters_hut'],
    wood: ['logging_camp']
};
