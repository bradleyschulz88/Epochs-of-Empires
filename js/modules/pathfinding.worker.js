// Pathfinding WebWorker
// This improves performance by moving expensive path calculations off the main thread

// A* pathfinding implementation
function findPath(start, end, map, unitType) {
  const openSet = new Set([start]);
  const closedSet = new Set();
  const cameFrom = new Map();
  
  const gScore = new Map();
  const fScore = new Map();
  
  gScore.set(nodeKey(start), 0);
  fScore.set(nodeKey(start), heuristic(start, end));
  
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
      fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, end));
    }
  }
  
  return null; // No path found
}

function nodeKey(node) {
  return `${node.x},${node.y}`;
}

function heuristic(a, b) {
  // Using Manhattan distance for hex grid
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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
  const directions = [
    {x: 1, y: 0}, {x: -1, y: 0},
    {x: 0, y: 1}, {x: 0, y: -1},
    {x: 1, y: -1}, {x: -1, y: 1}
  ];
  
  for (const dir of directions) {
    const newX = node.x + dir.x;
    const newY = node.y + dir.y;
    
    if (isValidMove(newX, newY, map, unitType)) {
      neighbors.push({x: newX, y: newY});
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
  
  return terrainCosts[tile.type] || 1;
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