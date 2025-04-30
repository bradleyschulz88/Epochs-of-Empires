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
        this.gameState.revealArea(hexCoords.q, hexCoords.r, 2);
        if (this.gameState.selectedUnit) {
            const canMove = this.gameState.canMoveToTile(
                this.gameState.selectedUnit,
                hexCoords.q,
                hexCoords.r
            );
            if (canMove) {
                this.handleUnitMovement(this.gameState.selectedUnit, hexCoords);
            }
        }
    }

    handleBuildingPlacement(hexCoords) {
        const success = this.gameState.buildStructure(hexCoords.q, hexCoords.r);
        if (success) {
            this.gameState.selectedBuildingType = null;
        }
    }

    handleUnitSelection(unit) {
        this.gameState.selectedUnit = unit;
        this.gameState.showUnitActions(unit);
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
            const moveResult = this.gameState.canMoveToTile(
                this.gameState.selectedUnit,
                hexCoords.q,
                hexCoords.r
            );
            if (moveResult.canMove) {
                this.handleUnitMovement(this.gameState.selectedUnit, hexCoords);
            }
        }
    }

    handleUnitMovement(unit, hexCoords) {
        const success = this.gameState.moveUnit(unit, hexCoords.q, hexCoords.r);
        if (success) {
            this.gameState.updateUnitUI(unit);
            if (unit.remainingMP <= 0) {
                this.gameState.clearSelectedUnit();
            }
        }
    }

    handleUnitAttack(attackingUnit, targetTile) {
        if (targetTile.unit && targetTile.unit.owner !== this.gameState.currentPlayer) {
            this.gameState.attackUnit(attackingUnit, targetTile.unit);
        }
    }
}