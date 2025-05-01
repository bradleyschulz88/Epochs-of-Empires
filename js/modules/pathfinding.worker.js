// Pathfinding WebWorker
// This improves performance by moving expensive path calculations off the main thread

// Hex directions for a pointy-top hexagon in axial coordinates
const HEX_DIRECTIONS = [
  {q: +1, r: 0},    // east (right)
  {q: +1, r: -1},   // northeast (up right)
  {q: 0, r: -1},    // northwest (up left)
  {q: -1, r: 0},    // west (left)
  {q: -1, r: +1},   // southwest (down left)
  {q: 0, r: +1}     // southeast (down right)
];

// A* pathfinding implementation for hex grid
function findPath(start, end, map, unitType) {
  const openSet = new Set([start]);
  const closedSet = new Set();
  const cameFrom = new Map();
  
  const gScore = new Map();
  const fScore = new Map();
  
  gScore.set(nodeKey(start), 0);
  fScore.set(nodeKey(start), hexHeuristic(start, end));
  
  while (openSet.size > 0) {
    const current = getLowestFScore(openSet, fScore);
    
    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(cameFrom, current);
    }
    
    openSet.delete(current);
    closedSet.add(nodeKey(current));
    
    const neighbors = getValidNeighbors(current, map, unitType);
    
    for (const neighbor of neighbors) {
      const neighborKey = nodeKey(neighbor);
      
      if (closedSet.has(neighborKey)) {
        continue;
      }
      
      const tentativeGScore = gScore.get(nodeKey(current)) + getMovementCost(current, neighbor, map, unitType);
      
      if (!openSet.has(neighbor)) {
        openSet.add(neighbor);
      } else if (tentativeGScore >= gScore.get(neighborKey)) {
        continue;
      }
      
      cameFrom.set(neighborKey, current);
      gScore.set(neighborKey, tentativeGScore);
      fScore.set(neighborKey, tentativeGScore + hexHeuristic(neighbor, end));
    }
  }
  
  return null; // No path found
}

function nodeKey(node) {
  // Use q,r if available, otherwise fall back to x,y
  if (node.q !== undefined && node.r !== undefined) {
    return `${node.q},${node.r}`;
  }
  return `${node.x},${node.y}`;
}

function hexHeuristic(a, b) {
  // Proper hex distance calculation
  // If nodes have q,r coordinates, use those; otherwise use x,y
  const q1 = a.q !== undefined ? a.q : a.x;
  const r1 = a.r !== undefined ? a.r : a.y;
  const q2 = b.q !== undefined ? b.q : b.x;
  const r2 = b.r !== undefined ? b.r : b.y;
  
  // In axial coordinates, distance = (abs(q1-q2) + abs(r1-r2) + abs(q1+r1-q2-r2)) / 2
  return (
    Math.abs(q1 - q2) + 
    Math.abs(r1 - r2) + 
    Math.abs(q1 + r1 - q2 - r2)
  ) / 2;
}

function getLowestFScore(set, scores) {
  let lowest = null;
  let lowestScore = Infinity;
  
  for (const node of set) {
    const score = scores.get(nodeKey(node));
    if (score < lowestScore) {
      lowest = node;
      lowestScore = score;
    }
  }
  
  return lowest;
}

function getValidNeighbors(node, map, unitType) {
  const neighbors = [];
  const mapSize = map.length;
  
  // Get axial coordinates of the node (either from q,r properties or use x,y as fallback)
  const q = node.q !== undefined ? node.q : node.x;
  const r = node.r !== undefined ? node.r : node.y;
  
  // Check all six directions for hex grid
  for (const dir of HEX_DIRECTIONS) {
    const newQ = q + dir.q;
    const newR = r + dir.r;
    
    // Find the x,y coordinates for this axial coordinate
    let x = -1, y = -1, found = false;
    
    // First try to find the tile by its axial coordinates
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        if (map[y][x].q === newQ && map[y][x].r === newR) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    
    // If not found and we're in transition, try using axial as indices directly
    if (!found && newQ >= 0 && newQ < mapSize && newR >= 0 && newR < mapSize) {
      x = newQ;
      y = newR;
      found = true;
    }
    
    // Skip if we couldn't find corresponding coordinates
    if (!found) continue;
    
    if (isValidMove(x, y, map, unitType)) {
      // Create neighbor with both coordinate systems
      neighbors.push({
        x: x,
        y: y,
        q: newQ,
        r: newR
      });
    }
  }
  
  return neighbors;
}

function isValidMove(x, y, map, unitType) {
  if (x < 0 || x >= map.length || y < 0 || y >= map[0].length) {
    return false;
  }
  
  const tile = map[y][x];
  
  // Check terrain passability based on unit type
  if (unitType === 'land' && tile.type === 'water') {
    return false;
  }
  
  if (unitType === 'sea' && tile.type !== 'water') {
    return false;
  }
  
  // Allow air units to pass over any terrain
  if (unitType === 'air') {
    return true;
  }
  
  // Check if tile is occupied
  if (tile.unit || tile.building) {
    return false;
  }
  
  return true;
}

function getMovementCost(from, to, map, unitType) {
  const tile = map[to.y][to.x];
  const terrainCosts = {
    plains: 1,
    forest: 2,
    mountain: 3,
    desert: 1.5,
    water: unitType === 'sea' ? 1 : 99,
    swamp: 2
  };
  
  // Add diagonal movement cost for hex grid
  let cost = terrainCosts[tile.type] || 1;
  
  // When moving between tiles that aren't orthogonally adjacent, apply slight increase
  const fromQ = from.q !== undefined ? from.q : from.x;
  const fromR = from.r !== undefined ? from.r : from.y;
  const toQ = to.q !== undefined ? to.q : to.x;
  const toR = to.r !== undefined ? to.r : to.y;
  
  // For hex grid, this is more complex - we check if it's a diagonal move in axial coordinates
  if (fromQ !== toQ && fromR !== toR && (fromQ - toQ) !== (toR - fromR)) {
    cost *= 1.1; // Slight penalty for non-direct hex moves
  }
  
  return cost;
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  let key = nodeKey(current);
  
  while (cameFrom.has(key)) {
    current = cameFrom.get(key);
    path.unshift(current);
    key = nodeKey(current);
  }
  
  return path;
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { start, end, map, unitType } = e.data;
  const path = findPath(start, end, map, unitType);
  self.postMessage({ path });
};
