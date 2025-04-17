// Movement System for War Game
import { terrainTypes } from './terrain.js';
import { unitTypes } from './units.js';

// Constants for movement
const ROAD_BONUS_MP = 1;
const ZOC_EXTRA_COST = 1; // Zone of Control additional cost

/**
 * Calculate whether a unit can move to a target tile, considering MP and terrain
 * @param {Object} unit - The unit that will move
 * @param {Object} sourceX - X coordinate of the source tile
 * @param {Object} sourceY - Y coordinate of the source tile
 * @param {Object} targetX - X coordinate of the target tile
 * @param {Object} targetY - Y coordinate of the target tile
 * @param {Array} map - The game map
 * @param {Boolean} isPartOfPath - Whether this is part of a multi-tile path
 * @returns {Object} - Result object with {canMove, cost, reason}
 */
export function canMoveToTile(unit, sourceX, sourceY, targetX, targetY, map, isPartOfPath = false) {
    // Get unit type information
    const unitTypeInfo = unitTypes[unit.type];
    
    // Get the target tile
    const targetTile = map[targetY][targetX];
    const terrainType = targetTile.type;
    
    // Check if the unit already moved this turn
    if (!unit.canMove && !isPartOfPath) {
        return { canMove: false, cost: 0, reason: "Unit has already moved this turn" };
    }
    
    // Check if the target tile has an enemy unit
    if (targetTile.unit && targetTile.unit.owner !== unit.owner) {
        return { canMove: false, cost: 0, reason: "Cannot move to a tile with an enemy unit without attacking" };
    }
    
    // Check if the target tile has a friendly unit
    if (targetTile.unit && targetTile.unit.owner === unit.owner) {
        return { canMove: false, cost: 0, reason: "Cannot move to a tile with a friendly unit" };
    }
    
    // Check terrain passability based on unit type
    const result = checkTerrainPassability(unitTypeInfo, terrainType, unit.isEmbarked);
    if (!result.passable) {
        return { canMove: false, cost: 0, reason: result.reason };
    }
    
    // Calculate the movement cost
    const moveCost = calculateMovementCost(unitTypeInfo, terrainType, map, targetX, targetY, unit.owner);
    
    // Check if unit has enough MP
    if (unit.remainingMP < moveCost && !isPartOfPath) {
        return { 
            canMove: false, 
            cost: moveCost, 
            reason: `Not enough movement points. Needs ${moveCost}, has ${unit.remainingMP}` 
        };
    }
    
    return { 
        canMove: true, 
        cost: moveCost, 
        reason: "Movement possible" 
    };
}

/**
 * Check if terrain is passable for the unit type
 * @param {Object} unitTypeInfo - The unit type info
 * @param {String} terrainType - The terrain type
 * @param {Boolean} isEmbarked - Whether the unit is embarked on a transport
 * @returns {Object} - Result with passable status and reason
 */
function checkTerrainPassability(unitTypeInfo, terrainType, isEmbarked) {
    // If unit is embarked on a transport, it can go where the transport can go
    if (isEmbarked) {
        return { passable: true, reason: "Unit is embarked on a transport" };
    }
    
    // Check unit type against terrain
    const terrainInfo = terrainTypes[terrainType];
    
    // Handle impassable terrain
    if (terrainInfo.moveCost === null) {
        // Water is passable for naval units
        if (terrainType === 'water' && unitTypeInfo.type === 'sea') {
            return { passable: true, reason: "Naval unit can enter water" };
        }
        
        // Water is passable for amphibious units
        if (terrainType === 'water' && unitTypeInfo.abilities && unitTypeInfo.abilities.includes('amphibious')) {
            return { passable: true, reason: "Amphibious unit can enter water" };
        }
        
        // Mountains are passable for air units
        if (terrainType === 'mountain' && unitTypeInfo.type === 'air') {
            return { passable: true, reason: "Air unit can fly over mountains" };
        }
        
        return { passable: false, reason: `${terrainType} is impassable for ${unitTypeInfo.type} units` };
    }
    
    // Rivers are only passable at fords or with appropriate units
    if (terrainType === 'river') {
        // Check if there's a bridge/ford (would be a property of the tile)
        // For now, assume there's no bridge
        const hasBridge = false; // This would be determined by game state
        
        if (!hasBridge && unitTypeInfo.type === 'land') {
            return { passable: false, reason: "Rivers are only passable at bridges/fords" };
        }
    }
    
    return { passable: true, reason: "Terrain is passable" };
}

/**
 * Calculate the movement cost for a unit to move to a tile
 * @param {Object} unitTypeInfo - The unit type info
 * @param {String} terrainType - The terrain type
 * @param {Array} map - The game map
 * @param {Number} x - X coordinate of target tile
 * @param {Number} y - Y coordinate of target tile
 * @param {Number} unitOwner - ID of the unit owner
 * @returns {Number} - The movement cost
 */
function calculateMovementCost(unitTypeInfo, terrainType, map, x, y, unitOwner) {
    // Get the terrain's movement cost
    let cost = terrainTypes[terrainType].moveCost;
    
    // Air units always pay 1MP per tile regardless of terrain
    if (unitTypeInfo.type === 'air') {
        return 1;
    }
    
    // Roads override the underlying terrain cost
    if (terrainType === 'road') {
        return 1; // Fixed cost for roads
    }
    
    // If terrain is water and unit is amphibious
    if (terrainType === 'water' && unitTypeInfo.abilities && unitTypeInfo.abilities.includes('amphibious')) {
        return 2; // Amphibious units pay 2MP for water
    }
    
    // Add Zone of Control cost if there are adjacent enemy units (optional rule)
    if (hasAdjacentEnemyUnit(map, x, y, unitOwner)) {
        cost += ZOC_EXTRA_COST;
    }
    
    return cost;
}

/**
 * Check if a tile has adjacent enemy units (for Zone of Control)
 * @param {Array} map - The game map
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {Number} unitOwner - ID of the unit owner
 * @returns {Boolean} - Whether there are adjacent enemy units
 */
function hasAdjacentEnemyUnit(map, x, y, unitOwner) {
    const mapSize = map.length;
    const directions = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0],           [1, 0],
        [-1, 1],  [0, 1],  [1, 1]
    ];
    
    for (const [dx, dy] of directions) {
        const newX = x + dx;
        const newY = y + dy;
        
        // Check bounds
        if (newX >= 0 && newX < mapSize && newY >= 0 && newY < mapSize) {
            const tile = map[newY][newX];
            if (tile.unit && tile.unit.owner !== unitOwner) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Move a unit to a new location
 * @param {Object} unit - The unit to move
 * @param {Number} targetX - X coordinate of the target tile
 * @param {Number} targetY - Y coordinate of the target tile
 * @param {Array} map - The game map
 * @param {Function} notifyCallback - Function to notify of movement results
 * @returns {Boolean} - Whether the move was successful
 */
export function moveUnit(unit, targetX, targetY, map, notifyCallback) {
    // Check if the move is valid
    const moveResult = canMoveToTile(unit, unit.x, unit.y, targetX, targetY, map);
    
    if (!moveResult.canMove) {
        if (notifyCallback) notifyCallback(moveResult.reason);
        return false;
    }
    
    // Remove unit from current tile
    map[unit.y][unit.x].unit = null;
    
    // Update unit position
    unit.x = targetX;
    unit.y = targetY;
    
    // Place unit on new tile
    map[targetY][targetX].unit = unit;
    
    // Reduce movement points
    unit.remainingMP -= moveResult.cost;
    
    // Check for road bonus - if on a road, gain +1 bonus MP
    if (map[targetY][targetX].type === 'road') {
        unit.remainingMP += ROAD_BONUS_MP;
        // But don't exceed the unit's maximum MP
        const maxMP = unitTypes[unit.type].move;
        if (unit.remainingMP > maxMP) {
            unit.remainingMP = maxMP;
        }
    }
    
    // Check for cavalry charge bonus
    checkForCavalryChargeBonus(unit, map);
    
    // If movement points are depleted, mark unit as unable to move
    if (unit.remainingMP <= 0) {
        unit.canMove = false;
    }
    
    if (notifyCallback) {
        notifyCallback(`Moved ${unit.type} to (${targetX}, ${targetY}). MP remaining: ${unit.remainingMP}`);
    }
    
    return true;
}

/**
 * Board a unit onto a transport ship
 * @param {Object} unit - The land unit to board
 * @param {Object} transport - The transport unit
 * @param {Array} map - The game map
 * @param {Function} notifyCallback - Function to notify of boarding results
 * @returns {Boolean} - Whether the boarding was successful
 */
export function boardTransport(unit, transport, map, notifyCallback) {
    // Check if the transport has capacity
    if (!transport.cargo) {
        transport.cargo = [];
    }
    
    // Check transport capacity (simple version - can be expanded)
    const transportTypeInfo = unitTypes[transport.type];
    const capacity = transportTypeInfo.capacity || 2; // Default capacity of 2 if not specified
    
    if (transport.cargo.length >= capacity) {
        if (notifyCallback) notifyCallback("Transport is at full capacity");
        return false;
    }
    
    // Check if the unit and transport are adjacent
    const areAdjacent = areUnitsAdjacent(unit, transport);
    if (!areAdjacent) {
        if (notifyCallback) notifyCallback("Unit must be adjacent to the transport to board");
        return false;
    }
    
    // Remove the unit from the map
    map[unit.y][unit.x].unit = null;
    
    // Add the unit to the transport's cargo
    transport.cargo.push(unit);
    
    // Mark the unit as embarked
    unit.isEmbarked = true;
    unit.canMove = false; // Unit cannot move independently while embarked
    
    if (notifyCallback) {
        notifyCallback(`${unit.type} boarded the ${transport.type}`);
    }
    
    return true;
}

/**
 * Disembark a unit from a transport
 * @param {Object} unit - The unit to disembark
 * @param {Object} transport - The transport unit
 * @param {Number} targetX - X coordinate to disembark to
 * @param {Number} targetY - Y coordinate to disembark to
 * @param {Array} map - The game map
 * @param {Function} notifyCallback - Function to notify of disembarking results
 * @returns {Boolean} - Whether the disembarking was successful
 */
export function disembarkUnit(unit, transport, targetX, targetY, map, notifyCallback) {
    // Check if the target tile is valid for disembarking
    if (!isTileValidForDisembark(targetX, targetY, map, transport, unit)) {
        if (notifyCallback) notifyCallback("Cannot disembark to that location");
        return false;
    }
    
    // Remove the unit from the transport's cargo
    transport.cargo = transport.cargo.filter(u => u !== unit);
    
    // Place the unit on the map
    unit.x = targetX;
    unit.y = targetY;
    map[targetY][targetX].unit = unit;
    
    // Reset the unit's embarked status
    unit.isEmbarked = false;
    unit.canMove = false; // Unit cannot move after disembarking until next turn
    
    if (notifyCallback) {
        notifyCallback(`${unit.type} disembarked from the ${transport.type} to (${targetX}, ${targetY})`);
    }
    
    return true;
}

/**
 * Check if a tile is valid for disembarking
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {Array} map - The game map
 * @param {Object} transport - The transport unit
 * @param {Object} unit - The unit trying to disembark
 * @returns {Boolean} - Whether the tile is valid for disembarking
 */
function isTileValidForDisembark(x, y, map, transport, unit) {
    // Check if the tile is in bounds
    if (x < 0 || y < 0 || x >= map.length || y >= map.length) {
        return false;
    }
    
    const tile = map[y][x];
    
    // Check if the tile is adjacent to the transport
    if (!isAdjacentToCoordinates(x, y, transport.x, transport.y)) {
        return false;
    }
    
    // Check if the target tile is passable for the unit
    const unitTypeInfo = unitTypes[unit.type];
    const terrainPassability = checkTerrainPassability(unitTypeInfo, tile.type, false);
    if (!terrainPassability.passable) {
        return false;
    }
    
    // Check if the tile is empty
    if (tile.unit) {
        return false;
    }
    
    return true;
}

/**
 * Check if two units are adjacent
 * @param {Object} unit1 - The first unit
 * @param {Object} unit2 - The second unit
 * @returns {Boolean} - Whether the units are adjacent
 */
function areUnitsAdjacent(unit1, unit2) {
    return isAdjacentToCoordinates(unit1.x, unit1.y, unit2.x, unit2.y);
}

/**
 * Check if two coordinates are adjacent
 * @param {Number} x1 - X coordinate of the first point
 * @param {Number} y1 - Y coordinate of the first point
 * @param {Number} x2 - X coordinate of the second point
 * @param {Number} y2 - Y coordinate of the second point
 * @returns {Boolean} - Whether the coordinates are adjacent
 */
function isAdjacentToCoordinates(x1, y1, x2, y2) {
    // Two coordinates are adjacent if they are at most 1 tile away in any direction
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    
    return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
}

/**
 * Check and apply cavalry charge bonus if applicable
 * @param {Object} unit - The unit to check for cavalry charge
 * @param {Array} map - The game map
 */
function checkForCavalryChargeBonus(unit, map) {
    // Check if the unit is cavalry
    const unitTypeInfo = unitTypes[unit.type];
    const isCavalry = unitTypeInfo.type === 'land' && 
                      (unit.type.includes('cavalry') || unit.type.includes('horseman') || unit.type.includes('chariot'));
    
    if (!isCavalry) return;
    
    // Check starting terrain (must be plains or road)
    const startingTerrain = map[unit.startingY][unit.startingX].type;
    if (startingTerrain !== 'plains' && startingTerrain !== 'road') return;
    
    // Check if the unit moved at least 3 MP
    const mpUsed = unitTypeInfo.move - unit.remainingMP;
    if (mpUsed < 3) return;
    
    // Check if there's an enemy in the target tile (handled elsewhere in combat)
    // Here we just set the cavalry charge bonus flag
    unit.cavalryChargeBonusActive = true;
    unit.attackBonus = 5; // +5 to attack on first strike
}

/**
 * Reset movement points for all units at the start of a turn
 * @param {Array} units - Array of all units
 */
export function resetMovementPoints(units) {
    for (const unit of units) {
        const unitTypeInfo = unitTypes[unit.type];
        unit.remainingMP = unitTypeInfo.move;
        unit.canMove = true;
        unit.cavalryChargeBonusActive = false;
        unit.attackBonus = 0;
        
        // Store starting position for cavalry charge calculations
        unit.startingX = unit.x;
        unit.startingY = unit.y;
    }
}

/**
 * Initialize movement properties for a newly created unit
 * @param {Object} unit - The unit to initialize
 */
export function initializeUnitMovement(unit) {
    const unitTypeInfo = unitTypes[unit.type];
    unit.remainingMP = unitTypeInfo.move;
    unit.canMove = true;
    unit.isEmbarked = false;
    unit.cargo = [];
    unit.startingX = unit.x;
    unit.startingY = unit.y;
    unit.cavalryChargeBonusActive = false;
    unit.attackBonus = 0;
}
