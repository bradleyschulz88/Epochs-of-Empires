// Movement System for War Game with Hex Grid Support
import { terrainTypes } from './terrain.js';
import { unitTypes } from './units.js';
import { 
  HEX_DIRECTIONS, 
  axialToPixel, 
  pixelToAxial, 
  hexDistance, 
  areHexesAdjacent 
} from './hexgrid.js';

// Constants for movement
const ZOC_EXTRA_COST = 1; // Zone of Control additional cost
const DEBUG_MOVEMENT = true; // Enable movement debugging

/**
 * Calculate whether a unit can move to a target tile, considering MP and terrain
 * @param {Object} unit - The unit that will move
 * @param {Number} sourceX - X coordinate of the source tile
 * @param {Number} sourceY - Y coordinate of the source tile
 * @param {Number} targetX - X coordinate of the target tile
 * @param {Number} targetY - Y coordinate of the target tile
 * @param {Array} map - The game map
 * @param {Boolean} isPartOfPath - Whether this is part of a multi-tile path
 * @returns {Object} - Result object with {canMove, cost, reason}
 */
export function canMoveToTile(unit, sourceX, sourceY, targetX, targetY, map, isPartOfPath = false) {
    // Ensure unit has movement properties initialized
    if (unit.remainingMP === undefined || unit.canMove === undefined) {
        initializeUnitMovement(unit);
    }
    
    // Get unit type information
    const unitTypeInfo = unitTypes[unit.type];
    
    // Get the source and target tiles
    const sourceTile = map[sourceY][sourceX];
    const targetTile = map[targetY][targetX];
    const terrainType = targetTile.type;
    
    // Get axial coordinates if available
    const sourceQ = sourceTile.q !== undefined ? sourceTile.q : sourceX;
    const sourceR = sourceTile.r !== undefined ? sourceTile.r : sourceY;
    const targetQ = targetTile.q !== undefined ? targetTile.q : targetX;
    const targetR = targetTile.r !== undefined ? targetTile.r : targetY;
    
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
    
    // Check if hex is adjacent - in hex grid, only 6 directions are valid neighbors
    // Calculate axial distance between tiles
    const axialDistance = (Math.abs(targetQ - sourceQ) + Math.abs(targetR - sourceR) + 
                          Math.abs(sourceQ + sourceR - targetQ - targetR)) / 2;
    
    if (axialDistance > 1) {
        return { canMove: false, cost: 0, reason: "Hex is not adjacent to the current location" };
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
    // Check if terrain info exists
    const terrainInfo = terrainTypes[terrainType];
    if (!terrainInfo) {
        if (DEBUG_MOVEMENT) {
            console.error(`Unknown terrain type: ${terrainType}, using default cost of 1`);
        }
        return 1;
    }
    
    // Start with base cost from terrain
    let cost = terrainInfo.moveCost;
    
    // Handle special cases based on unit type
    if (DEBUG_MOVEMENT) {
        console.log(`Calculating movement cost for ${unitTypeInfo.type} unit on ${terrainType} terrain (base cost: ${cost})`);
    }
    
    // Air units always pay 1MP per tile regardless of terrain
    if (unitTypeInfo.type === 'air') {
        if (DEBUG_MOVEMENT) {
            console.log(`Air unit movement cost override: 1`);
        }
        return 1;
    }
    
    // Road terrain has been removed
    
    // If terrain is water and unit is amphibious
    if (terrainType === 'water' && unitTypeInfo.abilities && unitTypeInfo.abilities.includes('amphibious')) {
        if (DEBUG_MOVEMENT) {
            console.log(`Amphibious unit on water cost override: 2`);
        }
        return 2; // Amphibious units pay 2MP for water
    }
    
    // Check for mobility ability - reduces terrain cost by 1 (minimum 1)
    if (unitTypeInfo.abilities && unitTypeInfo.abilities.includes('mobility') && cost > 1) {
        cost -= 1;
        if (DEBUG_MOVEMENT) {
            console.log(`Mobility ability reduces cost to ${cost}`);
        }
    }
    
    // Add Zone of Control cost if there are adjacent enemy units (optional rule)
    const hasZOC = hasAdjacentEnemyUnit(map, x, y, unitOwner);
    if (hasZOC) {
        cost += ZOC_EXTRA_COST;
        if (DEBUG_MOVEMENT) {
            console.log(`Zone of Control adds ${ZOC_EXTRA_COST} to cost, new total: ${cost}`);
        }
    }
    
    if (DEBUG_MOVEMENT) {
        console.log(`Final movement cost: ${cost}`);
    }
    
    return cost;
}

/**
 * Check if a tile has adjacent enemy units (for Zone of Control) using hex grid
 * @param {Array} map - The game map
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {Number} unitOwner - ID of the unit owner
 * @returns {Boolean} - Whether there are adjacent enemy units
 */
function hasAdjacentEnemyUnit(map, x, y, unitOwner) {
    const mapSize = map.length;
    const tile = map[y][x];
    
    // Get q,r axial coordinates from the tile if they exist
    const q = tile.q !== undefined ? tile.q : x;
    const r = tile.r !== undefined ? tile.r : y;
    
    // Use the HEX_DIRECTIONS constant from map.js
    for (const dir of HEX_DIRECTIONS) {
        const newQ = q + dir.q;
        const newR = r + dir.r;
        
        // Find the corresponding x,y coordinates for the q,r neighbor
        // During transition, we need to find tiles by their axial coordinates
        let adjacentTile = null;
        
        // Try to find the tile by axial coordinates
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                if (map[y][x].q === newQ && map[y][x].r === newR) {
                    adjacentTile = map[y][x];
                    break;
                }
            }
            if (adjacentTile) break;
        }
        
        // If tile was not found by axial coordinates, for backward compatibility
        // try using the axial coordinates directly as array indices if they're in bounds
        if (!adjacentTile && newQ >= 0 && newQ < mapSize && newR >= 0 && newR < mapSize) {
            adjacentTile = map[newR][newQ];
        }
        
        // Check if the tile has an enemy unit
        if (adjacentTile && adjacentTile.unit && adjacentTile.unit.owner !== unitOwner) {
            return true;
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
    // Ensure unit has movement properties initialized
    if (unit.remainingMP === undefined || unit.canMove === undefined) {
        initializeUnitMovement(unit);
    }
    
    // Print debug information if debugging is enabled
    if (DEBUG_MOVEMENT) {
        console.log(`Movement attempt - ${unit.type} from (${unit.x},${unit.y}) to (${targetX},${targetY})`);
        console.log(`Current MP: ${unit.remainingMP}, Can move: ${unit.canMove}`);
    }
    
    // Check if the move is valid
    const moveResult = canMoveToTile(unit, unit.x, unit.y, targetX, targetY, map);
    
    if (!moveResult.canMove) {
        if (DEBUG_MOVEMENT) {
            console.log(`Movement failed: ${moveResult.reason}`);
        }
        if (notifyCallback) notifyCallback(moveResult.reason);
        return false;
    }
    
    // Get the terrain type for debugging
    const sourceTerrainType = map[unit.y][unit.x].type;
    const targetTerrainType = map[targetY][targetX].type;
    
    if (DEBUG_MOVEMENT) {
        console.log(`Terrain: ${sourceTerrainType} -> ${targetTerrainType}, Movement cost: ${moveResult.cost}`);
    }
    
    // Store axial coordinates if present in source tile
    const sourceQ = map[unit.y][unit.x].q;
    const sourceR = map[unit.y][unit.x].r;
    
    // Remove unit from current tile
    map[unit.y][unit.x].unit = null;
    
    // Update unit position
    unit.x = targetX;
    unit.y = targetY;
    
    // Update axial coordinates if available
    if (map[targetY][targetX].q !== undefined) {
        unit.q = map[targetY][targetX].q;
    }
    if (map[targetY][targetX].r !== undefined) {
        unit.r = map[targetY][targetX].r;
    }
    
    // Place unit on new tile
    map[targetY][targetX].unit = unit;
    
    // Store old MP for debugging
    const oldMP = unit.remainingMP;
    
    // Reduce movement points
    unit.remainingMP -= moveResult.cost;
    
    // Road bonus section removed as road terrain has been removed
    let roadBonusApplied = false;
    
    // Check for cavalry charge bonus
    checkForCavalryChargeBonus(unit, map);
    
    // If movement points are depleted, mark unit as unable to move
    if (unit.remainingMP <= 0) {
        unit.canMove = false;
        if (DEBUG_MOVEMENT) {
            console.log(`${unit.type} has no MP left, marking as unable to move.`);
        }
    }
    
    if (DEBUG_MOVEMENT) {
        console.log(`Movement complete: ${oldMP} -> ${unit.remainingMP} MP (${roadBonusApplied ? 'with' : 'without'} road bonus)`);
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
    
    // Update axial coordinates if available in target tile
    if (map[targetY][targetX].q !== undefined) {
        unit.q = map[targetY][targetX].q;
    }
    if (map[targetY][targetX].r !== undefined) {
        unit.r = map[targetY][targetX].r;
    }
    
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
    // For hexagonal grids we need to check using hex adjacency
    if (!isAdjacentToCoordinatesHex(
        tile.q !== undefined ? tile.q : x, 
        tile.r !== undefined ? tile.r : y, 
        transport.q !== undefined ? transport.q : transport.x, 
        transport.r !== undefined ? transport.r : transport.y
    )) {
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
 * Check if two units are adjacent (works with both square and hex grids)
 * @param {Object} unit1 - The first unit
 * @param {Object} unit2 - The second unit
 * @returns {Boolean} - Whether the units are adjacent
 */
function areUnitsAdjacent(unit1, unit2) {
    // If axial coordinates are available, use hex adjacency
    if (unit1.q !== undefined && unit1.r !== undefined && 
        unit2.q !== undefined && unit2.r !== undefined) {
        return isAdjacentToCoordinatesHex(unit1.q, unit1.r, unit2.q, unit2.r);
    }
    
    // Fall back to square grid adjacency
    return isAdjacentToCoordinates(unit1.x, unit1.y, unit2.x, unit2.y);
}

/**
 * Check if two coordinates are adjacent using square grid
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
 * Check if two hexes are adjacent using axial coordinates
 * @param {Number} q1 - Q axial coordinate of the first hex
 * @param {Number} r1 - R axial coordinate of the first hex
 * @param {Number} q2 - Q axial coordinate of the second hex
 * @param {Number} r2 - R axial coordinate of the second hex
 * @returns {Boolean} - Whether the hexes are adjacent
 */
function isAdjacentToCoordinatesHex(q1, r1, q2, r2) {
    // Calculate the axial distance between two hexes
    // In axial coordinates, distance = (abs(q1-q2) + abs(r1-r2) + abs(q1+r1-q2-r2)) / 2
    const distance = (
        Math.abs(q1 - q2) + 
        Math.abs(r1 - r2) + 
        Math.abs(q1 + r1 - q2 - r2)
    ) / 2;
    
    // Hexes are adjacent if their distance is exactly 1
    return distance === 1;
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
    
    // Check starting terrain (must be plains)
    const startingTerrain = map[unit.startingY][unit.startingX].type;
    if (startingTerrain !== 'plains') return;
    
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
    if (!units || units.length === 0) {
        if (DEBUG_MOVEMENT) {
            console.log("No units to reset movement points for!");
        }
        return;
    }
    
    if (DEBUG_MOVEMENT) {
        console.log(`Resetting movement points for ${units.length} units`);
    }
    
    for (const unit of units) {
        // Skip units that don't exist anymore (could happen if the unit was destroyed)
        if (!unit) continue;
        
        const unitTypeInfo = unitTypes[unit.type];
        if (!unitTypeInfo) {
            if (DEBUG_MOVEMENT) {
                console.error(`Could not find type info for unit type: ${unit.type}`);
            }
            continue;
        }
        
        // Record previous values for debugging
        const oldMP = unit.remainingMP !== undefined ? unit.remainingMP : 'undefined';
        const oldCanMove = unit.canMove !== undefined ? unit.canMove : 'undefined';
        
        // Set new values
        unit.remainingMP = unitTypeInfo.move;
        unit.canMove = true;
        unit.cavalryChargeBonusActive = false;
        unit.attackBonus = 0;
        
        // Store starting position for cavalry charge calculations
        unit.startingX = unit.x;
        unit.startingY = unit.y;
        if (unit.q !== undefined) unit.startingQ = unit.q;
        if (unit.r !== undefined) unit.startingR = unit.r;
        
        if (DEBUG_MOVEMENT) {
            console.log(`Reset unit ${unit.type} MP: ${oldMP} -> ${unit.remainingMP}, Can move: ${oldCanMove} -> ${unit.canMove}`);
        }
    }
}

/**
 * Initialize movement properties for a newly created unit
 * @param {Object} unit - The unit to initialize
 */
export function initializeUnitMovement(unit) {
    const unitTypeInfo = unitTypes[unit.type];
    
    if (!unitTypeInfo) {
        if (DEBUG_MOVEMENT) {
            console.error(`Failed to initialize movement for unit with type: ${unit.type}`);
        }
        // Use default values as fallback
        unit.remainingMP = 1;
        unit.canMove = true;
    } else {
        unit.remainingMP = unitTypeInfo.move;
        unit.canMove = true;
        
        if (DEBUG_MOVEMENT) {
            console.log(`Initialized unit ${unit.type} with ${unit.remainingMP} MP`);
        }
    }
    
    unit.isEmbarked = false;
    unit.cargo = [];
    unit.startingX = unit.x;
    unit.startingY = unit.y;
    if (unit.q !== undefined) unit.startingQ = unit.q;
    if (unit.r !== undefined) unit.startingR = unit.r;
    unit.cavalryChargeBonusActive = false;
    unit.attackBonus = 0;
}

/**
 * Find all valid movement locations for a selected unit using hex grid
 * @param {Object} unit - The unit to check movement for
 * @param {Array} map - The game map
 * @returns {Array} - Array of valid movement locations as {x, y, cost} objects
 */
export function getValidMovementLocations(unit, map) {
    if (!unit) return [];
    
    // Ensure unit has movement properties initialized
    if (unit.remainingMP === undefined || unit.canMove === undefined) {
        initializeUnitMovement(unit);
    }
    
    // If unit can't move, return empty array
    if (!unit.canMove || unit.remainingMP <= 0) {
        return [];
    }
    
    const mapSize = map.length;
    const validLocations = [];
    
    // Get the unit's axial coordinates if available
    const unitQ = unit.q !== undefined ? unit.q : unit.x;
    const unitR = unit.r !== undefined ? unit.r : unit.y;
    
    // Use breadth-first search to find all reachable tiles within MP limit
    const queue = [{
        x: unit.x, 
        y: unit.y, 
        q: unitQ, 
        r: unitR, 
        mpLeft: unit.remainingMP
    }];
    
    // Track visited tiles to avoid loops (use coordKey to handle both coord systems)
    const visited = {}; 
    const coordKey = unit.q !== undefined ? `${unitQ},${unitR}` : `${unit.x},${unit.y}`;
    visited[coordKey] = true;
    
    // Use HEX_DIRECTIONS constant for movement
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Skip the starting tile for valid locations list
        if (current.x !== unit.x || current.y !== unit.y) {
            validLocations.push({
                x: current.x,
                y: current.y,
                q: current.q,
                r: current.r,
                cost: unit.remainingMP - current.mpLeft
            });
        }
        
        // Check each possible hex direction using HEX_DIRECTIONS from map.js
        for (const dir of HEX_DIRECTIONS) {
            const nextQ = current.q + dir.q;
            const nextR = current.r + dir.r;
            
            // Find the corresponding x,y coordinates for the q,r neighbor
            let nextX = -1;
            let nextY = -1;
            let nextTile = null;
            
            // Try to find the tile by axial coordinates first
            for (let y = 0; y < mapSize; y++) {
                for (let x = 0; x < mapSize; x++) {
                    if (map[y][x].q === nextQ && map[y][x].r === nextR) {
                        nextX = x;
                        nextY = y;
                        nextTile = map[y][x];
                        break;
                    }
                }
                if (nextTile) break;
            }
            
            // If tile not found by axial coords and we're in transition phase,
            // try using axial coords directly as indices if in bounds 
            if (!nextTile && nextQ >= 0 && nextQ < mapSize && nextR >= 0 && nextR < mapSize) {
                nextX = nextQ;
                nextY = nextR;
                nextTile = map[nextY][nextX];
            }
            
            // Skip if no valid tile was found or if already visited
            if (!nextTile || visited[`${nextX},${nextY}`]) {
                continue;
            }
            
            // Check if we can move to this tile
            const moveResult = canMoveToTile(unit, current.x, current.y, nextX, nextY, map, true);
            
            if (moveResult.canMove && moveResult.cost <= current.mpLeft) {
                // Mark as visited
                visited[`${nextX},${nextY}`] = true;
                
                // Add to queue with updated MP
                queue.push({
                    x: nextX,
                    y: nextY,
                    q: nextQ,
                    r: nextR,
                    mpLeft: current.mpLeft - moveResult.cost
                });
            }
        }
    }
    
    if (DEBUG_MOVEMENT) {
        console.log(`Found ${validLocations.length} valid movement locations for ${unit.type} at (${unit.x},${unit.y})`);
    }
    
    return validLocations;
}
