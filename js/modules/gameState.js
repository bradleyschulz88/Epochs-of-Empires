import { defaultSettings, ages } from './constants.js';

export function createInitialGameState() {
    const state = {
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
        map: null,
        
        // Check game end conditions
        checkGameEnd: function() {
            const result = {
                ended: false,
                winner: null,
                type: null
            };
            
            // No victory conditions in starter game
            // But we'll implement a placeholder for future expansion
            
            return result;
        },
        
        // Notify players about events
        notifyPlayers: function(notification) {
            // This is a placeholder for future event notification
            console.log("Game notification:", notification);
        }
    };
    
    return state;
}
