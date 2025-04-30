export class Viewport {
    constructor(canvas, worldSize) {
        this.canvas = canvas;
        this.worldSize = worldSize;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.minScale = 0.5;
        this.maxScale = 2;
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