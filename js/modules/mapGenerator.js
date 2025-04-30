import { terrainTypes } from './terrain.js';
import { resourceTileTypes } from './resources.js';

export class MapGenerator {
    constructor(gameState) {
        this.gameState = gameState;
        this.noiseScale = 0.1;
        this.elevationScale = 0.05;
        this.temperatureScale = 0.03;
        this.moistureScale = 0.04;
    }

    /**
     * Generate a new game map
     */
    generateMap(width, height, seed) {
        // Initialize map array
        const map = Array(height).fill().map(() => Array(width).fill(null));
        
        // Initialize noise generators with seed
        const noise = this.initializeNoise(seed);
        
        // Generate base terrain
        this.generateBaseTerrain(map, noise);
        
        // Add elevation
        this.generateElevation(map, noise);
        
        // Generate climate
        this.generateClimate(map, noise);
        
        // Add resources
        this.distributeResources(map, noise);
        
        // Add special features
        this.addSpecialFeatures(map, noise);
        
        // Initialize fog of war
        this.initializeFogOfWar(map);
        
        return map;
    }

    /**
     * Initialize Perlin noise generators
     */
    initializeNoise(seed) {
        // Placeholder for noise initialization
        // In practice, you would use a noise library like simplex-noise
        return {
            terrain: this.createNoiseGenerator(seed),
            elevation: this.createNoiseGenerator(seed + 1),
            temperature: this.createNoiseGenerator(seed + 2),
            moisture: this.createNoiseGenerator(seed + 3)
        };
    }

    /**
     * Create a noise generator with given seed
     */
    createNoiseGenerator(seed) {
        // Placeholder for noise generator creation
        return (x, y) => {
            // Simple pseudo-random noise function
            const dot = x * 12.9898 + y * 78.233;
            const sin = Math.sin(dot) * 43758.5453123;
            return (sin - Math.floor(sin)) * 2 - 1;
        };
    }

    /**
     * Generate base terrain types
     */
    generateBaseTerrain(map, noise) {
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                const value = this.sampleNoise(noise.terrain, x, y, this.noiseScale);
                map[y][x] = {
                    type: this.getTerrainType(value),
                    elevation: 0,
                    temperature: 0,
                    moisture: 0
                };
            }
        }
    }

    /**
     * Sample noise at given coordinates
     */
    sampleNoise(noiseFunc, x, y, scale) {
        return noiseFunc(x * scale, y * scale);
    }

    /**
     * Determine terrain type from noise value
     */
    getTerrainType(value) {
        if (value < -0.5) return 'water';
        if (value < -0.2) return 'coast';
        if (value < 0.2) return 'plains';
        if (value < 0.5) return 'hills';
        return 'mountains';
    }

    /**
     * Generate elevation values
     */
    generateElevation(map, noise) {
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                const value = this.sampleNoise(noise.elevation, x, y, this.elevationScale);
                map[y][x].elevation = Math.floor((value + 1) * 5); // 0-10 elevation
                
                // Adjust terrain based on elevation
                this.adjustTerrainForElevation(map[y][x]);
            }
        }
    }

    /**
     * Adjust terrain type based on elevation
     */
    adjustTerrainForElevation(tile) {
        if (tile.elevation > 8) {
            tile.type = 'mountains';
        } else if (tile.elevation > 6) {
            tile.type = 'hills';
        } else if (tile.elevation < 1 && tile.type !== 'water') {
            tile.type = 'coast';
        }
    }

    /**
     * Generate climate (temperature and moisture)
     */
    generateClimate(map, noise) {
        const height = map.length;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < map[0].length; x++) {
                // Base temperature on latitude (y position) and elevation
                const latitudeTemp = 1 - Math.abs((y - height / 2) / (height / 2));
                const elevationTemp = 1 - map[y][x].elevation / 10;
                const noiseTemp = this.sampleNoise(noise.temperature, x, y, this.temperatureScale);
                
                map[y][x].temperature = Math.floor(
                    ((latitudeTemp * 0.5 + elevationTemp * 0.3 + noiseTemp * 0.2) + 1) * 5
                );
                
                // Generate moisture
                map[y][x].moisture = Math.floor(
                    (this.sampleNoise(noise.moisture, x, y, this.moistureScale) + 1) * 5
                );
                
                // Adjust terrain based on climate
                this.adjustTerrainForClimate(map[y][x]);
            }
        }
    }

    /**
     * Adjust terrain based on climate conditions
     */
    adjustTerrainForClimate(tile) {
        if (tile.type === 'plains') {
            if (tile.moisture > 7) {
                tile.type = 'marsh';
            } else if (tile.temperature > 7) {
                tile.type = 'desert';
            } else if (tile.temperature < 3) {
                tile.type = 'tundra';
            }
        }
    }

    /**
     * Distribute resources across the map
     */
    distributeResources(map, noise) {
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                const tile = map[y][x];
                const resourceValue = this.sampleNoise(
                    noise.terrain, 
                    x + 1000, 
                    y + 1000, 
                    this.noiseScale * 2
                );
                
                // Assign resources based on terrain and random chance
                tile.resource = this.selectResource(tile, resourceValue);
            }
        }
    }

    /**
     * Select appropriate resource for a tile
     */
    selectResource(tile, randomValue) {
        const terrain = terrainTypes[tile.type];
        if (!terrain.possibleResources) return null;
        
        // Filter possible resources based on climate
        const validResources = terrain.possibleResources.filter(resource => {
            const resourceInfo = resourceTileTypes[resource];
            if (!resourceInfo.requirements) return true;
            
            return this.meetsRequirements(tile, resourceInfo.requirements);
        });
        
        if (validResources.length === 0) return null;
        
        // Use random value to select resource
        const index = Math.floor((randomValue + 1) * validResources.length / 2);
        return validResources[index] || null;
    }

    /**
     * Check if tile meets resource requirements
     */
    meetsRequirements(tile, requirements) {
        if (requirements.minElevation && tile.elevation < requirements.minElevation) {
            return false;
        }
        if (requirements.maxElevation && tile.elevation > requirements.maxElevation) {
            return false;
        }
        if (requirements.minTemperature && tile.temperature < requirements.minTemperature) {
            return false;
        }
        if (requirements.maxTemperature && tile.temperature > requirements.maxTemperature) {
            return false;
        }
        if (requirements.minMoisture && tile.moisture < requirements.minMoisture) {
            return false;
        }
        if (requirements.maxMoisture && tile.moisture > requirements.maxMoisture) {
            return false;
        }
        return true;
    }

    /**
     * Add special map features
     */
    addSpecialFeatures(map, noise) {
        this.addRivers(map, noise);
        this.addVolcanoes(map, noise);
        this.addRuins(map, noise);
    }

    /**
     * Generate river systems
     */
    addRivers(map, noise) {
        // Find high elevation points for river sources
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                if (map[y][x].elevation > 7 && Math.random() < 0.1) {
                    this.generateRiver(map, x, y);
                }
            }
        }
    }

    /**
     * Generate a river from source point
     */
    generateRiver(map, startX, startY) {
        let x = startX;
        let y = startY;
        let currentElevation = map[y][x].elevation;
        
        while (currentElevation > 0) {
            // Mark tile as river
            map[y][x].river = true;
            
            // Find lowest neighbor
            const [nextX, nextY] = this.findLowestNeighbor(map, x, y);
            
            if (nextX === x && nextY === y) break;
            
            x = nextX;
            y = nextY;
            currentElevation = map[y][x].elevation;
        }
    }

    /**
     * Find lowest elevation neighboring tile
     */
    findLowestNeighbor(map, x, y) {
        let lowestX = x;
        let lowestY = y;
        let lowestElevation = map[y][x].elevation;
        
        const neighbors = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];
        
        for (const [dx, dy] of neighbors) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (this.isValidPosition(map, newX, newY)) {
                const elevation = map[newY][newX].elevation;
                if (elevation < lowestElevation) {
                    lowestX = newX;
                    lowestY = newY;
                    lowestElevation = elevation;
                }
            }
        }
        
        return [lowestX, lowestY];
    }

    /**
     * Add volcanic regions
     */
    addVolcanoes(map, noise) {
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                if (map[y][x].type === 'mountains' && 
                    this.sampleNoise(noise.terrain, x + 2000, y + 2000, 0.2) > 0.8) {
                    this.createVolcano(map, x, y);
                }
            }
        }
    }

    /**
     * Create a volcanic region
     */
    createVolcano(map, x, y) {
        map[y][x].type = 'volcano';
        map[y][x].elevation += 2;
        
        // Add surrounding volcanic features
        const radius = 2;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const newX = x + dx;
                const newY = y + dy;
                
                if (this.isValidPosition(map, newX, newY)) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= radius) {
                        map[newY][newX].volcanic = true;
                        if (Math.random() < 0.3) {
                            map[newY][newX].resource = 'obsidian';
                        }
                    }
                }
            }
        }
    }

    /**
     * Add ancient ruins
     */
    addRuins(map, noise) {
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                if (map[y][x].type !== 'water' && 
                    this.sampleNoise(noise.terrain, x + 3000, y + 3000, 0.2) > 0.9) {
                    map[y][x].ruins = {
                        type: this.selectRuinType(),
                        discovered: false
                    };
                }
            }
        }
    }

    /**
     * Select type of ruins
     */
    selectRuinType() {
        const types = ['temple', 'city', 'fortress', 'tomb'];
        return types[Math.floor(Math.random() * types.length)];
    }

    /**
     * Initialize fog of war for all players
     */
    initializeFogOfWar(map) {
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                map[y][x].discovered = Array(this.gameState.players.length).fill(false);
                map[y][x].visible = Array(this.gameState.players.length).fill(false);
            }
        }
    }

    /**
     * Check if position is within map bounds
     */
    isValidPosition(map, x, y) {
        return x >= 0 && x < map[0].length && y >= 0 && y < map.length;
    }

    /**
     * Get starting positions for players
     */
    getStartingPositions(map, playerCount) {
        const positions = [];
        const minDistance = Math.floor(Math.sqrt(map.length * map[0].length) / 3);
        
        // Find suitable starting locations
        for (let attempts = 0; attempts < 1000 && positions.length < playerCount; attempts++) {
            const x = Math.floor(Math.random() * map[0].length);
            const y = Math.floor(Math.random() * map.length);
            
            if (this.isValidStartingLocation(map, x, y) && 
                this.isFarEnoughFromOthers(positions, x, y, minDistance)) {
                positions.push({x, y});
            }
        }
        
        return positions;
    }

    /**
     * Check if location is valid for starting position
     */
    isValidStartingLocation(map, x, y) {
        const tile = map[y][x];
        return tile.type === 'plains' && 
               tile.elevation >= 1 && 
               tile.elevation <= 4 && 
               !tile.river && 
               !tile.ruins;
    }

    /**
     * Check if position is far enough from other positions
     */
    isFarEnoughFromOthers(positions, x, y, minDistance) {
        return positions.every(pos => {
            const dx = pos.x - x;
            const dy = pos.y - y;
            return Math.sqrt(dx * dx + dy * dy) >= minDistance;
        });
    }
}
