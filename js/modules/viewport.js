export class Viewport {
    constructor(canvas, worldSize) {
        this.canvas = canvas;
        this.worldSize = worldSize;
        this.scale = 1;
        this.targetScale = 1; // For smooth zoom
        this.offsetX = 0;
        this.offsetY = 0;
        this.minScale = 0.5;
        this.maxScale = 2;
        this.zoomSpeed = 0.05; // Controls interpolation speed
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.hoveredTile = null;
        
        // Initialize UI elements
        this.initUI();
        
        // Start animation loop for smooth transitions
        this.animationFrame = requestAnimationFrame(this.update.bind(this));
    }
    
    initUI() {
        // Get UI elements
        this.zoomInBtn = document.getElementById('zoomIn');
        this.zoomOutBtn = document.getElementById('zoomOut');
        this.zoomLevelDisplay = document.getElementById('zoomLevel');
        this.darkModeToggle = document.getElementById('darkModeToggle');
        this.minimap = document.getElementById('minimap');
        
        // Set up event listeners for zoom buttons
        if (this.zoomInBtn) {
            this.zoomInBtn.addEventListener('click', () => {
                this.zoomToward(1.25, this.canvas.width / 2, this.canvas.height / 2);
                this.updateZoomDisplay();
            });
        }
        
        if (this.zoomOutBtn) {
            this.zoomOutBtn.addEventListener('click', () => {
                this.zoomToward(0.8, this.canvas.width / 2, this.canvas.height / 2);
                this.updateZoomDisplay();
            });
        }
        
        // Dark mode toggle
        if (this.darkModeToggle) {
            this.darkModeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                // Update icon
                this.darkModeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀' : '☾';
            });
        }
        
        // Minimap interaction
        if (this.minimap) {
            this.minimap.addEventListener('mousedown', (e) => {
                const rect = this.minimap.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Calculate map position based on click
                const mapRatio = this.worldSize / this.minimap.width;
                const worldX = x * mapRatio;
                const worldY = y * mapRatio;
                
                // Center the viewport on the clicked location
                this.centerOn(worldX, worldY);
                
                e.preventDefault();
                e.stopPropagation();
            });
        }
        
        // Setup canvas mouse events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('click', this.onClick.bind(this));
        
        // Initial display update
        this.updateZoomDisplay();
    }
    
    updateZoomDisplay() {
        if (this.zoomLevelDisplay) {
            const percentage = Math.round(this.scale * 100);
            this.zoomLevelDisplay.textContent = `${percentage}%`;
        }
    }
    
    // Animation loop for smooth zooming
    update() {
        // Smooth zoom interpolation
        if (this.scale !== this.targetScale) {
            const delta = this.targetScale - this.scale;
            this.scale += delta * this.zoomSpeed;
            
            // Snap to target when close enough
            if (Math.abs(delta) < 0.01) {
                this.scale = this.targetScale;
            }
            
            this.updateZoomDisplay();
        }
        
        this.animationFrame = requestAnimationFrame(this.update.bind(this));
    }
    
    // Mouse event handlers
    onMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    }
    
    onMouseMove(e) {
        // Update hovered tile
        const gridPos = this.screenToGrid(e.clientX, e.clientY);
        
        // Only update if hovering a different tile
        if (!this.hoveredTile || 
            this.hoveredTile.x !== gridPos.x || 
            this.hoveredTile.y !== gridPos.y) {
            
            // Get UI module dynamically
            const uiModule = window.gameModules?.ui;
            if (uiModule?.setHoveredTile) {
                uiModule.setHoveredTile(gridPos.x, gridPos.y);
                this.hoveredTile = { x: gridPos.x, y: gridPos.y };
            }
        }
        
        // Handle dragging
        if (this.isDragging) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            this.pan(deltaX, deltaY);
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
    }
    
    onMouseUp(e) {
        this.isDragging = false;
        this.canvas.style.cursor = 'default';
    }
    
    onMouseLeave(e) {
        this.isDragging = false;
        this.canvas.style.cursor = 'default';
        
        // Clear hover state
        const uiModule = window.gameModules?.ui;
        if (uiModule?.setHoveredTile) {
            uiModule.setHoveredTile(null, null);
            this.hoveredTile = null;
        }
    }
    
    onWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.zoomToward(zoomFactor, mouseX, mouseY);
        this.updateZoomDisplay();
    }
    
    onClick(e) {
        const gridPos = this.screenToGrid(e.clientX, e.clientY);
        
        // Trigger click animation through UI module
        const uiModule = window.gameModules?.ui;
        if (uiModule?.animateTileClick) {
            uiModule.animateTileClick(gridPos.x, gridPos.y);
        }
    }
    
    // Center the viewport on a specific world coordinate
    centerOn(worldX, worldY) {
        this.offsetX = worldX;
        this.offsetY = worldY;
    }
    
    // Zoom toward a specific point (with target being the point to keep steady under the mouse)
    zoomToward(factor, targetX, targetY) {
        const oldScale = this.scale;
        this.targetScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
        
        if (this.targetScale !== oldScale) {
            // Calculate the world position that the mouse is over
            const worldX = (targetX - this.canvas.width / 2) / oldScale + this.offsetX;
            const worldY = (targetY - this.canvas.height / 2) / oldScale + this.offsetY;
            
            // Adjust the offset to keep the world point under the mouse steady
            this.offsetX = worldX - (targetX - this.canvas.width / 2) / this.targetScale;
            this.offsetY = worldY - (targetY - this.canvas.height / 2) / this.targetScale;
        }
    }
    
    // Convert screen coordinates to grid coordinates
    screenToGrid(screenX, screenY) {
        // First convert to world coordinates
        const worldPos = this.screenToWorld(screenX, screenY);
        
        // Get UI constants for tile size and gutter
        let tileSize = 50; // Default from enhanced-ui.css
        let gutter = 3;   // Default from enhanced-ui.css
        
        // Check if UI module has these values defined
        const uiModule = window.gameModules?.ui;
        if (uiModule) {
            tileSize = uiModule.TILE_SIZE || tileSize;
            gutter = uiModule.TILE_GUTTER || gutter;
        }
        
        // Convert to grid coordinates considering tile size and gutter
        return {
            x: Math.floor(worldPos.x / (tileSize + gutter)),
            y: Math.floor(worldPos.y / (tileSize + gutter))
        };
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.canvas.width / 2) / this.scale + this.offsetX,
            y: (screenY - this.canvas.height / 2) / this.scale + this.offsetY
        };
    }

    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.offsetX) * this.scale + this.canvas.width / 2,
            y: (worldY - this.offsetY) * this.scale + this.canvas.height / 2
        };
    }

    screenToHex(screenX, screenY) {
        const worldPos = this.screenToWorld(screenX, screenY);
        return this.worldToHex(worldPos.x, worldPos.y);
    }

    worldToHex(x, y) {
        const hexSize = 30; // Match the HEX_SIZE from ui.js
        const q = (x * Math.sqrt(3)/3 - y/3) / hexSize;
        const r = y * 2/3 / hexSize;
        return this.roundToHex(q, r);
    }

    roundToHex(q, r) {
        // Convert to cube coordinates
        let x = q;
        let z = r;
        let y = -x - z;
        
        // Round cube coordinates
        let rx = Math.round(x);
        let ry = Math.round(y);
        let rz = Math.round(z);
        
        // Fix rounding errors
        const x_diff = Math.abs(rx - x);
        const y_diff = Math.abs(ry - y);
        const z_diff = Math.abs(rz - z);
        
        if (x_diff > y_diff && x_diff > z_diff) {
            rx = -ry - rz;
        } else if (y_diff > z_diff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }
        
        // Convert back to axial coordinates
        return {q: rx, r: rz};
    }

    pan(deltaX, deltaY) {
        // Convert screen delta to world delta
        const worldDeltaX = deltaX / this.scale;
        const worldDeltaY = deltaY / this.scale;
        
        // Update offset with bounds checking
        const maxOffset = this.worldSize / 2;
        this.offsetX = Math.max(-maxOffset, Math.min(maxOffset, this.offsetX - worldDeltaX));
        this.offsetY = Math.max(-maxOffset, Math.min(maxOffset, this.offsetY - worldDeltaY));
    }

    zoom(factor, centerX = this.canvas.width / 2, centerY = this.canvas.height / 2) {
        const oldScale = this.scale;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
        
        if (this.scale !== oldScale) {
            // Adjust offset to zoom toward mouse position
            const mouseWorld = this.screenToWorld(centerX, centerY);
            this.offsetX = mouseWorld.x - (centerX - this.canvas.width / 2) / this.scale;
            this.offsetY = mouseWorld.y - (centerY - this.canvas.height / 2) / this.scale;
        }
    }

    getVisibleArea() {
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);
        return {
            x: topLeft.x,
            y: topLeft.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y
        };
    }
}
