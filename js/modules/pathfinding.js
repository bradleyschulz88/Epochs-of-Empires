import { terrainTypes } from './terrain.js';
import { unitTypes } from './units.js';

export class PathfindingSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Find path between two points using A* algorithm
     */
    findPath(startX, startY, endX, endY, unit) {
        const openSet = new Set();
        const closedSet = new Set();
        const cameFrom = new Map();
        
        // Cost from start to node
        const gScore = new Map();
        // Estimated total cost from start to end through node
        const fScore = new Map();
        
        const start = `${startX},${startY}`;
        const goal = `${endX},${endY}`;
        
        openSet.add(start);
        gScore.set(start, 0);
        fScore.set(start, this.heuristic(startX, startY, endX, endY));
        
        while (openSet.size > 0) {
            // Get node with lowest fScore
            const current = this.getLowestFScore(openSet, fScore);
            
            if (current === goal) {
                return this.reconstructPath(cameFrom, current);
            }
            
            openSet.delete(current);
            closedSet.add(current);
            
            const [x, y] = current.split(',').map(Number);
            
            // Check all neighbors
            const neighbors = this.getNeighbors(x, y);
            
            for (const neighbor of neighbors) {
                const [nx, ny] = neighbor;
                const neighborKey = `${nx},${ny}`;
                
                if (closedSet.has(neighborKey)) continue;
                
                // Calculate tentative gScore
                const movementCost = this.getMovementCost(x, y, nx, ny, unit);
                const tentativeGScore = gScore.get(current) + movementCost;
                
                if (!openSet.has(neighborKey)) {
                    openSet.add(neighborKey);
                } else if (tentativeGScore >= gScore.get(neighborKey)) {
                    continue;
                }
                
                // This path is the best so far
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + 
                    this.heuristic(nx, ny, endX, endY));
            }
        }
        
        // No path found
        return null;
    }

    /**
     * Manhattan distance heuristic
     */
    heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    /**
     * Get valid neighboring tiles
     */
    getNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],  // Orthogonal
            [-1, -1], [-1, 1], [1, -1], [1, 1]  // Diagonal
        ];
        
        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (this.isValidPosition(newX, newY)) {
                neighbors.push([newX, newY]);
            }
        }
        
        return neighbors;
    }

    /**
     * Check if position is within map bounds
     */
    isValidPosition(x, y) {
        return x >= 0 && x < this.gameState.mapSize && 
               y >= 0 && y < this.gameState.mapSize;
    }

    /**
     * Calculate movement cost between adjacent tiles
     */
    getMovementCost(fromX, fromY, toX, toY, unit) {
        const fromTile = this.gameState.map[fromY][fromX];
        const toTile = this.gameState.map[toY][toX];
        
        // Base movement cost
        let cost = 1;
        
        // Add terrain movement cost
        const terrain = terrainTypes[toTile.type];
        cost *= terrain.movementCost || 1;
        
        // Check if unit can move through this terrain
        const unitInfo = unitTypes[unit.type];
        if (terrain.restricted && 
            (!unitInfo.canCross || !unitInfo.canCross.includes(toTile.type))) {
            return Infinity;
        }
        
        // Add elevation change cost
        const elevationDiff = Math.abs(toTile.elevation - fromTile.elevation);
        cost += elevationDiff * 0.5;
        
        // Add diagonal movement cost
        if (Math.abs(toX - fromX) === 1 && Math.abs(toY - fromY) === 1) {
            cost *= 1.4; // √2 for diagonal movement
        }
        
        // Check for blocking units
        if (toTile.unit && toTile.unit.owner !== unit.owner) {
            return Infinity;
        }
        
        return cost;
    }

    /**
     * Get node with lowest fScore from open set
     */
    getLowestFScore(openSet, fScore) {
        let lowest = null;
        let lowestScore = Infinity;
        
        for (const node of openSet) {
            const score = fScore.get(node);
            if (score < lowestScore) {
                lowest = node;
                lowestScore = score;
            }
        }
        
        return lowest;
    }

    /**
     * Reconstruct path from A* result
     */
    reconstructPath(cameFrom, current) {
        const path = [current];
        
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
        }
        
        return path.map(pos => {
            const [x, y] = pos.split(',').map(Number);
            return {x, y};
        });
    }

    /**
     * Get all reachable tiles within movement points
     */
    getReachableTiles(unit) {
        const reachable = new Set();
        const queue = [{
            x: unit.x,
            y: unit.y,
            mp: unit.remainingMP
        }];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.x},${current.y}`;
            
            if (reachable.has(key)) continue;
            reachable.add(key);
            
            // Check neighbors
            const neighbors = this.getNeighbors(current.x, current.y);
            
            for (const [nx, ny] of neighbors) {
                const cost = this.getMovementCost(
                    current.x, current.y, nx, ny, unit
                );
                
                const remainingMP = current.mp - cost;
                if (remainingMP >= 0) {
                    queue.push({x: nx, y: ny, mp: remainingMP});
                }
            }
        }
        
        return Array.from(reachable).map(pos => {
            const [x, y] = pos.split(',').map(Number);
            return {x, y};
        });
    }

    /**
     * Check if a unit can reach a specific tile
     */
    canReachTile(unit, targetX, targetY) {
        const path = this.findPath(unit.x, unit.y, targetX, targetY, unit);
        if (!path) return false;
        
        // Calculate total movement cost
        let totalCost = 0;
        for (let i = 0; i < path.length - 1; i++) {
            totalCost += this.getMovementCost(
                path[i].x, path[i].y,
                path[i + 1].x, path[i + 1].y,
                unit
            );
        }
        
        return totalCost <= unit.remainingMP;
    }

    /**
     * Get partial path within movement points
     */
    getPartialPath(unit, path) {
        let remainingMP = unit.remainingMP;
        let lastValidIndex = 0;
        
        for (let i = 0; i < path.length - 1; i++) {
            const cost = this.getMovementCost(
                path[i].x, path[i].y,
                path[i + 1].x, path[i + 1].y,
                unit
            );
            
            if (remainingMP >= cost) {
                remainingMP -= cost;
                lastValidIndex = i + 1;
            } else {
                break;
            }
        }
        
        return path.slice(0, lastValidIndex + 1);
    }
}