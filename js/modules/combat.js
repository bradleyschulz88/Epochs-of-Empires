import { unitTypes } from './units.js';
import { terrainTypes } from './terrain.js';

export class CombatSystem {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Handle a combat encounter between two units
     */
    handleCombat(attackingUnit, defendingUnit) {
        // Calculate base damage
        const damage = this.calculateDamage(attackingUnit, defendingUnit);
        
        // Apply damage and check for unit death
        const combatResult = this.applyDamage(defendingUnit, damage);
        
        // Update unit states after combat
        this.handlePostCombat(attackingUnit, defendingUnit, combatResult);
        
        return combatResult;
    }

    /**
     * Calculate damage based on unit stats, terrain, and modifiers
     */
    calculateDamage(attacker, defender) {
        const attackerStats = this.getUnitCombatStats(attacker);
        const defenderStats = this.getUnitCombatStats(defender);
        
        // Get terrain modifiers
        const terrainMod = this.getTerrainModifier(defender);
        
        // Calculate base damage
        let damage = (attackerStats.attack * 100) / (defenderStats.defense * terrainMod);
        
        // Apply random factor (±10%)
        const randomFactor = 0.9 + Math.random() * 0.2;
        damage *= randomFactor;
        
        // Apply unit-specific modifiers
        damage *= this.getUnitTypeModifier(attacker.type, defender.type);
        
        return Math.round(damage);
    }

    /**
     * Get a unit's combat statistics including all modifiers
     */
    getUnitCombatStats(unit) {
        const baseStats = unitTypes[unit.type];
        const stats = {
            attack: baseStats.attack || 0,
            defense: baseStats.defense || 0
        };
        
        // Apply unit health modifier
        const healthMod = unit.health / 100;
        stats.attack *= healthMod;
        stats.defense *= healthMod;
        
        // Apply experience bonus
        if (unit.experience) {
            const expBonus = Math.min(unit.experience * 0.05, 0.5); // Max 50% bonus
            stats.attack *= (1 + expBonus);
            stats.defense *= (1 + expBonus);
        }
        
        // Apply fortification bonus
        if (unit.fortified) {
            stats.defense *= 1.5;
        }
        
        return stats;
    }

    /**
     * Get terrain defense modifier
     */
    getTerrainModifier(defender) {
        const tile = this.gameState.map[defender.y][defender.x];
        const terrain = terrainTypes[tile.type];
        
        let modifier = 1;
        
        // Apply terrain defense bonus
        if (terrain.defenseBonus) {
            modifier += terrain.defenseBonus;
        }
        
        // Apply elevation bonus
        if (tile.elevation > 0) {
            modifier += tile.elevation * 0.1; // 10% per elevation level
        }
        
        return modifier;
    }

    /**
     * Get combat modifier based on unit types
     */
    getUnitTypeModifier(attackerType, defenderType) {
        const attackerInfo = unitTypes[attackerType];
        const defenderInfo = unitTypes[defenderType];
        
        let modifier = 1;
        
        // Check for unit type advantages
        if (attackerInfo.strengths && attackerInfo.strengths.includes(defenderType)) {
            modifier *= 1.5; // 50% bonus against advantageous types
        }
        
        if (defenderInfo.resistances && defenderInfo.resistances.includes(attackerType)) {
            modifier *= 0.75; // 25% reduction against resistant types
        }
        
        return modifier;
    }

    /**
     * Apply damage to a unit and check for death
     */
    applyDamage(unit, damage) {
        // Ensure health exists
        if (typeof unit.health !== 'number') {
            unit.health = 100;
        }
        
        // Apply damage
        unit.health -= damage;
        
        // Check for unit death
        if (unit.health <= 0) {
            return {
                survived: false,
                damage: damage,
                killed: true
            };
        }
        
        return {
            survived: true,
            damage: damage,
            killed: false
        };
    }

    /**
     * Handle post-combat effects
     */
    handlePostCombat(attacker, defender, combatResult) {
        // Use all remaining movement points
        attacker.remainingMP = 0;
        
        // Grant experience
        this.grantCombatExperience(attacker, defender, combatResult);
        
        // Remove dead units
        if (!combatResult.survived) {
            this.removeUnit(defender);
        }
        
        // Update UI
        this.gameState.updateUnitUI(attacker);
        if (combatResult.survived) {
            this.gameState.updateUnitUI(defender);
        }
    }

    /**
     * Grant experience points based on combat outcome
     */
    grantCombatExperience(attacker, defender, combatResult) {
        // Base XP for combat
        let expGain = 10;
        
        // Bonus XP for killing
        if (combatResult.killed) {
            expGain += 20;
        }
        
        // Bonus XP for fighting stronger units
        const powerDiff = this.calculateUnitPowerDifference(defender, attacker);
        if (powerDiff > 0) {
            expGain += Math.round(powerDiff * 5);
        }
        
        // Apply experience gain
        if (!attacker.experience) attacker.experience = 0;
        attacker.experience += expGain;
        
        // Handle level ups if applicable
        if (this.checkLevelUp(attacker)) {
            this.handleLevelUp(attacker);
        }
    }

    /**
     * Calculate the power difference between two units
     */
    calculateUnitPowerDifference(unit1, unit2) {
        const power1 = this.calculateUnitPower(unit1);
        const power2 = this.calculateUnitPower(unit2);
        return power1 - power2;
    }

    /**
     * Calculate a unit's total power level
     */
    calculateUnitPower(unit) {
        const stats = this.getUnitCombatStats(unit);
        return stats.attack + stats.defense;
    }

    /**
     * Check if a unit should level up
     */
    checkLevelUp(unit) {
        const expNeeded = 100 + (unit.level || 0) * 50;
        return unit.experience >= expNeeded;
    }

    /**
     * Handle unit level up
     */
    handleLevelUp(unit) {
        if (!unit.level) unit.level = 1;
        unit.level++;
        
        // Improve unit stats
        const unitInfo = unitTypes[unit.type];
        if (unitInfo.attack) unitInfo.attack *= 1.1;
        if (unitInfo.defense) unitInfo.defense *= 1.1;
        
        // Reset experience for next level
        unit.experience = 0;
    }

    /**
     * Remove a unit from the game
     */
    removeUnit(unit) {
        // Remove from map
        const tile = this.gameState.map[unit.y][unit.x];
        tile.unit = null;
        
        // Remove from player's units
        const owner = this.gameState.players[unit.owner - 1];
        const unitIndex = owner.units.findIndex(u => u === unit);
        if (unitIndex !== -1) {
            owner.units.splice(unitIndex, 1);
        }
    }

    /**
     * Calculate counterattack damage
     */
    calculateCounterattack(attacker, defender, initialDamage) {
        // Only counter-attack if the defender survives
        if (defender.health <= 0) return 0;
        
        // Counter-attacks deal 50% of normal damage
        const counterDamage = this.calculateDamage(defender, attacker) * 0.5;
        
        return Math.round(counterDamage);
    }

    /**
     * Get combat preview information
     */
    getCombatPreview(attacker, defender) {
        const attackDamage = this.calculateDamage(attacker, defender);
        const counterDamage = this.calculateCounterattack(attacker, defender, attackDamage);
        
        return {
            estimatedDamage: attackDamage,
            estimatedCounter: counterDamage,
            attackerSurvival: attacker.health > counterDamage,
            defenderSurvival: defender.health > attackDamage
        };
    }
}