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
        if (!this.gameState || !this.gameState.players || this.gameState.currentPlayer < 1) {
            return; // Skip if game state isn't properly initialized
        }
        
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer - 1];
        if (!currentPlayer) {
            console.warn("Cannot find current player");
            return;
        }
        
        // Process resource production from buildings (with null check)
        if (currentPlayer.buildings && Array.isArray(currentPlayer.buildings)) {
            currentPlayer.buildings.forEach(building => {
                if (building && building.production) {
                    for (const [resource, amount] of Object.entries(building.production)) {
                        // Initialize resources if needed
                        if (!currentPlayer.resources) {
                            currentPlayer.resources = {};
                        }
                        currentPlayer.resources[resource] = (currentPlayer.resources[resource] || 0) + amount * 0.016; // Scale for 60fps
                    }
                }
            });
        }

        // Process resource consumption (upkeep)
        if (currentPlayer.upkeep) {
            for (const [resource, amount] of Object.entries(currentPlayer.upkeep)) {
                // Initialize resources if needed
                if (!currentPlayer.resources) {
                    currentPlayer.resources = {};
                }
                currentPlayer.resources[resource] = Math.max(0, 
                    (currentPlayer.resources[resource] || 0) - amount * 0.016); // Scale for 60fps
            }
        }
    }

    updateUnits() {
        if (!this.gameState || !this.gameState.players || this.gameState.currentPlayer < 1) {
            return; // Skip if game state isn't properly initialized
        }
        
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer - 1];
        if (!currentPlayer) {
            console.warn("Cannot find current player");
            return;
        }
        
        // Process unit actions and updates (with null checks)
        if (this.gameState.map && Array.isArray(this.gameState.map)) {
            this.gameState.map.forEach(row => {
                if (row && Array.isArray(row)) {
                    row.forEach(tile => {
                        if (tile && tile.unit && tile.unit.owner === this.gameState.currentPlayer) {
                            // Heal units over time if they're not at full health
                            if (typeof tile.unit.health === 'number' && tile.unit.health < 100) {
                                tile.unit.health = Math.min(100, tile.unit.health + 0.1); // Slow healing rate
                            }

                            // Update unit status effects
                            if (tile.unit.statusEffects && Array.isArray(tile.unit.statusEffects)) {
                                for (const effect of tile.unit.statusEffects) {
                                    if (effect) {
                                        effect.duration--;
                                        if (effect.duration <= 0) {
                                            tile.unit.statusEffects = tile.unit.statusEffects.filter(e => e !== effect);
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            });
        }
    }

    updateBuildings() {
        if (!this.gameState || !this.gameState.players || this.gameState.currentPlayer < 1) {
            return; // Skip if game state isn't properly initialized
        }
        
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer - 1];
        if (!currentPlayer) {
            console.warn("Cannot find current player");
            return;
        }
        
        // Process buildings under construction (with null checks)
        if (this.gameState.map && Array.isArray(this.gameState.map)) {
            this.gameState.map.forEach(row => {
                if (row && Array.isArray(row)) {
                    row.forEach(tile => {
                        if (tile && tile.buildingInProgress && 
                            tile.buildingInProgress.owner === this.gameState.currentPlayer) {
                            
                            tile.buildingInProgress.progress = 
                                (tile.buildingInProgress.progress || 0) + 0.016; // Scale for 60fps
                                
                            if (tile.buildingInProgress.progress >= 
                                (tile.buildingInProgress.buildTime || 10)) { // Default build time if missing
                                
                                // Complete construction
                                tile.building = {
                                    type: tile.buildingInProgress.type,
                                    owner: tile.buildingInProgress.owner
                                };
                                tile.buildingInProgress = null;
                            }
                        }
                    });
                }
            });
        }
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
        if (typeof window.debouncedRender === 'function') {
            window.debouncedRender();
        } else {
            console.warn("debouncedRender is not available yet");
            // Fallback to direct rendering if needed
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const minimap = document.getElementById('minimap');
                if (minimap) {
                    const minimapCtx = minimap.getContext('2d');
                    const canvasData = {
                        canvas,
                        ctx,
                        minimap,
                        minimapCtx,
                        tileSize: 30, // Default value
                        minimapTileSize: 4, // Default value
                        fogOfWarEnabled: this.gameState.fogOfWarEnabled,
                        selectedUnit: this.gameState.selectedUnit,
                        mouseX: 0,
                        mouseY: 0,
                        cameraOffsetX: 0,
                        cameraOffsetY: 0
                    };
                    
                    // Import render function dynamically if we can
                    import('./ui.js').then(ui => {
                        if (typeof ui.render === 'function') {
                            ui.render(this.gameState, canvasData);
                        }
                    }).catch(err => console.error("Failed to render:", err));
                }
            }
        }
    }
}
