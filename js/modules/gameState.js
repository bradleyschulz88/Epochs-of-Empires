import { defaultSettings, ages } from './constants.js';

export function createInitialGameState() {
    return {
        mapSize: defaultSettings.mapSize,
        mapType: defaultSettings.mapType,
        resourceDensity: defaultSettings.resourceDensity,
        aiDifficulty: defaultSettings.aiDifficulty,
        fogOfWarEnabled: defaultSettings.fogOfWar,
        aiPlayerCount: defaultSettings.aiPlayerCount,
        gameStarted: false,
        turn: 1,
        currentPlayer: 1,
        ages: ages,
        players: [
            {
                index: 1,
                name: "Player 1",
                type: "human",
                age: ages[0],
                resources: {
                    food: 100,
                    wood: 100,
                    stone: 50,
                    gold: 0
                },
                technologies: [],
                units: [],
                buildings: [],
                buildingQueue: [],
                unlockedUnits: ["settler", "warrior"],
                happiness: 100,
                health: 100,
                totalPopulation: 5,
                populationCap: 10,
                ageProgress: 0
            }
        ],
        map: null
    };
}
