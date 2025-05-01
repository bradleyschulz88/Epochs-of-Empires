// Error handling and validation module

/**
 * ErrorHandler class for managing game errors and validation
 */
export class ErrorHandler {
    constructor(gameState) {
        this.gameState = gameState;
        this.errors = [];
    }
    
    /**
     * Validate the current game state
     * @returns {boolean} Whether the state is valid
     */
    validateState() {
        const result = validateGameState(this.gameState);
        this.errors = result.errors;
        return result.isValid;
    }
    
    /**
     * Handle an error with context
     * @param {string} context - Error context
     * @param {Error} error - Error object
     */
    handleError(context, error) {
        handleError(context, error);
        this.errors.push({ context, error: error.message });
    }
    
    /**
     * Attempt to recover from errors in the game state
     */
    attemptRecovery() {
        this.gameState = cleanGameState(this.gameState);
        this.errors = [];
    }
    
    /**
     * Get list of errors
     * @returns {Array} List of errors
     */
    getErrors() {
        return this.errors;
    }
}


/**
 * Validate the game state structure and data
 * @param {Object} gameState - The game state to validate
 * @returns {Object} - Validation result with isValid flag and errors array
 */
export function validateGameState(gameState) {
    const errors = [];

    // Required top-level properties
    const requiredProps = ['mapSize', 'map', 'players', 'currentPlayer', 'gameStarted'];
    requiredProps.forEach(prop => {
        if (!gameState.hasOwnProperty(prop)) {
            errors.push(`Missing required property: ${prop}`);
        }
    });

    // Map validation
    if (gameState.map) {
        if (!Array.isArray(gameState.map)) {
            errors.push('Map must be an array');
        } else {
            // Check map dimensions
            if (gameState.map.length !== gameState.mapSize) {
                errors.push(`Map height (${gameState.map.length}) does not match mapSize (${gameState.mapSize})`);
            }
            gameState.map.forEach((row, i) => {
                if (!Array.isArray(row)) {
                    errors.push(`Map row ${i} must be an array`);
                } else if (row.length !== gameState.mapSize) {
                    errors.push(`Map row ${i} width (${row.length}) does not match mapSize (${gameState.mapSize})`);
                }
            });
        }
    }

    // Players validation
    if (gameState.players) {
        if (!Array.isArray(gameState.players)) {
            errors.push('Players must be an array');
        } else {
            gameState.players.forEach((player, i) => {
                if (!player.hasOwnProperty('resources')) {
                    errors.push(`Player ${i} missing resources`);
                }
                if (!player.hasOwnProperty('buildings')) {
                    errors.push(`Player ${i} missing buildings array`);
                }
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Log an error with context and optional recovery action
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 * @param {Function} recoveryAction - Optional function to attempt recovery
 */
export function handleError(context, error, recoveryAction = null) {
    console.error(`Error in ${context}:`, error);
    
    // Log to analytics or error tracking service if available
    if (window.errorTracking) {
        window.errorTracking.logError(context, error);
    }

    if (recoveryAction) {
        try {
            console.log(`Attempting recovery for ${context}`);
            recoveryAction();
        } catch (recoveryError) {
            console.error(`Recovery failed for ${context}:`, recoveryError);
        }
    }
}

/**
 * Clean up game state in case of corruption
 * @param {Object} gameState - The game state to clean
 * @returns {Object} - Cleaned game state
 */
export function cleanGameState(gameState) {
    const cleanState = { ...gameState };

    // Ensure all required arrays exist
    cleanState.players = cleanState.players || [];
    cleanState.map = cleanState.map || [];
    
    // Clean up player data
    cleanState.players.forEach(player => {
        player.resources = player.resources || {};
        player.buildings = player.buildings || [];
        player.units = player.units || [];
        player.technologies = player.technologies || [];
    });

    // Ensure valid currentPlayer
    if (!cleanState.currentPlayer || cleanState.currentPlayer < 1) {
        cleanState.currentPlayer = 1;
    }

    return cleanState;
}

/**
 * Validate a specific game action before executing
 * @param {string} actionType - Type of action being performed
 * @param {Object} params - Parameters for the action
 * @returns {Object} - Validation result with isValid flag and error message
 */
export function validateGameAction(actionType, params) {
    switch (actionType) {
        case 'move':
            return validateMoveAction(params);
        case 'build':
            return validateBuildAction(params);
        case 'research':
            return validateResearchAction(params);
        default:
            return { isValid: false, error: 'Unknown action type' };
    }
}

// Private helper functions for action validation
function validateMoveAction({ unit, targetX, targetY, mapSize }) {
    if (!unit) return { isValid: false, error: 'No unit specified' };
    if (targetX < 0 || targetX >= mapSize || targetY < 0 || targetY >= mapSize) {
        return { isValid: false, error: 'Target position out of bounds' };
    }
    return { isValid: true };
}

function validateBuildAction({ building, resources, position }) {
    if (!building) return { isValid: false, error: 'No building specified' };
    if (!position) return { isValid: false, error: 'No position specified' };
    if (!resources) return { isValid: false, error: 'No resources specified' };
    return { isValid: true };
}

function validateResearchAction({ technology, player }) {
    if (!technology) return { isValid: false, error: 'No technology specified' };
    if (!player) return { isValid: false, error: 'No player specified' };
    return { isValid: true };
}
