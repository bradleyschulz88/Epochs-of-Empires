export class EventHandler {
    constructor(gameState, viewport) {
        this.gameState = gameState;
        this.viewport = viewport;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        // Mouse events
        canvas.addEventListener('mousedown', (e) => {
            if (this.isOverlayVisible()) return;
            this.handleMouseDown(e);
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this.isOverlayVisible()) return;
            this.handleMouseMove(e);
        });

        canvas.addEventListener('mouseup', (e) => {
            if (this.isOverlayVisible()) return;
            this.handleMouseUp(e);
        });

        canvas.addEventListener('wheel', (e) => {
            if (this.isOverlayVisible()) return;
            this.handleMouseWheel(e);
        });

        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => {
            if (this.isOverlayVisible()) return;
            this.handleTouchStart(e);
        });

        canvas.addEventListener('touchmove', (e) => {
            if (this.isOverlayVisible()) return;
            this.handleTouchMove(e);
        });

        canvas.addEventListener('touchend', (e) => {
            if (this.isOverlayVisible()) return;
            this.handleTouchEnd(e);
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (this.isOverlayVisible()) return;
            this.handleKeyDown(e);
        });
    }

    isOverlayVisible() {
        const startMenuOverlay = document.getElementById('startMenuOverlay');
        const loadingOverlay = document.querySelector('.loading-overlay');
        const settingsOverlay = document.getElementById('settingsOverlay');
        
        return (startMenuOverlay && startMenuOverlay.style.display !== 'none') ||
               (loadingOverlay && loadingOverlay.style.display !== 'none') ||
               (settingsOverlay && settingsOverlay.style.display !== 'none');
    }

    handleMouseDown(e) {
        const rect = e.target.getBoundingClientRect();
        this.dragStartX = e.clientX - rect.left;
        this.dragStartY = e.clientY - rect.top;
        this.isDragging = true;

        // Handle tile selection
        const hexCoords = this.viewport.screenToHex(this.dragStartX, this.dragStartY);
        this.handleTileSelection(hexCoords);
    }

    handleMouseMove(e) {
        const rect = e.target.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;

        if (this.isDragging) {
            const deltaX = this.mouseX - this.dragStartX;
            const deltaY = this.mouseY - this.dragStartY;
            
            this.viewport.pan(deltaX, deltaY);
            
            this.dragStartX = this.mouseX;
            this.dragStartY = this.mouseY;
        }
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    handleMouseWheel(e) {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        this.viewport.zoom(zoomDelta, this.mouseX, this.mouseY);
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = e.target.getBoundingClientRect();
            this.dragStartX = touch.clientX - rect.left;
            this.dragStartY = touch.clientY - rect.top;
            this.isDragging = true;
        }
    }

    handleTouchMove(e) {
        if (this.isDragging && e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = e.target.getBoundingClientRect();
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;

            const deltaX = this.mouseX - this.dragStartX;
            const deltaY = this.mouseY - this.dragStartY;
            
            this.viewport.pan(deltaX, deltaY);
            
            this.dragStartX = this.mouseX;
            this.dragStartY = this.mouseY;
        }
    }

    handleTouchEnd() {
        this.isDragging = false;
    }

    handleKeyDown(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.viewport.pan(50, 0);
                break;
            case 'ArrowRight':
                this.viewport.pan(-50, 0);
                break;
            case 'ArrowUp':
                this.viewport.pan(0, 50);
                break;
            case 'ArrowDown':
                this.viewport.pan(0, -50);
                break;
            case '+':
                this.viewport.zoom(1.1);
                break;
            case '-':
                this.viewport.zoom(0.9);
                break;
        }
    }

    handleTileSelection(hexCoords) {
        const tile = this.getTileAt(hexCoords);
        if (!tile) return;

        if (!tile.discovered[this.gameState.currentPlayer - 1]) {
            // Handle fog of war
            this.handleFogOfWar(hexCoords);
            return;
        }

        if (this.gameState.selectedBuildingType) {
            // Handle building placement
            this.handleBuildingPlacement(hexCoords);
        } else if (tile.unit && tile.unit.owner === this.gameState.currentPlayer) {
            // Handle unit selection
            this.handleUnitSelection(tile.unit);
        } else if (this.gameState.selectedUnit) {
            // Handle unit movement or attack
            this.handleUnitAction(hexCoords);
        }
    }

    getTileAt(hexCoords) {
        const { q, r } = hexCoords;
        if (q < 0 || q >= this.gameState.mapSize || r < 0 || r >= this.gameState.mapSize) {
            return null;
        }
        return this.gameState.map[r][q];
    }

    handleFogOfWar(hexCoords) {
        // Import the revealArea function if it's not available in the current scope
        if (typeof window.revealArea === 'function') {
            // Use globally available function
            window.revealArea(this.gameState, hexCoords.q, hexCoords.r, 2, this.gameState.currentPlayer - 1);
        } else {
            // Dynamically import the function
            import('../modules/map.js').then(mapModule => {
                mapModule.revealArea(this.gameState, hexCoords.q, hexCoords.r, 2, this.gameState.currentPlayer - 1);
            }).catch(error => {
                console.error("Error importing revealArea function:", error);
            });
        }
        
        if (this.gameState.selectedUnit) {
            // Import canMoveToTile from movement.js
            import('../modules/movement.js').then(movementModule => {
                if (movementModule.canMoveToTile) {
                    const moveResult = movementModule.canMoveToTile(
                        this.gameState.selectedUnit,
                        this.gameState.selectedUnit.x,
                        this.gameState.selectedUnit.y,
                        hexCoords.q,
                        hexCoords.r,
                        this.gameState.map,
                        true // Allow moving through fog of war
                    );
                    
                    if (moveResult.canMove) {
                        this.handleUnitMovement(this.gameState.selectedUnit, hexCoords);
                    }
                } else {
                    console.error("canMoveToTile function not found in movement module");
                }
            }).catch(error => {
                console.error("Error importing movement module:", error);
            });
        }
    }

    handleBuildingPlacement(hexCoords) {
        // Import buildStructure from gameEvents.js
        import('../modules/gameEvents.js').then(gameEventsModule => {
            if (gameEventsModule.buildStructure) {
                const success = gameEventsModule.buildStructure(this.gameState, hexCoords.q, hexCoords.r);
                if (success) {
                    this.gameState.selectedBuildingType = null;
                }
            } else {
                console.error("buildStructure function not found in gameEvents module");
            }
        }).catch(error => {
            console.error("Error importing gameEvents module:", error);
        });
    }

    handleUnitSelection(unit) {
        // Set the selected unit in the game state
        this.gameState.selectedUnit = unit;
        
        // Show unit actions panel via DOM
        const unitActionsContainer = document.getElementById('unit-actions-container');
        if (unitActionsContainer) {
            // Update unit info in the panel
            if (typeof window.updateUnitActionsPanel === 'function') {
                window.updateUnitActionsPanel(unit);
            } else {
                // Fallback to showing the panel if the function doesn't exist
                unitActionsContainer.style.display = 'block';
                
                // Update unit info if possible
                const selectedUnitInfo = document.getElementById('selected-unit-info');
                if (selectedUnitInfo) {
                    const unitInfo = `
                        <div style="margin: 10px 0;">
                            <strong>${unit.type}</strong><br>
                            Health: ${unit.health || 100}%<br>
                            Movement: ${unit.remainingMP || 2}/2<br>
                        </div>
                    `;
                    selectedUnitInfo.innerHTML = unitInfo;
                }
            }
        }
    }

    handleUnitAction(hexCoords) {
        const tile = this.getTileAt(hexCoords);
        if (!tile) return;

        if (this.gameState.unitActionMode === 'move') {
            this.handleUnitMovement(this.gameState.selectedUnit, hexCoords);
        } else if (this.gameState.unitActionMode === 'attack') {
            this.handleUnitAttack(this.gameState.selectedUnit, tile);
        } else {
            // Direct movement if no specific action mode
            // Import canMoveToTile from movement.js if needed
            import('../modules/movement.js').then(movementModule => {
                if (movementModule.canMoveToTile) {
                    const moveResult = movementModule.canMoveToTile(
                        this.gameState.selectedUnit,
                        this.gameState.selectedUnit.x,
                        this.gameState.selectedUnit.y,
                        hexCoords.q,
                        hexCoords.r,
                        this.gameState.map
                    );
                    
                    if (moveResult.canMove) {
                        this.handleUnitMovement(this.gameState.selectedUnit, hexCoords);
                    }
                } else {
                    console.error("canMoveToTile function not found in movement module");
                }
            }).catch(error => {
                console.error("Error importing movement module:", error);
            });
        }
    }

    handleUnitMovement(unit, hexCoords) {
        // Import moveUnit from movement.js if needed
        import('../modules/movement.js').then(movementModule => {
            if (movementModule.moveUnit) {
                const success = movementModule.moveUnit(
                    unit, 
                    hexCoords.q, 
                    hexCoords.r, 
                    this.gameState.map,
                    (message) => console.log(message)
                );
                
                if (success) {
                    // Update UI
                    if (typeof window.updateUnitActionsPanel === 'function') {
                        window.updateUnitActionsPanel(unit);
                    }
                    
                    // Clear selected unit if out of movement points
                    if (unit.remainingMP <= 0) {
                        this.gameState.selectedUnit = null;
                        
                        // Hide unit actions panel if it exists
                        const unitActionsContainer = document.getElementById('unit-actions-container');
                        if (unitActionsContainer) {
                            unitActionsContainer.style.display = 'none';
                        }
                    }
                }
            } else {
                console.error("moveUnit function not found in movement module");
            }
        }).catch(error => {
            console.error("Error importing movement module:", error);
        });
    }

    handleUnitAttack(attackingUnit, targetTile) {
        if (targetTile.unit && targetTile.unit.owner !== this.gameState.currentPlayer) {
            // Import the attackUnit function or use a local implementation
            if (typeof window.attackUnit === 'function') {
                window.attackUnit(attackingUnit, targetTile.unit);
            } else {
                // Fallback to a simple attack implementation
                this.simpleAttack(attackingUnit, targetTile.unit);
            }
        }
    }
    
    // Simple attack implementation as a fallback
    simpleAttack(attackingUnit, defendingUnit) {
        // Get unit types
        const unitTypes = window.unitTypes || {
            // Default unit type info if not available
            warrior: { attack: 10, defense: 10 },
            archer: { attack: 15, defense: 5 },
            settler: { attack: 2, defense: 2 }
        };
        
        const attackerType = unitTypes[attackingUnit.type] || { attack: 5 };
        const defenderType = unitTypes[defendingUnit.type] || { defense: 5 };
        
        // Calculate damage
        const damage = Math.floor((attackerType.attack / defenderType.defense) * 20);
        
        // Apply damage
        if (!defendingUnit.health) defendingUnit.health = 100;
        defendingUnit.health -= damage;
        
        // Use all movement points
        attackingUnit.remainingMP = 0;
        
        // Check if defender is defeated
        if (defendingUnit.health <= 0) {
            const x = defendingUnit.x;
            const y = defendingUnit.y;
            this.gameState.map[y][x].unit = null;
            console.log(`Enemy ${defendingUnit.type} defeated`);
        }
        
        // Clear selected unit
        this.gameState.selectedUnit = null;
        
        // Hide UI panel
        const unitActionsContainer = document.getElementById('unit-actions-container');
        if (unitActionsContainer) {
            unitActionsContainer.style.display = 'none';
        }
    }
}
