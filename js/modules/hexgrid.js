/**
 * Hex Grid Module
 * A reusable module for creating and working with hexagonal grids.
 */

/**
 * Create a hexagonal grid with the specified parameters
 * @param {Number} width - Number of columns (q-axis)
 * @param {Number} height - Number of rows (r-axis)
 * @param {Number} size - Hex radius in pixels (distance from center to corner)
 * @param {Array} origin - [x0, y0] pixel offset for the grid's top-left corner
 * @returns {Array} - Array of hex tile objects
 */
export function createHexGrid(width, height, size, origin = [0, 0]) {
  const [x0, y0] = origin;
  const xOffset = Math.sqrt(3) * size;
  const yOffset = 1.5 * size;
  const directions = [
    [+1, 0], [+1, -1], [0, -1],
    [-1, 0], [-1, +1], [0, +1],
  ];
  
  const tiles = [];
  
  for (let c = 0; c < width; c++) {
    for (let r = 0; r < height; r++) {
      // Calculate pixel coordinates for the hex center
      const x = x0 + c * xOffset;
      const y = y0 + r * yOffset + (c % 2) * (yOffset/2);
      
      // Create neighbor references
      const neighbors = directions.map(([dq, dr]) => ({ q: c + dq, r: r + dr }));
      
      // Create the hex tile
      tiles.push({
        q: c,              // axial q coordinate
        r: r,              // axial r coordinate
        x: x,              // pixel center x
        y: y,              // pixel center y
        neighbors: neighbors, // list of neighbor coordinates
      });
    }
  }
  
  return tiles;
}

/**
 * Hex directions for a pointy-top hexagon in axial coordinates
 */
export const HEX_DIRECTIONS = [
  {q: +1, r: 0},    // east (right)
  {q: +1, r: -1},   // northeast (up right)
  {q: 0, r: -1},    // northwest (up left)
  {q: -1, r: 0},    // west (left)
  {q: -1, r: +1},   // southwest (down left)
  {q: 0, r: +1}     // southeast (down right)
];

/**
 * Convert axial coordinates (q,r) to pixel coordinates (x,y)
 * For pointy-top hexagons
 * @param {Number} q - Q axial coordinate
 * @param {Number} r - R axial coordinate
 * @param {Number} size - Size of hex (distance from center to corner)
 * @returns {Object} - {x, y} pixel coordinates
 */
export function axialToPixel(q, r, size) {
  const x = size * Math.sqrt(3) * (q + r/2);
  const y = size * 3/2 * r;
  return {x, y};
}

/**
 * Convert pixel coordinates (x,y) to axial coordinates (q,r)
 * @param {Number} x - X pixel coordinate
 * @param {Number} y - Y pixel coordinate
 * @param {Number} size - Size of hex (distance from center to corner)
 * @returns {Object} - {q, r} axial coordinates (rounded to nearest hex)
 */
export function pixelToAxial(x, y, size) {
  const q_float = (x * Math.sqrt(3)/3 - y/3) / size;
  const r_float = y * 2/3 / size;
  return roundToHex(q_float, r_float);
}

/**
 * Helper function to round floating point axial coordinates to the nearest hex
 * @param {Number} q - Q axial coordinate (floating point)
 * @param {Number} r - R axial coordinate (floating point)
 * @returns {Object} - {q, r} axial coordinates (rounded integers)
 */
export function roundToHex(q, r) {
  // Convert to cube coordinates for rounding
  let x = q;
  let z = r;
  let y = -x - z;
  
  // Round cube coordinates
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  
  // Fix rounding errors
  const x_diff = Math.abs(rx - x);
  const y_diff = Math.abs(ry - y);
  const z_diff = Math.abs(rz - z);
  
  if (x_diff > y_diff && x_diff > z_diff) {
    rx = -ry - rz;
  } else if (y_diff > z_diff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  
  // Convert back to axial coordinates
  return {q: rx, r: rz};
}

/**
 * Calculate the distance between two hexes using axial coordinates
 * @param {Number} q1 - Q axial coordinate of first hex
 * @param {Number} r1 - R axial coordinate of first hex
 * @param {Number} q2 - Q axial coordinate of second hex
 * @param {Number} r2 - R axial coordinate of second hex
 * @returns {Number} - The distance in hex steps
 */
export function hexDistance(q1, r1, q2, r2) {
  // In axial coordinates, distance = (abs(q1-q2) + abs(r1-r2) + abs(q1+r1-q2-r2)) / 2
  return (
    Math.abs(q1 - q2) + 
    Math.abs(r1 - r2) + 
    Math.abs(q1 + r1 - q2 - r2)
  ) / 2;
}

/**
 * Check if two hexes are adjacent using axial coordinates
 * @param {Number} q1 - Q axial coordinate of the first hex
 * @param {Number} r1 - R axial coordinate of the first hex
 * @param {Number} q2 - Q axial coordinate of the second hex
 * @param {Number} r2 - R axial coordinate of the second hex
 * @returns {Boolean} - Whether the hexes are adjacent
 */
export function areHexesAdjacent(q1, r1, q2, r2) {
  return hexDistance(q1, r1, q2, r2) === 1;
}

/**
 * Get all neighboring coordinates for a given hex
 * @param {Number} q - Q axial coordinate
 * @param {Number} r - R axial coordinate
 * @returns {Array} - Array of {q, r} neighbor coordinates
 */
export function getHexNeighbors(q, r) {
  return HEX_DIRECTIONS.map(dir => ({
    q: q + dir.q,
    r: r + dir.r
  }));
}

/**
 * Find a hex in an array of tiles by its axial coordinates
 * @param {Array} tiles - Array of hex tiles with q,r properties
 * @param {Number} q - Q axial coordinate to find
 * @param {Number} r - R axial coordinate to find
 * @returns {Object|null} - The found tile or null if not found
 */
export function findHexByAxial(tiles, q, r) {
  return tiles.find(tile => tile.q === q && tile.r === r) || null;
}

/**
 * Generate the points for drawing a hexagon centered at (0,0)
 * @param {Number} size - Hex radius in pixels (distance from center to corner)
 * @returns {Array} - Array of [x,y] points for the corners of the hexagon
 */
export function getHexPoints(size) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    points.push([
      size * Math.cos(angle),
      size * Math.sin(angle)
    ]);
  }
  return points;
}

/**
 * Create a ring of hexes at a specific distance from a center hex
 * @param {Number} centerQ - Q axial coordinate of the center hex
 * @param {Number} centerR - R axial coordinate of the center hex
 * @param {Number} radius - The distance of the ring from the center
 * @returns {Array} - Array of {q, r} coordinates forming the ring
 */
export function createHexRing(centerQ, centerR, radius) {
  const results = [];
  if (radius === 0) {
    return [{q: centerQ, r: centerR}];
  }
  
  // Start at the hex directly southwest of the center and move in a clockwise direction
  let q = centerQ;
  let r = centerR + radius;
  
  // Each of the 6 sides of the ring
  for (let side = 0; side < 6; side++) {
    // For each step along the side
    for (let step = 0; step < radius; step++) {
      results.push({q, r});
      // Move to the next hex along this side
      const direction = (side + 4) % 6;  // +4 to start with SW and go clockwise
      q += HEX_DIRECTIONS[direction].q;
      r += HEX_DIRECTIONS[direction].r;
    }
  }
  
  return results;
}

/**
 * Create a spiral of hexes outward from a center, useful for map generation
 * @param {Number} centerQ - Q axial coordinate of the center hex
 * @param {Number} centerR - R axial coordinate of the center hex
 * @param {Number} radius - How far the spiral should go from the center
 * @returns {Array} - Array of {q, r} coordinates in spiral order
 */
export function createHexSpiral(centerQ, centerR, radius) {
  const results = [{q: centerQ, r: centerR}];
  
  for (let ring = 1; ring <= radius; ring++) {
    results.push(...createHexRing(centerQ, centerR, ring));
  }
  
  return results;
}
