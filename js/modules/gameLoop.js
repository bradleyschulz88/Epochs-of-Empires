// Game loop manager to coordinate all optimization systems
export class GameLoopManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.isRunning = false;
        this.lastTimestamp = 0;
        this.fps = 60;
        this.frameInterval = 1000 / this.fps;
        this.accumulator = 0;
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTimestamp = performance.now();
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }

    stop() {
        this.isRunning = false;
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        this.accumulator += deltaTime;

        // Update game state at fixed time steps
        while (this.accumulator >= this.frameInterval) {
            this.update(this.frameInterval);
            this.accumulator -= this.frameInterval;
        }

        // Render at screen refresh rate
        this.render();

        // Queue next frame
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    update(deltaTime) {
        // Update game systems
        this.updateResources();
        this.updateUnits();
        this.updateBuildings();
        this.checkVictoryConditions();
    }

    updateResources() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer - 1];
        
        // Process resource production from buildings
        currentPlayer.buildings.forEach(building => {
            if (building.production) {
                for (const [resource, amount] of Object.entries(building.production)) {
                    currentPlayer.resources[resource] = (currentPlayer.resources[resource] || 0) + amount * 0.016; // Scale for 60fps
                }
            }
        });

        // Process resource consumption (upkeep)
        if (currentPlayer.upkeep) {
            for (const [resource, amount] of Object.entries(currentPlayer.upkeep)) {
                currentPlayer.resources[resource] = Math.max(0, 
                    (currentPlayer.resources[resource] || 0) - amount * 0.016); // Scale for 60fps
            }
        }
    }

    updateUnits() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer - 1];
        
        // Process unit actions and updates
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                if (tile.unit && tile.unit.owner === this.gameState.currentPlayer) {
                    // Heal units over time if they're not at full health
                    if (tile.unit.health < 100) {
                        tile.unit.health = Math.min(100, tile.unit.health + 0.1); // Slow healing rate
                    }

                    // Update unit status effects
                    if (tile.unit.statusEffects) {
                        for (const effect of tile.unit.statusEffects) {
                            effect.duration--;
                            if (effect.duration <= 0) {
                                tile.unit.statusEffects = tile.unit.statusEffects.filter(e => e !== effect);
                            }
                        }
                    }
                }
            });
        });
    }

    updateBuildings() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer - 1];
        
        // Process buildings under construction
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                if (tile.buildingInProgress && tile.buildingInProgress.owner === this.gameState.currentPlayer) {
                    tile.buildingInProgress.progress += 0.016; // Scale for 60fps
                    if (tile.buildingInProgress.progress >= tile.buildingInProgress.buildTime) {
                        // Complete construction
                        tile.building = {
                            type: tile.buildingInProgress.type,
                            owner: tile.buildingInProgress.owner
                        };
                        tile.buildingInProgress = null;
                    }
                }
            });
        });
    }

    checkVictoryConditions() {
        const gameEnd = this.gameState.checkGameEnd();
        if (gameEnd.ended) {
            this.stop();
            alert(`Game Over! ${gameEnd.winner.name} wins by ${gameEnd.type}!`);
        }
    }

    render() {
        // Trigger a debounced render through the game's render system
        window.debouncedRender();
    }
}