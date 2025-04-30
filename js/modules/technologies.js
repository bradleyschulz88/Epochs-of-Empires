// Technology tree
export const technologies = {
    'Stone Age': {
        agriculture: {
            name: "Agriculture",
            cost: 50,
            prerequisites: [],
            description: "Enables farms and increases food production",
            effects: {
                unlocksBuildings: ['farm'],
                resourceBonus: { food: 1.2 }
            }
        },
        toolmaking: {
            name: "Tool Making",
            cost: 40,
            prerequisites: [],
            description: "Improves resource gathering efficiency",
            effects: {
                resourceBonus: { wood: 1.2, stone: 1.2 }
            }
        },
        hunting: {
            name: "Hunting",
            cost: 30,
            prerequisites: [],
            description: "Enables hunter's huts and improves food gathering",
            effects: {
                unlocksBuildings: ['hunters_hut'],
                resourceBonus: { food: 1.1 }
            }
        }
    },
    'Bronze Age': {
        metalworking: {
            name: "Metalworking",
            cost: 80,
            prerequisites: ['toolmaking'],
            description: "Enables metal tools and weapons",
            effects: {
                unlocksResources: ['copper'],
                unlocksBuildings: ['forge']
            }
        },
        construction: {
            name: "Construction",
            cost: 70,
            prerequisites: ['agriculture'],
            description: "Enables advanced buildings",
            effects: {
                unlocksBuildings: ['storehouse', 'granary']
            }
        },
        writing: {
            name: "Writing",
            cost: 60,
            prerequisites: [],
            description: "Improves research speed",
            effects: {
                researchSpeedBonus: 1.2
            }
        }
    }
};
