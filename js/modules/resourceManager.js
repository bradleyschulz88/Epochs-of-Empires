import { resourceTileTypes } from './resources.js';
import { buildingTypes } from './buildings.js';

export class ResourceManager {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Process all resource updates for a turn
     */
    processTurnResources() {
        this.gameState.players.forEach(player => {
            this.processResourceProduction(player);
            this.processResourceConsumption(player);
            this.processTradeRoutes(player);
            this.processResourceStorage(player);
        });
    }

    /**
     * Calculate and apply resource production
     */
    processResourceProduction(player) {
        // Base production from buildings
        this.processBasicProduction(player);
        
        // Production bonuses from technologies
        this.applyTechnologyBonuses(player);
        
        // Production from trade routes
        this.processTradeIncome(player);
        
        // Special resource gains (events, missions, etc)
        this.processSpecialGains(player);
    }

    /**
     * Process basic resource production from buildings
     */
    processBasicProduction(player) {
        const production = this.calculateBuildingProduction(player);
        
        // Apply production to player's resources
        Object.entries(production).forEach(([resource, amount]) => {
            if (!player.resources[resource]) {
                player.resources[resource] = 0;
            }
            player.resources[resource] += amount;
        });
    }

    /**
     * Calculate total production from all buildings
     */
    calculateBuildingProduction(player) {
        const production = {};
        
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                if (tile.building && tile.building.owner === player.index) {
                    const building = buildingTypes[tile.building.type];
                    
                    if (building.produces) {
                        Object.entries(building.produces).forEach(([resource, amount]) => {
                            if (!production[resource]) {
                                production[resource] = 0;
                            }
                            production[resource] += amount;
                        });
                    }
                }
            });
        });
        
        return production;
    }

    /**
     * Apply production bonuses from technologies
     */
    applyTechnologyBonuses(player) {
        if (!player.technologies) return;
        
        // Example technology bonuses
        const techBonuses = {
            'agriculture': { food: 1.2 },
            'mining': { stone: 1.2, iron: 1.2 },
            'logging': { wood: 1.2 },
            'trade': { gold: 1.2 }
        };
        
        player.technologies.forEach(tech => {
            const bonus = techBonuses[tech];
            if (bonus) {
                Object.entries(bonus).forEach(([resource, multiplier]) => {
                    if (player.resources[resource]) {
                        player.resources[resource] *= multiplier;
                    }
                });
            }
        });
    }

    /**
     * Process resource consumption
     */
    processResourceConsumption(player) {
        // Population consumption
        this.processPopulationNeeds(player);
        
        // Building maintenance
        this.processBuildingMaintenance(player);
        
        // Unit upkeep
        this.processUnitUpkeep(player);
        
        // Special consumption (events, abilities, etc)
        this.processSpecialConsumption(player);
    }

    /**
     * Process population resource needs
     */
    processPopulationNeeds(player) {
        const population = player.population || 0;
        
        // Basic food consumption
        const foodNeeded = Math.ceil(population * 0.5);
        player.resources.food -= foodNeeded;
        
        // Housing requirements
        const housingNeeded = Math.ceil(population * 0.2);
        if (this.countBuildings(player, 'house') < housingNeeded) {
            player.happiness -= 5;
        }
    }

    /**
     * Process building maintenance costs
     */
    processBuildingMaintenance(player) {
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
        
        // Deduct maintenance cost from gold
        if (player.resources.gold) {
            player.resources.gold -= totalMaintenance;
        }
    }

    /**
     * Process unit upkeep costs
     */
    processUnitUpkeep(player) {
        let totalUpkeep = 0;
        
        player.units.forEach(unit => {
            const upkeep = unit.upkeep || 1;
            totalUpkeep += upkeep;
        });
        
        // Deduct upkeep from gold
        if (player.resources.gold) {
            player.resources.gold -= totalUpkeep;
        }
    }

    /**
     * Process trade routes
     */
    processTradeRoutes(player) {
        if (!player.tradeRoutes) return;
        
        player.tradeRoutes.forEach((route, index) => {
            // Process incoming resources
            if (route.direction === 'import') {
                if (!player.resources[route.resource]) {
                    player.resources[route.resource] = 0;
                }
                player.resources[route.resource] += route.amount;
                player.resources.gold -= route.cost;
            }
            // Process outgoing resources
            else if (route.direction === 'export') {
                player.resources[route.resource] -= route.amount;
                player.resources.gold += route.price;
            }
            
            // Decrease remaining turns
            route.turns--;
            
            // Remove expired trade routes
            if (route.turns <= 0) {
                player.tradeRoutes.splice(index, 1);
            }
        });
    }

    /**
     * Handle resource storage limits
     */
    processResourceStorage(player) {
        const storageCapacity = this.calculateStorageCapacity(player);
        
        Object.entries(player.resources).forEach(([resource, amount]) => {
            if (amount > storageCapacity[resource]) {
                player.resources[resource] = storageCapacity[resource];
            }
        });
    }

    /**
     * Calculate storage capacity for resources
     */
    calculateStorageCapacity(player) {
        const baseCapacity = {
            food: 100,
            wood: 100,
            stone: 100,
            iron: 50,
            gold: 1000
        };
        
        // Count storage buildings
        const storageMultiplier = this.countBuildings(player, 'storehouse') * 0.5 + 1;
        
        // Apply storage bonuses
        Object.keys(baseCapacity).forEach(resource => {
            baseCapacity[resource] *= storageMultiplier;
        });
        
        return baseCapacity;
    }

    /**
     * Count buildings of a specific type
     */
    countBuildings(player, buildingType) {
        let count = 0;
        
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                if (tile.building && 
                    tile.building.owner === player.index && 
                    tile.building.type === buildingType) {
                    count++;
                }
            });
        });
        
        return count;
    }

    /**
     * Process special resource gains
     */
    processSpecialGains(player) {
        // Handle one-time resource gains from events
        if (player.pendingResourceGains) {
            Object.entries(player.pendingResourceGains).forEach(([resource, amount]) => {
                if (!player.resources[resource]) {
                    player.resources[resource] = 0;
                }
                player.resources[resource] += amount;
            });
            player.pendingResourceGains = {};
        }
    }

    /**
     * Process special resource consumption
     */
    processSpecialConsumption(player) {
        // Handle one-time resource costs from events or abilities
        if (player.pendingResourceCosts) {
            Object.entries(player.pendingResourceCosts).forEach(([resource, amount]) => {
                if (player.resources[resource]) {
                    player.resources[resource] -= amount;
                }
            });
            player.pendingResourceCosts = {};
        }
    }

    /**
     * Get resource production preview
     */
    getProductionPreview(player) {
        const preview = {
            production: this.calculateBuildingProduction(player),
            consumption: {
                population: this.calculatePopulationConsumption(player),
                buildings: this.calculateBuildingMaintenance(player),
                units: this.calculateUnitUpkeep(player)
            },
            trade: this.calculateTradeBalance(player)
        };
        
        return preview;
    }

    /**
     * Calculate population resource consumption
     */
    calculatePopulationConsumption(player) {
        const population = player.population || 0;
        return {
            food: Math.ceil(population * 0.5)
        };
    }

    /**
     * Calculate building maintenance costs
     */
    calculateBuildingMaintenance(player) {
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
        
        return {
            gold: totalMaintenance
        };
    }

    /**
     * Calculate unit upkeep costs
     */
    calculateUnitUpkeep(player) {
        let totalUpkeep = 0;
        
        player.units.forEach(unit => {
            totalUpkeep += unit.upkeep || 1;
        });
        
        return {
            gold: totalUpkeep
        };
    }

    /**
     * Calculate trade route balance
     */
    calculateTradeBalance(player) {
        const balance = {
            incoming: {},
            outgoing: {}
        };
        
        if (!player.tradeRoutes) return balance;
        
        player.tradeRoutes.forEach(route => {
            if (route.direction === 'import') {
                if (!balance.incoming[route.resource]) {
                    balance.incoming[route.resource] = 0;
                }
                balance.incoming[route.resource] += route.amount;
                balance.outgoing.gold = (balance.outgoing.gold || 0) + route.cost;
            } else {
                if (!balance.outgoing[route.resource]) {
                    balance.outgoing[route.resource] = 0;
                }
                balance.outgoing[route.resource] += route.amount;
                balance.incoming.gold = (balance.incoming.gold || 0) + route.price;
            }
        });
        
        return balance;
    }
}