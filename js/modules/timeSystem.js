export const seasons = {
    spring: {
        name: 'Spring',
        description: 'Growing season with moderate temperatures',
        duration: 12, // turns
        resourceModifiers: {
            food: 1.2,
            wood: 1.0,
            stone: 1.0,
            metal: 1.0
        },
        movementModifier: 1.0,
        visibilityModifier: 1.0,
        buildingSpeedModifier: 1.1
    },
    summer: {
        name: 'Summer',
        description: 'Peak production season with long days',
        duration: 12,
        resourceModifiers: {
            food: 1.5,
            wood: 1.2,
            stone: 1.2,
            metal: 1.0
        },
        movementModifier: 1.2,
        visibilityModifier: 1.2,
        buildingSpeedModifier: 1.2
    },
    autumn: {
        name: 'Autumn',
        description: 'Harvest season with declining temperatures',
        duration: 12,
        resourceModifiers: {
            food: 1.3,
            wood: 1.1,
            stone: 1.0,
            metal: 1.1
        },
        movementModifier: 1.0,
        visibilityModifier: 0.9,
        buildingSpeedModifier: 1.0
    },
    winter: {
        name: 'Winter',
        description: 'Cold season with reduced production',
        duration: 12,
        resourceModifiers: {
            food: 0.7,
            wood: 0.8,
            stone: 0.8,
            metal: 0.9
        },
        movementModifier: 0.8,
        visibilityModifier: 0.8,
        buildingSpeedModifier: 0.8
    }
};

export const dayNightCycle = {
    dawn: {
        name: 'Dawn',
        description: 'Early morning with increasing visibility',
        duration: 1,
        visibilityModifier: 0.9,
        combatModifier: 1.0,
        movementModifier: 0.9
    },
    morning: {
        name: 'Morning',
        description: 'Prime time for activities',
        duration: 2,
        visibilityModifier: 1.2,
        combatModifier: 1.1,
        movementModifier: 1.1
    },
    noon: {
        name: 'Noon',
        description: 'Peak daylight hours',
        duration: 2,
        visibilityModifier: 1.3,
        combatModifier: 1.2,
        movementModifier: 1.2
    },
    afternoon: {
        name: 'Afternoon',
        description: 'Declining daylight hours',
        duration: 2,
        visibilityModifier: 1.1,
        combatModifier: 1.1,
        movementModifier: 1.1
    },
    dusk: {
        name: 'Dusk',
        description: 'Fading light with reduced visibility',
        duration: 1,
        visibilityModifier: 0.8,
        combatModifier: 0.9,
        movementModifier: 0.9
    },
    night: {
        name: 'Night',
        description: 'Dark hours with limited visibility',
        duration: 4,
        visibilityModifier: 0.6,
        combatModifier: 0.8,
        movementModifier: 0.8
    }
};

export class TimeSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentSeason = 'spring';
        this.currentTimeOfDay = 'dawn';
        this.seasonalTurn = 0;
        this.dayTurn = 0;
        this.year = 1;
    }

    /**
     * Update time for current turn
     */
    updateTime() {
        this.updateTimeOfDay();
        this.updateSeason();
        this.applyTimeEffects();
    }

    /**
     * Update time of day
     */
    updateTimeOfDay() {
        this.dayTurn++;
        const cycleLength = Object.values(dayNightCycle)
            .reduce((total, phase) => total + phase.duration, 0);
            
        if (this.dayTurn >= cycleLength) {
            this.dayTurn = 0;
        }
        
        // Determine current time of day
        let accumulator = 0;
        for (const [phase, data] of Object.entries(dayNightCycle)) {
            accumulator += data.duration;
            if (this.dayTurn < accumulator) {
                this.currentTimeOfDay = phase;
                break;
            }
        }
    }

    /**
     * Update season
     */
    updateSeason() {
        this.seasonalTurn++;
        const seasonLength = seasons[this.currentSeason].duration;
        
        if (this.seasonalTurn >= seasonLength) {
            this.seasonalTurn = 0;
            const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
            const currentIndex = seasonOrder.indexOf(this.currentSeason);
            const nextIndex = (currentIndex + 1) % 4;
            
            this.currentSeason = seasonOrder[nextIndex];
            
            if (nextIndex === 0) {
                this.year++;
            }
        }
    }

    /**
     * Apply time-based effects
     */
    applyTimeEffects() {
        const season = seasons[this.currentSeason];
        const timeOfDay = dayNightCycle[this.currentTimeOfDay];
        
        // Apply seasonal resource modifiers
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                if (tile.resource) {
                    const resourceType = tile.resource.type;
                    tile.productionModifier *= season.resourceModifiers[resourceType] || 1;
                }
            });
        });
        
        // Apply movement and visibility modifiers
        this.gameState.players.forEach(player => {
            player.units.forEach(unit => {
                unit.currentMovementPoints *= season.movementModifier * timeOfDay.movementModifier;
                unit.visibility *= season.visibilityModifier * timeOfDay.visibilityModifier;
                unit.combatModifier *= timeOfDay.combatModifier;
            });
        });
        
        // Apply building speed modifier
        this.gameState.players.forEach(player => {
            player.buildings.forEach(building => {
                if (building.underConstruction) {
                    building.constructionProgress *= season.buildingSpeedModifier;
                }
            });
        });
    }

    /**
     * Get current time description
     */
    getTimeDescription() {
        const season = seasons[this.currentSeason];
        const timeOfDay = dayNightCycle[this.currentTimeOfDay];
        
        return {
            year: this.year,
            season: season.name,
            timeOfDay: timeOfDay.name,
            seasonProgress: `${this.seasonalTurn + 1}/${season.duration}`,
            description: `Year ${this.year}, ${season.name}, ${timeOfDay.name}`,
            effects: this.getCurrentTimeEffects()
        };
    }

    /**
     * Get current time effects
     */
    getCurrentTimeEffects() {
        const season = seasons[this.currentSeason];
        const timeOfDay = dayNightCycle[this.currentTimeOfDay];
        const effects = [];
        
        // Add resource modifiers
        for (const [resource, modifier] of Object.entries(season.resourceModifiers)) {
            effects.push(`${resource} production: ${Math.round(modifier * 100)}%`);
        }
        
        // Add movement and visibility
        effects.push(`Movement: ${Math.round(season.movementModifier * timeOfDay.movementModifier * 100)}%`);
        effects.push(`Visibility: ${Math.round(season.visibilityModifier * timeOfDay.visibilityModifier * 100)}%`);
        effects.push(`Combat: ${Math.round(timeOfDay.combatModifier * 100)}%`);
        effects.push(`Building Speed: ${Math.round(season.buildingSpeedModifier * 100)}%`);
        
        return effects;
    }

    /**
     * Get next season forecast
     */
    getNextSeasonForecast() {
        const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
        const currentIndex = seasonOrder.indexOf(this.currentSeason);
        const nextSeason = seasons[seasonOrder[(currentIndex + 1) % 4]];
        
        return {
            name: nextSeason.name,
            turnsUntilChange: seasons[this.currentSeason].duration - this.seasonalTurn,
            effects: Object.entries(nextSeason.resourceModifiers)
                .map(([resource, modifier]) => `${resource} production: ${Math.round(modifier * 100)}%`)
        };
    }

    /**
     * Skip to next time of day
     */
    skipToNextTimeOfDay() {
        const timeOrder = Object.keys(dayNightCycle);
        const currentIndex = timeOrder.indexOf(this.currentTimeOfDay);
        this.currentTimeOfDay = timeOrder[(currentIndex + 1) % timeOrder.length];
        this.dayTurn = timeOrder
            .slice(0, currentIndex + 1)
            .reduce((total, phase) => total + dayNightCycle[phase].duration, 0);
        this.applyTimeEffects();
    }

    /**
     * Skip to next season
     */
    skipToNextSeason() {
        const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
        const currentIndex = seasonOrder.indexOf(this.currentSeason);
        this.currentSeason = seasonOrder[(currentIndex + 1) % 4];
        this.seasonalTurn = 0;
        
        if (currentIndex === 3) {
            this.year++;
        }
        
        this.applyTimeEffects();
    }

    /**
     * Get light level (0-1)
     */
    getLightLevel() {
        const timeOfDay = dayNightCycle[this.currentTimeOfDay];
        return timeOfDay.visibilityModifier;
    }

    /**
     * Check if it's daytime
     */
    isDaytime() {
        return ['dawn', 'morning', 'noon', 'afternoon'].includes(this.currentTimeOfDay);
    }

    /**
     * Get current date string
     */
    getDateString() {
        return `Year ${this.year}, ${seasons[this.currentSeason].name}, Day ${this.seasonalTurn + 1}`;
    }
}