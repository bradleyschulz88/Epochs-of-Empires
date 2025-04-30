export class GameEvents {
    constructor(gameState) {
        this.gameState = gameState;
        this.eventQueue = [];
        this.activeEvents = [];
        this.eventHistory = [];
    }

    /**
     * Update and process events for current turn
     */
    processTurnEvents() {
        // Process active events
        this.updateActiveEvents();
        
        // Generate new events
        this.generateRandomEvents();
        
        // Process event queue
        this.processEventQueue();
    }

    /**
     * Update currently active events
     */
    updateActiveEvents() {
        this.activeEvents = this.activeEvents.filter(event => {
            if (event.duration) {
                event.remainingTurns--;
                if (event.remainingTurns <= 0) {
                    this.endEvent(event);
                    return false;
                }
                this.applyEventEffects(event);
            }
            return true;
        });
    }

    /**
     * Generate random events based on current game state
     */
    generateRandomEvents() {
        if (Math.random() < this.getEventChance()) {
            const possibleEvents = this.getPossibleEvents();
            if (possibleEvents.length > 0) {
                const event = this.selectRandomEvent(possibleEvents);
                this.queueEvent(event);
            }
        }
    }

    /**
     * Get chance of event occurring this turn
     */
    getEventChance() {
        let baseChance = 0.1; // 10% base chance per turn
        
        // Modify based on game state
        if (this.activeEvents.length > 0) {
            baseChance *= 0.5; // Reduce chance if events already active
        }
        
        // Increase chance based on turns since last event
        const turnsSinceLastEvent = this.getTurnsSinceLastEvent();
        baseChance += turnsSinceLastEvent * 0.01;
        
        return Math.min(baseChance, 0.3); // Cap at 30%
    }

    /**
     * Get turns since last event
     */
    getTurnsSinceLastEvent() {
        if (this.eventHistory.length === 0) return 10;
        return this.gameState.turn - this.eventHistory[this.eventHistory.length - 1].turn;
    }

    /**
     * Get list of possible events based on current conditions
     */
    getPossibleEvents() {
        return Object.entries(this.eventTypes).filter(([_, event]) => 
            this.checkEventConditions(event)
        ).map(([id, event]) => ({
            id,
            ...event
        }));
    }

    /**
     * Check if event conditions are met
     */
    checkEventConditions(event) {
        if (!event.conditions) return true;
        
        for (const condition of event.conditions) {
            if (!this.checkCondition(condition)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check a single condition
     */
    checkCondition(condition) {
        switch (condition.type) {
            case 'season':
                return this.gameState.season === condition.value;
            case 'terrain':
                return this.hasTerrainType(condition.value);
            case 'resource':
                return this.hasResource(condition.value);
            case 'technology':
                return this.hasTechnology(condition.value);
            case 'building':
                return this.hasBuilding(condition.value);
            case 'population':
                return this.checkPopulationCondition(condition);
            default:
                return false;
        }
    }

    /**
     * Check if map has specific terrain type
     */
    hasTerrainType(terrainType) {
        return this.gameState.map.some(row =>
            row.some(tile => tile.type === terrainType)
        );
    }

    /**
     * Check if any player has specific resource
     */
    hasResource(resource) {
        return this.gameState.players.some(player =>
            player.resources[resource] > 0
        );
    }

    /**
     * Check if any player has specific technology
     */
    hasTechnology(technology) {
        return this.gameState.players.some(player =>
            player.technologies?.includes(technology)
        );
    }

    /**
     * Check if any player has specific building
     */
    hasBuilding(buildingType) {
        return this.gameState.map.some(row =>
            row.some(tile =>
                tile.building?.type === buildingType
            )
        );
    }

    /**
     * Check population-related conditions
     */
    checkPopulationCondition(condition) {
        return this.gameState.players.some(player =>
            this.compareValues(player.population, condition.value, condition.operator)
        );
    }

    /**
     * Compare values with operator
     */
    compareValues(a, b, operator) {
        switch (operator) {
            case '>': return a > b;
            case '<': return a < b;
            case '>=': return a >= b;
            case '<=': return a <= b;
            case '=': return a === b;
            default: return false;
        }
    }

    /**
     * Select random event from possible events
     */
    selectRandomEvent(possibleEvents) {
        const totalWeight = possibleEvents.reduce(
            (sum, event) => sum + (event.weight || 1), 0
        );
        
        let random = Math.random() * totalWeight;
        
        for (const event of possibleEvents) {
            random -= (event.weight || 1);
            if (random <= 0) {
                return this.createEventInstance(event);
            }
        }
        
        return this.createEventInstance(possibleEvents[0]);
    }

    /**
     * Create instance of event with specific parameters
     */
    createEventInstance(eventType) {
        return {
            id: eventType.id,
            type: eventType.type,
            name: eventType.name,
            description: eventType.description,
            duration: eventType.duration,
            remainingTurns: eventType.duration,
            effects: eventType.effects,
            options: eventType.options,
            targets: this.selectEventTargets(eventType)
        };
    }

    /**
     * Select targets for event effects
     */
    selectEventTargets(eventType) {
        const targets = {};
        
        if (eventType.targetTypes) {
            for (const [key, targetType] of Object.entries(eventType.targetTypes)) {
                targets[key] = this.selectTarget(targetType);
            }
        }
        
        return targets;
    }

    /**
     * Select specific target based on target type
     */
    selectTarget(targetType) {
        switch (targetType) {
            case 'player':
                return this.selectRandomPlayer();
            case 'tile':
                return this.selectRandomTile();
            case 'unit':
                return this.selectRandomUnit();
            case 'building':
                return this.selectRandomBuilding();
            default:
                return null;
        }
    }

    /**
     * Queue new event
     */
    queueEvent(event) {
        this.eventQueue.push(event);
    }

    /**
     * Process queued events
     */
    processEventQueue() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.startEvent(event);
        }
    }

    /**
     * Start a new event
     */
    startEvent(event) {
        // Apply immediate effects
        this.applyEventEffects(event);
        
        // Add to active events if it has duration
        if (event.duration) {
            this.activeEvents.push(event);
        }
        
        // Add to history
        this.eventHistory.push({
            ...event,
            turn: this.gameState.turn
        });
        
        // Notify players
        this.notifyEventStart(event);
    }

    /**
     * End an active event
     */
    endEvent(event) {
        // Remove effects if necessary
        this.removeEventEffects(event);
        
        // Notify players
        this.notifyEventEnd(event);
    }

    /**
     * Apply event effects
     */
    applyEventEffects(event) {
        if (!event.effects) return;
        
        for (const effect of event.effects) {
            this.applyEffect(effect, event.targets);
        }
    }

    /**
     * Apply a single effect
     */
    applyEffect(effect, targets) {
        switch (effect.type) {
            case 'resource':
                this.applyResourceEffect(effect, targets);
                break;
            case 'terrain':
                this.applyTerrainEffect(effect, targets);
                break;
            case 'unit':
                this.applyUnitEffect(effect, targets);
                break;
            case 'building':
                this.applyBuildingEffect(effect, targets);
                break;
            case 'player':
                this.applyPlayerEffect(effect, targets);
                break;
        }
    }

    /**
     * Remove event effects
     */
    removeEventEffects(event) {
        if (!event.effects) return;
        
        for (const effect of event.effects) {
            if (effect.reversible) {
                this.removeEffect(effect, event.targets);
            }
        }
    }

    /**
     * Remove a single effect
     */
    removeEffect(effect, targets) {
        // Implement reverse of each effect type
        switch (effect.type) {
            case 'resource':
                this.removeResourceEffect(effect, targets);
                break;
            case 'terrain':
                this.removeTerrainEffect(effect, targets);
                break;
            case 'unit':
                this.removeUnitEffect(effect, targets);
                break;
            case 'building':
                this.removeBuildingEffect(effect, targets);
                break;
            case 'player':
                this.removePlayerEffect(effect, targets);
                break;
        }
    }

    /**
     * Notify players about event start
     */
    notifyEventStart(event) {
        // Implementation depends on UI system
        this.gameState.notifyPlayers({
            type: 'eventStart',
            event: event
        });
    }

    /**
     * Notify players about event end
     */
    notifyEventEnd(event) {
        // Implementation depends on UI system
        this.gameState.notifyPlayers({
            type: 'eventEnd',
            event: event
        });
    }

    /**
     * Event type definitions
     */
    eventTypes = {
        drought: {
            name: 'Drought',
            type: 'disaster',
            description: 'A severe drought affects crop yields',
            duration: 3,
            weight: 1,
            conditions: [
                { type: 'season', value: 'summer' }
            ],
            effects: [
                {
                    type: 'resource',
                    resource: 'food',
                    modifier: 0.5,
                    reversible: true
                }
            ]
        },
        plague: {
            name: 'Plague',
            type: 'disaster',
            description: 'A plague spreads through populated areas',
            duration: 4,
            weight: 0.5,
            conditions: [
                { type: 'population', value: 50, operator: '>' }
            ],
            effects: [
                {
                    type: 'player',
                    attribute: 'population',
                    modifier: 0.8,
                    reversible: false
                }
            ]
        },
        goodHarvest: {
            name: 'Abundant Harvest',
            type: 'blessing',
            description: 'Favorable conditions lead to increased crop yields',
            duration: 2,
            weight: 1,
            effects: [
                {
                    type: 'resource',
                    resource: 'food',
                    modifier: 1.5,
                    reversible: true
                }
            ]
        },
        // Add more event types as needed
    };
}
