import { technologies } from './technologies.js';
import { buildingTypes } from './buildings.js';
import { unitTypes } from './units.js';

export class TechnologySystem {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Start research of a new technology
     */
    startResearch(player, techId) {
        const technology = technologies[techId];
        
        if (!this.canResearch(player, techId)) {
            return {
                success: false,
                reason: this.getResearchBlocker(player, techId)
            };
        }
        
        // Deduct research cost
        if (technology.cost) {
            Object.entries(technology.cost).forEach(([resource, amount]) => {
                player.resources[resource] -= amount;
            });
        }
        
        // Add to research queue
        if (!player.researchQueue) {
            player.researchQueue = [];
        }
        
        player.researchQueue.push({
            id: techId,
            progress: 0
        });
        
        return {
            success: true
        };
    }

    /**
     * Check if a technology can be researched
     */
    canResearch(player, techId) {
        const technology = technologies[techId];
        
        // Check if already researched
        if (player.technologies?.includes(techId)) {
            return false;
        }
        
        // Check if already in research queue
        if (player.researchQueue?.some(item => item.id === techId)) {
            return false;
        }
        
        // Check prerequisites
        if (technology.prerequisites) {
            for (const prereq of technology.prerequisites) {
                if (!player.technologies?.includes(prereq)) {
                    return false;
                }
            }
        }
        
        // Check age requirement
        if (technology.ageRequirement && 
            this.gameState.ages.indexOf(player.age) < 
            this.gameState.ages.indexOf(technology.ageRequirement)) {
            return false;
        }
        
        // Check resource cost
        if (technology.cost) {
            for (const [resource, amount] of Object.entries(technology.cost)) {
                if (!player.resources[resource] || 
                    player.resources[resource] < amount) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Get the reason why a technology cannot be researched
     */
    getResearchBlocker(player, techId) {
        const technology = technologies[techId];
        
        if (player.technologies?.includes(techId)) {
            return 'Already researched';
        }
        
        if (player.researchQueue?.some(item => item.id === techId)) {
            return 'Already in research queue';
        }
        
        if (technology.prerequisites) {
            const missingPrereqs = technology.prerequisites.filter(
                prereq => !player.technologies?.includes(prereq)
            );
            if (missingPrereqs.length > 0) {
                return `Missing prerequisites: ${missingPrereqs.join(', ')}`;
            }
        }
        
        if (technology.ageRequirement && 
            this.gameState.ages.indexOf(player.age) < 
            this.gameState.ages.indexOf(technology.ageRequirement)) {
            return `Requires ${technology.ageRequirement} age`;
        }
        
        if (technology.cost) {
            const missingResources = Object.entries(technology.cost)
                .filter(([resource, amount]) => 
                    !player.resources[resource] || 
                    player.resources[resource] < amount
                )
                .map(([resource, amount]) => `${resource} (${amount})`);
            
            if (missingResources.length > 0) {
                return `Insufficient resources: ${missingResources.join(', ')}`;
            }
        }
        
        return 'Unknown reason';
    }

    /**
     * Process research progress
     */
    processResearch() {
        this.gameState.players.forEach(player => {
            if (!player.researchQueue?.length) return;
            
            const currentResearch = player.researchQueue[0];
            currentResearch.progress += this.getResearchSpeed(player);
            
            if (currentResearch.progress >= 100) {
                this.completeResearch(currentResearch.id, player);
                player.researchQueue.shift();
            }
        });
    }

    /**
     * Calculate research speed based on player bonuses
     */
    getResearchSpeed(player) {
        let speed = 1;
        
        // Count research buildings
        const libraries = this.countBuildings(player, 'library');
        const universities = this.countBuildings(player, 'university');
        
        speed *= (1 + libraries * 0.1 + universities * 0.2);
        
        // Apply technology bonuses
        if (player.technologies?.includes('scientific_method')) {
            speed *= 1.2;
        }
        
        // Apply age bonuses
        const ageIndex = this.gameState.ages.indexOf(player.age);
        speed *= (1 + ageIndex * 0.1);
        
        return speed;
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
     * Complete research and apply effects
     */
    completeResearch(techId, player) {
        // Add to completed technologies
        if (!player.technologies) {
            player.technologies = [];
        }
        player.technologies.push(techId);
        
        // Apply technology effects
        this.applyTechnologyEffects(techId, player);
    }

    /**
     * Apply effects of a completed technology
     */
    applyTechnologyEffects(techId, player) {
        const technology = technologies[techId];
        
        // Unlock new buildings
        if (technology.unlocksBuildings) {
            technology.unlocksBuildings.forEach(buildingId => {
                if (!player.availableBuildings) {
                    player.availableBuildings = [];
                }
                player.availableBuildings.push(buildingId);
            });
        }
        
        // Unlock new units
        if (technology.unlocksUnits) {
            technology.unlocksUnits.forEach(unitId => {
                if (!player.availableUnits) {
                    player.availableUnits = [];
                }
                player.availableUnits.push(unitId);
            });
        }
        
        // Apply resource bonuses
        if (technology.resourceBonuses) {
            Object.entries(technology.resourceBonuses).forEach(([resource, bonus]) => {
                if (!player.resourceBonuses) {
                    player.resourceBonuses = {};
                }
                if (!player.resourceBonuses[resource]) {
                    player.resourceBonuses[resource] = 1;
                }
                player.resourceBonuses[resource] *= (1 + bonus);
            });
        }
        
        // Apply other bonuses
        if (technology.effects) {
            this.applyTechnologyBonuses(technology.effects, player);
        }
    }

    /**
     * Apply technology bonus effects
     */
    applyTechnologyBonuses(effects, player) {
        if (effects.combatBonus) {
            if (!player.combatBonuses) {
                player.combatBonuses = {
                    attack: 1,
                    defense: 1
                };
            }
            player.combatBonuses.attack *= (1 + effects.combatBonus.attack || 0);
            player.combatBonuses.defense *= (1 + effects.combatBonus.defense || 0);
        }
        
        if (effects.buildingBonus) {
            if (!player.buildingBonuses) {
                player.buildingBonuses = {
                    production: 1,
                    maintenance: 1
                };
            }
            player.buildingBonuses.production *= (1 + effects.buildingBonus.production || 0);
            player.buildingBonuses.maintenance *= (1 + effects.buildingBonus.maintenance || 0);
        }
        
        // ... Add more bonus types as needed
    }

    /**
     * Get available technologies for research
     */
    getAvailableTechnologies(player) {
        return Object.entries(technologies)
            .filter(([id, _]) => this.canResearch(player, id))
            .map(([id, tech]) => ({
                id,
                ...tech,
                cost: this.getModifiedResearchCost(tech, player)
            }));
    }

    /**
     * Calculate modified research cost based on player bonuses
     */
    getModifiedResearchCost(technology, player) {
        const cost = {...technology.cost};
        
        // Apply cost reduction bonuses
        if (player.technologies?.includes('efficient_research')) {
            Object.keys(cost).forEach(resource => {
                cost[resource] = Math.floor(cost[resource] * 0.9);
            });
        }
        
        return cost;
    }

    /**
     * Get research progress information
     */
    getResearchProgress(player) {
        if (!player.researchQueue?.length) {
            return null;
        }
        
        const currentResearch = player.researchQueue[0];
        const technology = technologies[currentResearch.id];
        
        return {
            technology: currentResearch.id,
            name: technology.name,
            progress: currentResearch.progress,
            turnsRemaining: Math.ceil((100 - currentResearch.progress) / 
                this.getResearchSpeed(player))
        };
    }
}