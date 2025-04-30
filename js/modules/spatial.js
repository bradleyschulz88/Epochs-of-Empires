// Spatial partitioning system for efficient large map handling
export class SpatialPartition {
  constructor(mapSize, partitionSize = 16) {
    this.mapSize = mapSize;
    this.partitionSize = partitionSize;
    this.partitions = new Map();
    this.initializePartitions();
  }
  
  // Initialize partition grid
  initializePartitions() {
    const numPartitions = Math.ceil(this.mapSize / this.partitionSize);
    for (let y = 0; y < numPartitions; y++) {
      for (let x = 0; x < numPartitions; x++) {
        this.partitions.set(`${x},${y}`, new Set());
      }
    }
  }
  
  // Get partition key for a position
  getPartitionKey(x, y) {
    const px = Math.floor(x / this.partitionSize);
    const py = Math.floor(y / this.partitionSize);
    return `${px},${py}`;
  }
  
  // Add entity to appropriate partition
  addEntity(entity) {
    const key = this.getPartitionKey(entity.x, entity.y);
    const partition = this.partitions.get(key);
    if (partition) {
      partition.add(entity);
    }
  }
  
  // Remove entity from its partition
  removeEntity(entity) {
    const key = this.getPartitionKey(entity.x, entity.y);
    const partition = this.partitions.get(key);
    if (partition) {
      partition.delete(entity);
    }
  }
  
  // Update entity position
  updateEntity(entity, oldX, oldY) {
    const oldKey = this.getPartitionKey(oldX, oldY);
    const newKey = this.getPartitionKey(entity.x, entity.y);
    
    if (oldKey !== newKey) {
      const oldPartition = this.partitions.get(oldKey);
      const newPartition = this.partitions.get(newKey);
      
      if (oldPartition) oldPartition.delete(entity);
      if (newPartition) newPartition.add(entity);
    }
  }
  
  // Get all entities in a region
  getEntitiesInRegion(x1, y1, x2, y2) {
    const entities = new Set();
    
    // Get partition range
    const startX = Math.floor(Math.min(x1, x2) / this.partitionSize);
    const endX = Math.floor(Math.max(x1, x2) / this.partitionSize);
    const startY = Math.floor(Math.min(y1, y2) / this.partitionSize);
    const endY = Math.floor(Math.max(y1, y2) / this.partitionSize);
    
    // Check each partition in range
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const partition = this.partitions.get(`${x},${y}`);
        if (partition) {
          for (const entity of partition) {
            if (entity.x >= x1 && entity.x <= x2 && 
                entity.y >= y1 && entity.y <= y2) {
              entities.add(entity);
            }
          }
        }
      }
    }
    
    return entities;
  }
  
  // Get entities near a point within radius
  getEntitiesNearPoint(x, y, radius) {
    // Convert radius to bounding box
    return this.getEntitiesInRegion(
      x - radius,
      y - radius,
      x + radius,
      y + radius
    );
  }
  
  // Get all entities in a specific partition
  getPartitionEntities(x, y) {
    const key = this.getPartitionKey(x, y);
    return this.partitions.get(key) || new Set();
  }
  
  // Clear all partitions
  clear() {
    for (const partition of this.partitions.values()) {
      partition.clear();
    }
  }
  
  // Get nearby entities of specific type
  getNearbyEntitiesOfType(x, y, radius, type) {
    const entities = this.getEntitiesNearPoint(x, y, radius);
    return new Set(
      Array.from(entities).filter(entity => entity.type === type)
    );
  }
}