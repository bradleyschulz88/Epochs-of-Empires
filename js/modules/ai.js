import { unitTypes } from './units.js';
import { buildingTypes } from './buildings.js';
import { resourceTileTypes } from './resources.js';

export class AISystem {
    constructor(gameState) {
        this.gameState = gameState;
    }

    processAITurn(aiPlayer) {
        // Process AI actions in order of priority
        this.handleDefense(aiPlayer);
        this.handleResourceManagement(aiPlayer);
        this.handleMilitaryActions(aiPlayer);
        this.handleBuildingConstruction(aiPlayer);
        this.handleDiplomacy(aiPlayer);
        
        // End turn after all actions are completed
        this.endTurn();
    }

    handleDefense(aiPlayer) {
        // Check for nearby threats
        const threats = this.findThreats(aiPlayer);
        
        threats.forEach(threat => {
            // Respond to threats based on priority
            if (threat.priority === 'high') {
                this.defendAgainstThreat(aiPlayer, threat);
            }
        });
    }

    findThreats(aiPlayer) {
        const threats = [];
        const playerIndex = aiPlayer.index;
        
        // Scan the map for enemy units near our territory
        for (let y = 0; y < this.gameState.mapSize; y++) {
            for (let x = 0; x < this.gameState.mapSize; x++) {
                const tile = this.gameState.map[y][x];
                
                if (tile.unit && tile.unit.owner !== playerIndex) {
                    const nearbyAssets = this.findNearbyAssets(x, y, 3, playerIndex);
                    
                    if (nearbyAssets.length > 0) {
                        threats.push({
                            unit: tile.unit,
                            x: x,
                            y: y,
                            priority: this.assessThreatPriority(tile.unit, nearbyAssets),
                            nearbyAssets: nearbyAssets
                        });
                    }
                }
            }
        }
        
        return threats;
    }

    findNearbyAssets(x, y, radius, playerIndex) {
        const assets = [];
        
        // Check tiles within radius
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const newX = x + dx;
                const newY = y + dy;
                
                if (this.isValidPosition(newX, newY)) {
                    const tile = this.gameState.map[newY][newX];
                    
                    // Check for valuable assets (cities, resources, units)
                    if (tile.building && tile.building.owner === playerIndex) {
                        assets.push({
                            type: 'building',
                            building: tile.building,
                            x: newX,
                            y: newY
                        });
                    }
                    
                    if (tile.unit && tile.unit.owner === playerIndex) {
                        assets.push({
                            type: 'unit',
                            unit: tile.unit,
                            x: newX,
                            y: newY
                        });
                    }
                }
            }
        }
        
        return assets;
    }

    assessThreatPriority(enemyUnit, nearbyAssets) {
        // Calculate threat level based on unit strength and nearby assets
        let threatLevel = 0;
        const unitInfo = unitTypes[enemyUnit.type];
        
        // Base threat on unit's combat stats
        threatLevel += (unitInfo.attack || 0) * 2;
        threatLevel += (unitInfo.defense || 0);
        
        // Increase threat level based on valuable nearby assets
        nearbyAssets.forEach(asset => {
            if (asset.type === 'building') {
                // Cities and important buildings increase threat level
                const buildingInfo = buildingTypes[asset.building.type];
                threatLevel += buildingInfo.importance || 1;
            }
        });
        
        // Return priority based on threat level
        if (threatLevel > 15) return 'high';
        if (threatLevel > 8) return 'medium';
        return 'low';
    }

    defendAgainstThreat(aiPlayer, threat) {
        // Find nearby military units
        const militaryUnits = this.findNearbyMilitaryUnits(threat.x, threat.y, 5, aiPlayer.index);
        
        if (militaryUnits.length > 0) {
            // Sort units by combat effectiveness
            militaryUnits.sort((a, b) => {
                const aStrength = this.calculateCombatStrength(a.unit);
                const bStrength = this.calculateCombatStrength(b.unit);
                return bStrength - aStrength;
            });
            
            // Move units to intercept threat
            militaryUnits.forEach(unit => {
                this.moveUnitTowardsThreat(unit, threat);
            });
        } else {
            // If no military units nearby, consider building defensive structures
            this.buildDefensiveStructures(aiPlayer, threat);
        }
    }

    calculateCombatStrength(unit) {
        const unitInfo = unitTypes[unit.type];
        return (unitInfo.attack || 0) + (unitInfo.defense || 0);
    }

    moveUnitTowardsThreat(unit, threat) {
        // Calculate path to threat
        const path = this.findPath(unit.x, unit.y, threat.x, threat.y);
        
        if (path && path.length > 0) {
            // Move along path based on movement points
            const destination = this.getFurthestReachablePoint(unit, path);
            if (destination) {
                this.gameState.moveUnit(unit, destination.x, destination.y);
            }
        }
    }

    handleResourceManagement(aiPlayer) {
        // Check resource levels
        const criticalResources = this.identifyCriticalResources(aiPlayer);
        
        criticalResources.forEach(resource => {
            this.improveResourceProduction(aiPlayer, resource);
        });
        
        // Manage trade routes
        this.optimizeTradeRoutes(aiPlayer);
    }

    identifyCriticalResources(aiPlayer) {
        const criticalResources = [];
        const resourceLevels = aiPlayer.resources;
        
        Object.entries(resourceLevels).forEach(([resource, amount]) => {
            // Check if resource is critically low
            if (amount < this.getMinimumResourceThreshold(resource)) {
                criticalResources.push({
                    type: resource,
                    priority: this.getResourcePriority(resource, amount)
                });
            }
        });
        
        return criticalResources.sort((a, b) => b.priority - a.priority);
    }

    improveResourceProduction(aiPlayer, resource) {
        // Find suitable locations for resource buildings
        const locations = this.findResourceBuildingLocations(resource.type);
        
        if (locations.length > 0) {
            // Sort locations by potential yield
            locations.sort((a, b) => b.potential - a.potential);
            
            // Attempt to build resource gathering buildings
            for (const location of locations) {
                if (this.canAffordBuilding(aiPlayer, location.buildingType)) {
                    this.gameState.buildStructure(
                        location.x,
                        location.y,
                        location.buildingType
                    );
                    break;
                }
            }
        }
    }

    handleMilitaryActions(aiPlayer) {
        // Update military strategy based on game state
        const strategy = this.determineMilitaryStrategy(aiPlayer);
        
        switch(strategy) {
            case 'expand':
                this.handleExpansion(aiPlayer);
                break;
            case 'defend':
                this.strengthenDefenses(aiPlayer);
                break;
            case 'attack':
                this.planOffensive(aiPlayer);
                break;
        }
    }

    determineMilitaryStrategy(aiPlayer) {
        // Analyze various factors to determine strategy
        const threatLevel = this.calculateThreatLevel(aiPlayer);
        const economicStrength = this.calculateEconomicStrength(aiPlayer);
        const militaryStrength = this.calculateMilitaryStrength(aiPlayer);
        
        if (threatLevel > militaryStrength) {
            return 'defend';
        } else if (economicStrength > 1.5 * militaryStrength) {
            return 'expand';
        } else if (militaryStrength > 1.5 * threatLevel) {
            return 'attack';
        }
        
        return 'defend';
    }

    handleBuildingConstruction(aiPlayer) {
        // Prioritize building construction
        const buildingPriorities = this.determineBuildingPriorities(aiPlayer);
        
        for (const building of buildingPriorities) {
            if (this.canAffordBuilding(aiPlayer, building.type)) {
                const location = this.findOptimalBuildingLocation(building.type);
                if (location) {
                    this.gameState.buildStructure(
                        location.x,
                        location.y,
                        building.type
                    );
                }
            }
        }
    }

    determineBuildingPriorities(aiPlayer) {
        const priorities = [];
        
        // Check for critical needs
        if (this.needsDefensiveStructures(aiPlayer)) {
            priorities.push({ type: 'walls', priority: 'high' });
        }
        
        if (this.needsResourceBuildings(aiPlayer)) {
            priorities.push({ type: 'resourceBuilding', priority: 'high' });
        }
        
        // Add other building types with lower priorities
        Object.entries(buildingTypes).forEach(([type, info]) => {
            if (!priorities.find(p => p.type === type)) {
                priorities.push({
                    type: type,
                    priority: this.calculateBuildingPriority(type, aiPlayer)
                });
            }
        });
        
        return priorities.sort((a, b) => {
            const priorityValues = { high: 3, medium: 2, low: 1 };
            return priorityValues[b.priority] - priorityValues[a.priority];
        });
    }

    handleDiplomacy(aiPlayer) {
        // Evaluate relationships with other players
        const diplomaticActions = this.evaluateDiplomaticRelations(aiPlayer);
        
        // Take appropriate diplomatic actions
        diplomaticActions.forEach(action => {
            switch(action.type) {
                case 'trade':
                    this.proposeTrade(action.targetPlayer, action.offer);
                    break;
                case 'alliance':
                    this.proposeAlliance(action.targetPlayer);
                    break;
                case 'war':
                    this.declareWar(action.targetPlayer);
                    break;
            }
        });
    }

    evaluateDiplomaticRelations(aiPlayer) {
        const actions = [];
        const otherPlayers = this.gameState.players.filter(p => p !== aiPlayer);
        
        otherPlayers.forEach(player => {
            const relationship = this.calculateRelationship(aiPlayer, player);
            const militaryComparison = this.compareMilitaryStrength(aiPlayer, player);
            const economicOpportunity = this.evaluateTradeOpportunity(aiPlayer, player);
            
            if (relationship < -50 && militaryComparison > 1.5) {
                actions.push({
                    type: 'war',
                    targetPlayer: player,
                    priority: 'high'
                });
            } else if (economicOpportunity > 0.8) {
                actions.push({
                    type: 'trade',
                    targetPlayer: player,
                    offer: this.generateTradeOffer(aiPlayer, player),
                    priority: 'medium'
                });
            } else if (relationship > 50 && militaryComparison < 0.8) {
                actions.push({
                    type: 'alliance',
                    targetPlayer: player,
                    priority: 'high'
                });
            }
        });
        
        return actions.sort((a, b) => {
            const priorityValues = { high: 3, medium: 2, low: 1 };
            return priorityValues[b.priority] - priorityValues[a.priority];
        });
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.gameState.mapSize && 
               y >= 0 && y < this.gameState.mapSize;
    }
}