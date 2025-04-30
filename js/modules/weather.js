export const weatherTypes = {
    clear: {
        name: 'Clear',
        description: 'Clear skies with good visibility',
        movementModifier: 1,
        visibilityModifier: 1.2,
        resourceModifier: 1,
        combatModifier: 1,
        duration: { min: 2, max: 4 },
        weight: 1,
        seasonWeights: {
            spring: 1,
            summer: 1.2,
            autumn: 1,
            winter: 0.8
        }
    },
    rain: {
        name: 'Rain',
        description: 'Rainfall affecting movement and production',
        movementModifier: 0.8,
        visibilityModifier: 0.8,
        resourceModifier: 1.1,
        combatModifier: 0.9,
        duration: { min: 1, max: 3 },
        weight: 0.8,
        seasonWeights: {
            spring: 1.2,
            summer: 0.8,
            autumn: 1.1,
            winter: 0.6
        },
        terrainEffects: {
            desert: { resourceModifier: 1.5 },
            plains: { resourceModifier: 1.2 }
        }
    },
    storm: {
        name: 'Storm',
        description: 'Severe weather impacting all activities',
        movementModifier: 0.6,
        visibilityModifier: 0.6,
        resourceModifier: 0.7,
        combatModifier: 0.8,
        duration: { min: 1, max: 2 },
        weight: 0.4,
        seasonWeights: {
            spring: 0.8,
            summer: 0.6,
            autumn: 1,
            winter: 1.2
        },
        terrainEffects: {
            water: { movementModifier: 0.4 },
            coast: { resourceModifier: 0.5 }
        }
    },
    fog: {
        name: 'Fog',
        description: 'Reduced visibility affecting combat',
        movementModifier: 0.9,
        visibilityModifier: 0.5,
        resourceModifier: 1,
        combatModifier: 0.8,
        duration: { min: 1, max: 2 },
        weight: 0.6,
        seasonWeights: {
            spring: 1.2,
            summer: 0.8,
            autumn: 1.1,
            winter: 1
        }
    },
    snow: {
        name: 'Snow',
        description: 'Snowfall severely impacting movement',
        movementModifier: 0.5,
        visibilityModifier: 0.7,
        resourceModifier: 0.6,
        combatModifier: 0.9,
        duration: { min: 1, max: 3 },
        weight: 0.4,
        seasonWeights: {
            spring: 0.2,
            summer: 0,
            autumn: 0.2,
            winter: 1.5
        },
        terrainEffects: {
            tundra: { movementModifier: 0.8 },
            mountains: { movementModifier: 0.4 }
        }
    },
    drought: {
        name: 'Drought',
        description: 'Extended dry period affecting resources',
        movementModifier: 1,
        visibilityModifier: 1.1,
        resourceModifier: 0.6,
        combatModifier: 1,
        duration: { min: 2, max: 4 },
        weight: 0.3,
        seasonWeights: {
            spring: 0.4,
            summer: 1.2,
            autumn: 0.6,
            winter: 0.1
        },
        terrainEffects: {
            plains: { resourceModifier: 0.5 },
            forest: { resourceModifier: 0.7 }
        }
    }
};

export class WeatherSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.currentWeather = 'clear';
        this.remainingDuration = 0;
        this.weatherHistory = [];
    }

    /**
     * Update weather for current turn
     */
    updateWeather() {
        // Check if current weather should change
        if (this.remainingDuration <= 0) {
            this.generateNewWeather();
        } else {
            this.remainingDuration--;
        }
        
        // Apply weather effects
        this.applyWeatherEffects();
        
        // Update history
        this.updateWeatherHistory();
    }

    /**
     * Generate new weather condition
     */
    generateNewWeather() {
        const season = this.gameState.season;
        const weights = this.calculateWeatherWeights(season);
        
        // Select new weather based on weights
        this.currentWeather = this.selectWeightedWeather(weights);
        
        // Set duration
        const duration = weatherTypes[this.currentWeather].duration;
        this.remainingDuration = this.randomRange(duration.min, duration.max);
    }

    /**
     * Calculate weather probabilities based on season
     */
    calculateWeatherWeights(season) {
        const weights = {};
        
        for (const [type, data] of Object.entries(weatherTypes)) {
            weights[type] = data.weight * (data.seasonWeights[season] || 1);
            
            // Adjust based on previous weather
            if (this.weatherHistory.length > 0) {
                const lastWeather = this.weatherHistory[this.weatherHistory.length - 1];
                if (lastWeather === type) {
                    weights[type] *= 0.8; // Reduce chance of same weather
                }
            }
        }
        
        return weights;
    }

    /**
     * Select weather type based on weights
     */
    selectWeightedWeather(weights) {
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return type;
            }
        }
        
        return 'clear'; // Fallback
    }

    /**
     * Get random number in range
     */
    randomRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Apply weather effects to game state
     */
    applyWeatherEffects() {
        const weather = weatherTypes[this.currentWeather];
        
        // Apply global effects
        this.applyGlobalWeatherEffects(weather);
        
        // Apply terrain-specific effects
        if (weather.terrainEffects) {
            this.applyTerrainWeatherEffects(weather);
        }
    }

    /**
     * Apply global weather effects
     */
    applyGlobalWeatherEffects(weather) {
        // Apply to all units
        this.gameState.players.forEach(player => {
            player.units.forEach(unit => {
                unit.currentMovementPoints *= weather.movementModifier;
                unit.visibility *= weather.visibilityModifier;
                unit.combatModifier *= weather.combatModifier;
            });
        });
        
        // Apply to resource production
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                if (tile.resource) {
                    tile.productionModifier *= weather.resourceModifier;
                }
            });
        });
    }

    /**
     * Apply terrain-specific weather effects
     */
    applyTerrainWeatherEffects(weather) {
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                const terrainEffect = weather.terrainEffects[tile.type];
                if (terrainEffect) {
                    // Apply movement modifier
                    if (terrainEffect.movementModifier) {
                        tile.currentMovementCost /= terrainEffect.movementModifier;
                    }
                    
                    // Apply resource modifier
                    if (terrainEffect.resourceModifier && tile.resource) {
                        tile.productionModifier *= terrainEffect.resourceModifier;
                    }
                }
            });
        });
    }

    /**
     * Update weather history
     */
    updateWeatherHistory() {
        this.weatherHistory.push(this.currentWeather);
        if (this.weatherHistory.length > 10) {
            this.weatherHistory.shift();
        }
    }

    /**
     * Get current weather effects
     */
    getCurrentWeatherEffects() {
        const weather = weatherTypes[this.currentWeather];
        const effects = [];
        
        effects.push(`Movement: ${Math.round(weather.movementModifier * 100)}%`);
        effects.push(`Visibility: ${Math.round(weather.visibilityModifier * 100)}%`);
        effects.push(`Resource Production: ${Math.round(weather.resourceModifier * 100)}%`);
        effects.push(`Combat Effectiveness: ${Math.round(weather.combatModifier * 100)}%`);
        
        if (weather.terrainEffects) {
            for (const [terrain, effect] of Object.entries(weather.terrainEffects)) {
                const effectDesc = [];
                if (effect.movementModifier) {
                    effectDesc.push(`movement ${Math.round(effect.movementModifier * 100)}%`);
                }
                if (effect.resourceModifier) {
                    effectDesc.push(`resources ${Math.round(effect.resourceModifier * 100)}%`);
                }
                effects.push(`${terrain}: ${effectDesc.join(', ')}`);
            }
        }
        
        return effects;
    }

    /**
     * Get weather forecast
     */
    getWeatherForecast() {
        const forecast = [];
        let currentWeather = this.currentWeather;
        let remainingDuration = this.remainingDuration;
        
        // Add current weather
        forecast.push({
            type: currentWeather,
            duration: remainingDuration,
            probability: 1
        });
        
        // Predict next weather
        const nextWeatherWeights = this.calculateWeatherWeights(this.gameState.season);
        const totalWeight = Object.values(nextWeatherWeights).reduce((a, b) => a + b, 0);
        
        // Add probable next weather types
        for (const [type, weight] of Object.entries(nextWeatherWeights)) {
            const probability = weight / totalWeight;
            if (probability > 0.2) { // Only show likely weather
                forecast.push({
                    type: type,
                    probability: probability
                });
            }
        }
        
        return forecast;
    }

    /**
     * Check if a specific weather condition is possible
     */
    isWeatherPossible(weatherType) {
        const season = this.gameState.season;
        return weatherTypes[weatherType]?.seasonWeights[season] > 0;
    }

    /**
     * Get weather description
     */
    getWeatherDescription() {
        const weather = weatherTypes[this.currentWeather];
        return {
            name: weather.name,
            description: weather.description,
            remainingTurns: this.remainingDuration,
            effects: this.getCurrentWeatherEffects()
        };
    }
}