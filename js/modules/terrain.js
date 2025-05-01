export const terrainTypes = {
    hills: {
        name: "Hills",
        color: "#996633",
        movementCost: 2,
        defenseBonus: 30,
        description: "Rolling hills with strategic advantages"
    },
    plains: {
        name: "Plains",
        color: "#90EE90",
        movementCost: 1,
        defenseBonus: 0,
        description: "Flat grassland, ideal for farming"
    },
    forest: {
        name: "Forest",
        color: "#228B22",
        movementCost: 2,
        defenseBonus: 25,
        description: "Dense forest, good for lumber"
    },
    mountain: {
        name: "Mountain",
        color: "#808080",
        movementCost: 3,
        defenseBonus: 50,
        description: "Rocky terrain with valuable minerals"
    },
    water: {
        name: "Water",
        color: "#4169E1",
        movementCost: null,
        defenseBonus: -25,
        description: "Impassable except for naval units"
    },
    desert: {
        name: "Desert",
        color: "#F4A460",
        movementCost: 2,
        defenseBonus: -10,
        description: "Arid land with scarce resources"
    }
};
