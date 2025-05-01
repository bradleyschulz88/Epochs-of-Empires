import { resourceIcons, resourcesByAge, getSimpleResourcesByAge } from './resources.js';
import { terrainTypes } from './terrain.js';
import { unitTypes } from './units.js';
import { technologies } from './technologies.js';
import { buildingTypes } from './buildings.js';
import { revealArea } from './map.js';

// Constants for tile drawing
const TILE_SIZE = 50; // Increased from 40 to 50px as requested
const TILE_GUTTER = 3; // Added 3px gutter between tiles
const HIGHLIGHT_BORDER_WIDTH = 3; // For tile highlighting
const ICON_SIZE = 32; // Standardized icon size

// Rendering metrics
let renderedFrameCount = 0;
let lastFpsUpdateTime = 0;
let fps = 0;

// Calculate optimal map size based on screen dimensions
export function calculateOptimalMapSize(canvas) {
  const horizontalTiles = Math.floor(canvas.width / TILE_SIZE) - 2;
  const verticalTiles = Math.floor(canvas.height / TILE_SIZE) - 2;
  return Math.min(horizontalTiles, verticalTiles);
}

// Get recommended map size based on screen resolution
export function getRecommendedMapSize() {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  const estimatedCanvasWidth = screenWidth * 0.8;
  const estimatedCanvasHeight = screenHeight * 0.7;
  
  const horizontalTiles = Math.floor(estimatedCanvasWidth / TILE_SIZE) - 2;
  const verticalTiles = Math.floor(estimatedCanvasHeight / TILE_SIZE) - 2;
  
  const optimalSize = Math.min(horizontalTiles, verticalTiles);
  
  if (optimalSize <= 10) return 10;
  if (optimalSize <= 15) return 15;
  if (optimalSize <= 20) return 20;
  if (optimalSize <= 30) return 30;
  if (optimalSize <= 40) return 40;
  return 50;
}

// Coordinate conversion
export function gridToPixel(x, y) {
  // Account for gutter in positioning
  return { x: x * (TILE_SIZE + TILE_GUTTER), y: y * (TILE_SIZE + TILE_GUTTER) };
}

export function pixelToGrid(pixelX, pixelY) {
  // Account for gutter in conversion
  return { 
    x: Math.floor(pixelX / (TILE_SIZE + TILE_GUTTER)), 
    y: Math.floor(pixelY / (TILE_SIZE + TILE_GUTTER)) 
  };
}

// Show map size recommendation
export function showMapSizeRecommendation() {
  const recommendedSize = getRecommendedMapSize();
  showNotification(`Recommended map size for your screen: ${recommendedSize}x${recommendedSize}`, 'info');
  return recommendedSize;
}

// Empty compatibility function (no hex grid anymore)
export function clearHexPathCache() {}

// Water pattern for water tiles
function createWaterPattern(ctx) {
  const patternCanvas = document.createElement('canvas');
  const patternContext = patternCanvas.getContext('2d');
  
  patternCanvas.width = 20;
  patternCanvas.height = 20;
  
  patternContext.fillStyle = '#4169E1';
  patternContext.fillRect(0, 0, 20, 20);
  
  patternContext.strokeStyle = '#5e7ce1';
  patternContext.lineWidth = 1;
  
  patternContext.beginPath();
  for (let y = 0; y < 20; y += 5) {
    patternContext.moveTo(0, y);
    for (let x = 0; x < 20; x += 5) {
      patternContext.quadraticCurveTo(x + 2.5, y + 2, x + 5, y);
    }
  }
  patternContext.stroke();
  
  return ctx.createPattern(patternCanvas, 'repeat');
}

// Resource display
export function updateResourceDisplay(gameState) {
  if (!gameState || !gameState.players) return;
  
  const container = document.getElementById('resourceContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  const currentPlayer = gameState.players[gameState.currentPlayer - 1];
  const availableResources = getSimpleResourcesByAge(currentPlayer.age);
  
  for (const resourceType in resourceIcons) {
    const isAvailable = availableResources.includes(resourceType);
    const amount = currentPlayer.resources[resourceType] || 0;
    
    const resourceElement = document.createElement('div');
    resourceElement.className = `resource ${isAvailable ? '' : 'hidden-resource'}`;
    resourceElement.id = `resource-${resourceType}`;
    
    resourceElement.innerHTML = `
      <div class="resource-icon">${resourceIcons[resourceType]}</div>
      <div><span id="${resourceType}">${amount}</span></div>
      <div>${resourceType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
    `;
    
    resourceElement.title = resourceType;
    
    if (isAvailable) {
      resourceElement.style.cursor = 'pointer';
      resourceElement.addEventListener('click', () => {
        updateBuildingButtons(gameState);
      });
    }
    
    container.appendChild(resourceElement);
  }
  
  updatePopulationDisplay(gameState);
}

// Population display
export function updatePopulationDisplay(gameState) {
  if (!gameState || !gameState.players) return;
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  const popCount = document.getElementById('populationCount');
  const popCap = document.getElementById('populationCap');
  
  if (popCount) popCount.textContent = Math.floor(player.totalPopulation || 0);
  if (popCap) popCap.textContent = player.populationCap || 0;
  
  const popContainer = document.querySelector('.population-container');
  if (popContainer) {
    if (player.totalPopulation >= player.populationCap) {
      popContainer.classList.add('overpopulated');
    } else {
      popContainer.classList.remove('overpopulated');
    }
  }
}

// Building menu
export function updateBuildingButtons(gameState, startBuilding) {
  const buildingButtons = document.querySelector('.building-buttons');
  if (!buildingButtons) return;

  buildingButtons.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  for (const [buildingType, building] of Object.entries(buildingTypes)) {
    // Skip buildings from future ages
    if (building.age && gameState.ages.indexOf(building.age) > gameState.ages.indexOf(player.age)) {
      continue;
    }
    
    // Format cost text
    let costText = '';
    for (const resource in building.cost) {
      costText += `${building.cost[resource]} ${resource}, `;
    }
    costText = costText.slice(0, -2);
    
    // Create button
    const button = document.createElement('button');
    button.textContent = `${buildingType.replace(/_/g, ' ')} (${costText})`;
    
    // Set onClick handler
    button.onclick = () => {
      if (typeof startBuilding === 'function') {
        startBuilding(buildingType);
      } else if (window.startBuilding) {
        window.startBuilding(buildingType);
      }
    };
    
    // Check if player can afford it
    let canAfford = true;
    for (const resource in building.cost) {
      if ((player.resources[resource] || 0) < building.cost[resource]) {
        canAfford = false;
        break;
      }
    }
    
    button.disabled = !canAfford;
    buildingButtons.appendChild(button);
  }
}

// Research buttons
export function updateResearchButtons(gameState, startResearch) {
  const researchButtons = document.getElementById('researchButtons');
  if (!researchButtons) return;
  
  researchButtons.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  const ageTechnologies = technologies[player.age];
  
  if (!ageTechnologies) return;
  
  for (const techName in ageTechnologies) {
    const tech = ageTechnologies[techName];
    
    // Skip if already researched
    if (player.technologies && player.technologies.includes(techName)) continue;
    
    // Create button
    const button = document.createElement('button');
    button.textContent = `${techName} (${tech.cost} Tech Points)`;
    button.onclick = () => startResearch(techName);
    
    // If researching, show progress
    if (player.currentResearch === techName) {
      button.textContent += ` - Researching (${Math.floor(player.researchProgress)}%)`;
      button.disabled = true;
    }
    
    researchButtons.appendChild(button);
  }
}

// Unit buttons
export function updateUnitButtons(gameState, createUnit) {
  const unitButtonsContainer = document.getElementById('unitButtons');
  if (!unitButtonsContainer) return;
  
  unitButtonsContainer.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  if (!player.unlockedUnits) return;
  
  player.unlockedUnits.forEach(unitType => {
    const unit = unitTypes[unitType];
    if (!unit) return;
    
    const button = document.createElement('button');
    button.textContent = unitType;
    button.onclick = () => createUnit(unitType);
    
    unitButtonsContainer.appendChild(button);
  });
}

// Update upkeep
export function updateUpkeepDisplay(gameState) {
  const upkeepList = document.getElementById('upkeepList');
  if (!upkeepList) return;
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  if (!player.upkeep) {
    upkeepList.innerHTML = 'None';
    return;
  }
  
  let upkeepText = '';
  let hasUpkeep = false;
  
  for (const resource in player.upkeep) {
    if (player.upkeep[resource] > 0) {
      hasUpkeep = true;
      upkeepText += `${resource}: ${player.upkeep[resource]}/turn, `;
    }
  }
  
  upkeepList.innerHTML = hasUpkeep ? upkeepText.slice(0, -2) : 'None';
}

// Age progress
export function updateAgeProgressDisplay(gameState) {
  const progressBar = document.getElementById('ageProgressBar');
  const progressLabel = document.getElementById('ageProgressLabel');
  
  if (!progressBar || !progressLabel) return;
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  progressBar.style.width = `${player.ageProgress}%`;
  progressLabel.textContent = `Age Progress: ${Math.floor(player.ageProgress)}%`;
}

// Notifications
export function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  if (!notification) return;
  
  notification.textContent = message;
  notification.className = `notification notification-${type} show`;
  
  setTimeout(() => {
    notification.className = 'notification';
  }, 3500);
}

// Unit tooltip content
export function getUnitTooltipContent(unit) {
  if (!unit) return '';
  
  let content = `Unit: ${unit.type}`;
  content += `<br>Owner: Player ${unit.owner}`;
  
  if (unit.health) {
    content += `<br>Health: ${unit.health}%`;
  }
  
  return content;
}

// Loading Manager
export class LoadingManager {
  constructor() {
    this.overlay = document.getElementById('loading');
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'loading';
      document.body.appendChild(this.overlay);
    }
    this.overlay.style.display = 'none';
  }
  
  show() {
    this.overlay.style.display = 'block';
  }
  
  hide() {
    this.overlay.style.display = 'none';
  }
  
  updateProgress(progress, message = '') {
    this.overlay.textContent = message || 'Loading...';
  }
}

// Drawing functions
function drawTerrainFeatures(tile, ctx, x, y) {
  switch(tile.type) {
    case 'forest':
      for (let i = 0; i < 3; i++) {
        const offsetX = (i - 1) * (TILE_SIZE / 4);
        const offsetY = (i % 2 === 0 ? -1 : 1) * (TILE_SIZE / 8);
        
        ctx.fillStyle = '#1a5f1a';
        ctx.beginPath();
        ctx.moveTo(x + offsetX, y + offsetY - 10);
        ctx.lineTo(x + offsetX - 5, y + offsetY + 5);
        ctx.lineTo(x + offsetX + 5, y + offsetY + 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + offsetX - 2, y + offsetY + 5, 4, 5);
      }
      break;
    case 'mountain':
      ctx.fillStyle = '#aaaaaa';
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x - 10, y + 5);
      ctx.lineTo(x + 10, y + 5);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x - 4, y - 6);
      ctx.lineTo(x + 4, y - 6);
      ctx.closePath();
      ctx.fill();
      break;
    case 'hills':
      ctx.fillStyle = '#b97a57';
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 5);
      ctx.quadraticCurveTo(x - 5, y - 8, x, y);
      ctx.quadraticCurveTo(x + 5, y - 8, x + 10, y + 5);
      ctx.closePath();
      ctx.fill();
      break;
    case 'desert':
      ctx.strokeStyle = '#d2b773';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 5);
      ctx.quadraticCurveTo(x - 5, y - 10, x, y - 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 5);
      ctx.quadraticCurveTo(x, y, x + 8, y + 5);
      ctx.stroke();
      break;
  }
}

function drawBuilding(building, ctx, x, y) {
  const size = TILE_SIZE * 0.7;
  
  // Add null check for building
  if (!building || typeof building !== 'object') {
    console.error("Invalid building object:", building);
    return;
  }
  
  let color = '#f55';
  const buildingType = building.type || 'unknown';
  
  switch(buildingType) {
    case 'farm': color = '#8fc31f'; break;
    case 'mine': case 'iron_mine': case 'gold_mine': color = '#7f7f7f'; break;
    case 'logging_camp': color = '#8d6e63'; break;
    case 'house': case 'cabin': color = '#9c6644'; break;
    case 'barracks': color = '#f44336'; break;
    case 'market': color = '#9c27b0'; break;
    case 'city': case 'capital': color = '#ffeb3b'; break;
  }
  
  ctx.fillStyle = color;
  ctx.fillRect(x - size/2, y - size/2, size, size);
  
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - size/2, y - size/2, size, size);
  
  ctx.fillStyle = '#fff';
  ctx.font = '8px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Safe access to building type
  const displayText = buildingType.substring(0, 3).toUpperCase();
  ctx.fillText(displayText, x, y);
}

function drawBuildingInProgress(building, ctx, x, y) {
  // Add null check for building
  if (!building || typeof building !== 'object') {
    console.error("Invalid building in progress:", building);
    return;
  }
  
  const size = TILE_SIZE * 0.6;
  const buildingType = building.type || 'unknown';
  
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#555';
  ctx.strokeRect(x - size/2, y - size/2, size, size);
  ctx.setLineDash([]);
  
  const progress = building.progress || 0;
  const barWidth = size * 0.8;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(x - barWidth/2, y + 8, barWidth, 3);
  
  ctx.fillStyle = '#3498db';
  ctx.fillRect(x - barWidth/2, y + 8, barWidth * (progress / 100), 3);
  
  ctx.fillStyle = '#fff';
  ctx.font = '8px Arial';
  
  // Safe access to building type
  const displayText = buildingType.substring(0, 3);
  ctx.fillText(displayText, x, y);
}

function drawUnit(unit, ctx, x, y, currentPlayer) {
  // Add null check for unit
  if (!unit || typeof unit !== 'object') {
    console.error("Invalid unit object:", unit);
    return;
  }

  const unitSize = TILE_SIZE * 0.6;
  const isCurrentPlayerUnit = unit.owner === currentPlayer;
  
  const playerColors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
  const playerColor = playerColors[(unit.owner - 1) % playerColors.length];
  
  ctx.beginPath();
  ctx.arc(x, y, unitSize/2, 0, Math.PI * 2);
  ctx.fillStyle = playerColor;
  ctx.fill();
  
  ctx.strokeStyle = isCurrentPlayerUnit ? '#fff' : '#000';
  ctx.lineWidth = isCurrentPlayerUnit ? 2 : 1;
  ctx.stroke();
  
  // Safely get unit type
  const unitType = unit.type || 'unknown';
  
  let unitSymbol = unitType.charAt(0).toUpperCase();
  switch(unitType.toLowerCase()) {
    case 'warrior': unitSymbol = '⚔️'; break;
    case 'settler': unitSymbol = '🏠'; break;
    case 'archer': unitSymbol = '🏹'; break;
    case 'knight': unitSymbol = '🐎'; break;
    case 'worker': unitSymbol = '🔨'; break;
  }
  
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(unitSymbol, x, y);
  
  if (unit.health && unit.health < 100) {
    const barWidth = unitSize * 0.8;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - barWidth/2, y + unitSize/2 + 2, barWidth, 3);
    
    const healthPercent = unit.health / 100;
    const color = healthPercent > 0.6 ? '#2ecc71' : healthPercent > 0.3 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = color;
    ctx.fillRect(x - barWidth/2, y + unitSize/2 + 2, barWidth * healthPercent, 3);
  }
}

function drawTile(tile, ctx, x, y, gameState, fogOfWarEnabled, waterPattern, isHovered = false) {
  const playerIndex = gameState.currentPlayer - 1;
  
  // More robust check for discovered status
  let isDiscovered = false;
  try {
    // Check if the tile has a discovered property and if the current player has discovered it
    isDiscovered = tile.discovered && 
                  Array.isArray(tile.discovered) && 
                  tile.discovered.length > playerIndex && 
                  tile.discovered[playerIndex] === true;
  } catch (e) {
    console.error("Error checking discovered status:", e);
  }
  
  // Explicitly check fog of war condition
  if (fogOfWarEnabled === true && isDiscovered !== true) {
    // Draw fog of war with our new tile size
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    
    // Draw a subtle fog pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < TILE_SIZE; i += 10) {
      for (let j = 0; j < TILE_SIZE; j += 10) {
        if ((i + j) % 20 === 0) {
          ctx.fillRect(x + i, y + j, 5, 5);
        }
      }
    }
    return;
  }
  
  // Fill tile background
  const terrainInfo = terrainTypes[tile.type] || terrainTypes.plains;
  ctx.fillStyle = tile.type === 'water' ? waterPattern : terrainInfo.color;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  
  // Apply normal border
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
  
  // Apply highlight border if hovered
  if (isHovered) {
    // Determine highlight color based on resource
    let highlightColor = '#ffffff'; // Default white glow
    
    if (tile.resourceType) {
      // Resource-specific colors
      switch(tile.resourceType) {
        case 'food': highlightColor = '#4CAF50'; break; // Green for food
        case 'wood': highlightColor = '#4CAF50'; break; // Green for wood
        case 'stone': highlightColor = '#9E9E9E'; break; // Gray for stone
        case 'iron': highlightColor = '#78909C'; break; // Blue-gray for iron
        case 'gold': highlightColor = '#FFC107'; break; // Amber for gold
        case 'fish': highlightColor = '#2196F3'; break; // Blue for fish/water
      }
    }
    
    // Draw glow effect
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = HIGHLIGHT_BORDER_WIDTH;
    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
  }
  
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;
  
  drawTerrainFeatures(tile, ctx, centerX, centerY);
  
  if (tile.resourceType && resourceIcons[tile.resourceType]) {
    ctx.beginPath();
    ctx.arc(centerX, centerY - TILE_SIZE * 0.25, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(resourceIcons[tile.resourceType], centerX, centerY - TILE_SIZE * 0.25);
  }
  
  if (tile.building) {
    drawBuilding(tile.building, ctx, centerX, centerY);
  } else if (tile.buildingInProgress) {
    drawBuildingInProgress(tile.buildingInProgress, ctx, centerX, centerY);
  }
  
  if (tile.unit) {
    drawUnit(tile.unit, ctx, centerX, centerY, gameState.currentPlayer);
  }
}

function drawMinimapTile(tile, minimapCtx, tileSize, gameState, fogOfWarEnabled) {
  const playerIndex = gameState.currentPlayer - 1;
  
  // More robust check for discovered status (matches main tile rendering)
  let isDiscovered = false;
  try {
    isDiscovered = tile.discovered && 
                  Array.isArray(tile.discovered) && 
                  tile.discovered.length > playerIndex && 
                  tile.discovered[playerIndex] === true;
  } catch (e) {
    console.error("Error checking discovered status for minimap:", e);
  }
  
  // Explicitly check fog of war condition
  if (fogOfWarEnabled === true && isDiscovered !== true) {
    minimapCtx.fillStyle = '#333';
  } else {
    const terrainInfo = terrainTypes[tile.type] || terrainTypes.plains;
    minimapCtx.fillStyle = terrainInfo.color;
  }
  
  minimapCtx.fillRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize);
  
  if (tile.unit && (!fogOfWarEnabled || isDiscovered)) {
    const playerColors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    minimapCtx.fillStyle = playerColors[(tile.unit.owner - 1) % playerColors.length];
    minimapCtx.fillRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize);
  }
}

function drawMinimapViewport(minimap, minimapCtx, canvas, cameraX, cameraY, tileSize) {
  minimapCtx.strokeStyle = '#fff';
  minimapCtx.lineWidth = 1;
  
  const viewX = cameraX / TILE_SIZE * tileSize;
  const viewY = cameraY / TILE_SIZE * tileSize;
  const viewW = canvas.width / TILE_SIZE * tileSize;
  const viewH = canvas.height / TILE_SIZE * tileSize;
  
  minimapCtx.strokeRect(viewX, viewY, viewW, viewH);
}

function drawSelectedUnit(selectedUnit, ctx, offsetX, offsetY) {
  // Add null check for selectedUnit and its properties
  if (!selectedUnit || typeof selectedUnit !== 'object' || 
      typeof selectedUnit.x !== 'number' || typeof selectedUnit.y !== 'number') {
    console.error("Invalid selected unit:", selectedUnit);
    return;
  }
  
  const tileX = selectedUnit.x * TILE_SIZE - offsetX;
  const tileY = selectedUnit.y * TILE_SIZE - offsetY;
  
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 2;
  
  const pulse = Math.sin(performance.now() / 200) * 3 + 1;
  ctx.strokeRect(
    tileX - pulse, 
    tileY - pulse, 
    TILE_SIZE + pulse * 2, 
    TILE_SIZE + pulse * 2
  );
}

function drawMovementRange(validMovementLocations, ctx, offsetX, offsetY) {
  ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
  
  for (const loc of validMovementLocations) {
    const tileX = loc.x * TILE_SIZE - offsetX;
    const tileY = loc.y * TILE_SIZE - offsetY;
    
    if (tileX < -TILE_SIZE || tileX > ctx.canvas.width + TILE_SIZE ||
        tileY < -TILE_SIZE || tileY > ctx.canvas.height + TILE_SIZE) {
      continue;
    }
    
    ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
  }
}

// For tile click animation
let clickAnimationTile = null;
let clickAnimationStart = 0;
const CLICK_ANIMATION_DURATION = 300; // ms

// For tile hover state
let hoveredTileCoords = null;

// Trigger click animation on a tile
export function animateTileClick(tileX, tileY) {
  clickAnimationTile = { x: tileX, y: tileY };
  clickAnimationStart = performance.now();
}

// Set the currently hovered tile
export function setHoveredTile(tileX, tileY) {
  hoveredTileCoords = tileX !== null ? { x: tileX, y: tileY } : null;
}

// Main render function
export function render(gameState, canvasData) {
  if (!gameState || !gameState.map || !canvasData || !canvasData.ctx) return;
  
  const { 
    canvas, ctx, minimap, minimapCtx, 
    fogOfWarEnabled, selectedUnit, cameraOffsetX, cameraOffsetY 
  } = canvasData;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (minimapCtx) minimapCtx.clearRect(0, 0, minimap.width, minimap.height);
  
  // Calculate FPS
  renderedFrameCount++;
  const now = performance.now();
  if (now - lastFpsUpdateTime > 1000) {
    fps = Math.round((renderedFrameCount * 1000) / (now - lastFpsUpdateTime));
    lastFpsUpdateTime = now;
    renderedFrameCount = 0;
  }
  
  // Draw FPS counter
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 10, 60, 24);
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.fillText(`FPS: ${fps}`, 15, 26);
  
  const mapSize = gameState.map.length;
  const waterPattern = createWaterPattern(ctx);
  
  // Screen size warnings
  const optimalSize = calculateOptimalMapSize(canvas);
  if (mapSize > optimalSize && !gameState.sizeWarningShown) {
    showNotification(`Map size (${mapSize}x${mapSize}) may be too large for your screen. Recommended size: ${optimalSize}x${optimalSize}`, 'warning');
    gameState.sizeWarningShown = true;
  }
  
  // Center small maps
  let offsetX = cameraOffsetX;
  let offsetY = cameraOffsetY;
  
  if (mapSize * TILE_SIZE < canvas.width) {
    offsetX = -(canvas.width - mapSize * TILE_SIZE) / 2;
  }
  
  if (mapSize * TILE_SIZE < canvas.height) {
    offsetY = -(canvas.height - mapSize * TILE_SIZE) / 2;
  }
  
  // Minimap tile size calculation
  const minimapTileSize = minimap ? Math.max(1, minimap.width / mapSize) : 1;
  
  // Draw all tiles
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = gameState.map[y][x];
      if (!tile) continue;
      
      // Set coordinates
      tile.x = x;
      tile.y = y;
      
      // Calculate screen position
      const screenX = x * TILE_SIZE - offsetX;
      const screenY = y * TILE_SIZE - offsetY;
      
      // Skip off-screen tiles
      if (screenX < -TILE_SIZE || screenX > canvas.width ||
          screenY < -TILE_SIZE || screenY > canvas.height) {
        // Still render on minimap
        if (minimapCtx) {
          drawMinimapTile(tile, minimapCtx, minimapTileSize, gameState, fogOfWarEnabled);
        }
        continue;
      }
      
      // Check if this tile is being hovered
      const isHovered = hoveredTileCoords && 
                       hoveredTileCoords.x === x && 
                       hoveredTileCoords.y === y;
      
      // Draw tile on main canvas with hover state
      drawTile(tile, ctx, screenX, screenY, gameState, fogOfWarEnabled, waterPattern, isHovered);
      
      // Draw click animation if active
      if (clickAnimationTile && 
          clickAnimationTile.x === x && 
          clickAnimationTile.y === y) {
        
        const elapsed = now - clickAnimationStart;
        if (elapsed < CLICK_ANIMATION_DURATION) {
          // Draw pulse animation
          const progress = elapsed / CLICK_ANIMATION_DURATION;
          const scale = 1 + progress * 0.2; // Grow to 120% of original size
          const alpha = 1 - progress; // Fade out
          
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
          ctx.scale(scale, scale);
          ctx.translate(-(screenX + TILE_SIZE / 2), -(screenY + TILE_SIZE / 2));
          
          // Draw a light flash effect
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
          
          ctx.restore();
        } else {
          // Animation completed
          clickAnimationTile = null;
        }
      }
      
      // Draw on minimap
      if (minimapCtx) {
        drawMinimapTile(tile, minimapCtx, minimapTileSize, gameState, fogOfWarEnabled);
      }
    }
  }
  
  // Draw movement range
  if (gameState.unitActionMode === 'move' && gameState.validMovementLocations && selectedUnit) {
    drawMovementRange(gameState.validMovementLocations, ctx, offsetX, offsetY);
  }
  
  // Draw selection highlight
  if (selectedUnit) {
    drawSelectedUnit(selectedUnit, ctx, offsetX, offsetY);
  }
  
  // Draw minimap viewport
  if (minimapCtx && minimap) {
    drawMinimapViewport(minimap, minimapCtx, canvas, offsetX, offsetY, minimapTileSize);
  }
}
