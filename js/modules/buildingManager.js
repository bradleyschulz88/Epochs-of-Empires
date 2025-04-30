import { buildingTypes } from './buildings.js';
import { resourceTileTypes } from './resources.js';
import { terrainTypes } from './terrain.js';

export class BuildingManager {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Start construction of a building
     */
    startConstruction(x, y, buildingType, player) {
        const tile = this.gameState.map[y][x];
        
        if (!this.canConstructAt(tile, buildingType)) {
            return {
                success: false,
                reason: 'Invalid construction location'
            };
        }
        
        if (!this.canAffordBuilding(buildingType, player)) {
            return {
                success: false,
                reason: 'Insufficient resources'
            };
        }
        
        // Deduct resources
        this.deductConstructionCost(buildingType, player);
        
        // Add to building queue
        player.buildingQueue.push({
            type: buildingType,
            x: x,
            y: y,
            progress: 0
        });
        
        // Update tile state
        tile.buildingInProgress = {
            type: buildingType,
            owner: player.index,
            progress: 0
        };
        
        return {
            success: true
        };
    }

    /**
     * Check if building can be constructed at location
     */
    canConstructAt(tile, buildingType) {
        // Check if tile is already occupied
        if (tile.building || tile.buildingInProgress) {
            return false;
        }
        
        const building = buildingTypes[buildingType];
        const terrain = terrainTypes[tile.type];
        
        // Check terrain requirements
        if (building.terrainRequirements) {
            if (!building.terrainRequirements.includes(tile.type)) {
                return false;
            }
        }
        
        // Check resource requirements
        if (building.resourceRequirements) {
            if (!tile.resourceType || 
                !building.resourceRequirements.includes(tile.resourceType)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check if player can afford building
     */
    canAffordBuilding(buildingType, player) {
        const building = buildingTypes[buildingType];
        
        // Check resource costs
        if (building.cost) {
            for (const [resource, amount] of Object.entries(building.cost)) {
                if (!player.resources[resource] || 
                    player.resources[resource] < amount) {
                    return false;
                }
            }
        }
        
        // Check age requirements
        if (building.ageRequirement && 
            this.gameState.ages.indexOf(player.age) < 
            this.gameState.ages.indexOf(building.ageRequirement)) {
            return false;
        }
        
        return true;
    }

    /**
     * Deduct construction cost from player's resources
     */
    deductConstructionCost(buildingType, player) {
        const building = buildingTypes[buildingType];
        
        if (building.cost) {
            for (const [resource, amount] of Object.entries(building.cost)) {
                player.resources[resource] -= amount;
            }
        }
    }

    /**
     * Process building construction progress
     */
    updateConstruction() {
        this.gameState.players.forEach(player => {
            player.buildingQueue.forEach((building, index) => {
                building.progress += this.getConstructionSpeed(player);
                
                if (building.progress >= 100) {
                    this.completeConstruction(building, player);
                    player.buildingQueue.splice(index, 1);
                }
            });
        });
    }

    /**
     * Calculate construction speed based on player bonuses
     */
    getConstructionSpeed(player) {
        let speed = 1;
        
        // Apply technology bonuses
        if (player.technologies) {
            if (player.technologies.includes('construction')) {
                speed *= 1.2;
            }
            if (player.technologies.includes('advancedEngineering')) {
                speed *= 1.3;
            }
        }
        
        // Apply age bonuses
        const ageIndex = this.gameState.ages.indexOf(player.age);
        speed *= (1 + ageIndex * 0.1);
        
        return speed;
    }

    /**
     * Complete building construction
     */
    completeConstruction(building, player) {
        const tile = this.gameState.map[building.y][building.x];
        
        // Add completed building
        tile.building = {
            type: building.type,
            owner: player.index,
            health: 100
        };
        
        // Clear construction marker
        tile.buildingInProgress = null;
        
        // Apply immediate effects
        this.applyBuildingEffects(building.type, player);
    }

    /**
     * Apply building completion effects
     */
    applyBuildingEffects(buildingType, player) {
        const building = buildingTypes[buildingType];
        
        // Apply resource production
        if (building.produces) {
            if (!player.resourceProduction) {
                player.resourceProduction = {};
            }
            
            for (const [resource, amount] of Object.entries(building.produces)) {
                if (!player.resourceProduction[resource]) {
                    player.resourceProduction[resource] = 0;
                }
                player.resourceProduction[resource] += amount;
            }
        }
        
        // Apply immediate bonuses
        if (building.onComplete) {
            if (building.onComplete.population) {
                player.population += building.onComplete.population;
            }
            if (building.onComplete.happiness) {
                player.happiness += building.onComplete.happiness;
            }
        }
    }

    /**
     * Process resource production from buildings
     */
    processProduction() {
        this.gameState.players.forEach(player => {
            if (!player.resourceProduction) return;
            
            for (const [resource, amount] of Object.entries(player.resourceProduction)) {
                if (!player.resources[resource]) {
                    player.resources[resource] = 0;
                }
                player.resources[resource] += amount;
            }
        });
    }

    /**
     * Get suggested building for a tile
     */
    getSuggestedBuilding(tile) {
        if (!tile || tile.building || tile.buildingInProgress) {
            return null;
        }
        
        // Check for resource-specific buildings
        if (tile.resourceType) {
            const resourceInfo = resourceTileTypes[tile.resourceType];
            if (resourceInfo && resourceInfo.suggestedBuilding) {
                return resourceInfo.suggestedBuilding;
            }
        }
        
        // Check terrain-specific buildings
        const terrain = terrainTypes[tile.type];
        if (terrain.suggestedBuildings) {
            return terrain.suggestedBuildings[0];
        }
        
        // Default suggestions based on terrain type
        const defaultSuggestions = {
            plains: 'farm',
            forest: 'lumberMill',
            mountain: 'mine',
            coast: 'fishingDock'
        };
        
        return defaultSuggestions[tile.type] || null;
    }

    /**
     * Calculate maintenance cost for all buildings
     */
    calculateMaintenance(player) {
        let totalMaintenance = 0;
        
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                if (tile.building && tile.building.owner === player.index) {
                    const building = buildingTypes[tile.building.type];
                    if (building.maintenance) {
                        totalMaintenance += building.maintenance;
                    }
                }
            });
        });
        
        return totalMaintenance;
    }

    /**
     * Repair damaged buildings
     */
    repairBuildings(player) {
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                if (tile.building && 
                    tile.building.owner === player.index && 
                    tile.building.health < 100) {
                    
                    tile.building.health = Math.min(100, 
                        tile.building.health + this.getRepairRate(player));
                }
            });
        });
    }

    /**
     * Calculate repair rate based on player bonuses
     */
    getRepairRate(player) {
        let rate = 5; // Base repair rate
        
        // Apply technology bonuses
        if (player.technologies) {
            if (player.technologies.includes('masonry')) {
                rate *= 1.2;
            }
            if (player.technologies.includes('engineering')) {
                rate *= 1.3;
            }
        }
        
        return rate;
    }
}