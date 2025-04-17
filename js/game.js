import { tileSize, mapSize } from './modules/constants.js';
import { createInitialGameState } from './modules/gameState.js';
import { generateMap } from './modules/map.js';
import { render, updateResourceDisplay, updateUpkeepDisplay, updateUnitButtons, updateResearchButtons, updateBuildingButtons, updateAgeProgressDisplay, showNotification } from './modules/ui.js';
import { 
  endTurn, 
  startResearch, 
  advanceToNextAge, 
  toggleFogOfWar, 
  setAIDifficulty, 
  handleDiplomacy,
  createUnit,
  startBuilding,
  buildStructure
} from './modules/gameEvents.js';

// Game canvas and context
let canvas, ctx, minimap, minimapCtx;
let minimapTileSize;

// Game state and settings
let gameState = createInitialGameState();
let mouseX = 0, mouseY = 0;
let cameraOffsetX = 0, cameraOffsetY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let selectedUnit = null;
let fogOfWarEnabled = true;
let gameStarted = false;
let currentTab = 'actions';

// Initialize the game
window.onload = function() {
  init();
};

function init() {
  // Get canvas references
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  minimap = document.getElementById('minimap');
  minimapCtx = minimap.getContext('2d');
  minimapTileSize = minimap.width / mapSize;
  
  // Initialize game state
  gameState = generateMap(gameState);
  gameState.gameStarted = true;
  gameState.fogOfWarEnabled = fogOfWarEnabled;
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize UI
  updateResourceDisplay(gameState);
  updateUnitButtons(gameState, (unitType) => createUnit(gameState, unitType));
  updateResearchButtons(gameState, (techName) => startResearch(gameState, techName));
  updateBuildingButtons(gameState, (buildingType) => startBuilding(gameState, buildingType));
  updateUpkeepDisplay(gameState);
  updateAgeProgressDisplay(gameState);
  
  // Render initial game state
  renderGame();
  
  document.getElementById('loading').style.display = 'none';
  gameStarted = true;
}

// Set up event listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  // Canvas interactions
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  
  // Map dragging
  canvas.addEventListener('mousedown', e => {
    if (e.button === 2) { // right mouse button
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    }
  });
  
  canvas.addEventListener('mouseup', e => {
    if (e.button === 2) {
      isDragging = false;
    }
  });
  
  document.addEventListener('mousemove', e => {
    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      cameraOffsetX -= dx;
      cameraOffsetY -= dy;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      renderGame();
    }
  });
  
  // Handle mouse wheel zoom
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    // Zoom functionality could be implemented here
  });
  
  // Button event listeners
  document.getElementById('advanceAgeBtn').addEventListener('click', () => {
    advanceToNextAge(gameState);
    renderGame();
  });
  
  document.querySelector('button[onclick="endTurn()"]').addEventListener('click', () => {
    endTurn(gameState, renderGame);
  });
  
  document.querySelector('button[onclick="toggleFogOfWar()"]').addEventListener('click', () => {
    fogOfWarEnabled = toggleFogOfWar(gameState);
    renderGame();
  });
  
  document.getElementById('aiDifficulty').addEventListener('change', () => {
    const difficulty = document.getElementById('aiDifficulty').value;
    setAIDifficulty(gameState, difficulty);
  });
  
  document.getElementById('diplomacyAction').addEventListener('change', () => {
    const action = document.getElementById('diplomacyAction').value;
    if (action) {
      handleDiplomacy(gameState, action);
      document.getElementById('diplomacyAction').value = '';
    }
  });
}

// Switch between tabs
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  currentTab = tabName;
  
  // Update tab-specific content
  if (tabName === 'research') {
    updateResearchButtons(gameState, (techName) => startResearch(gameState, techName));
  } else if (tabName === 'units') {
    updateUnitButtons(gameState, (unitType) => createUnit(gameState, unitType));
  } else if (tabName === 'actions') {
    updateBuildingButtons(gameState, (buildingType) => startBuilding(gameState, buildingType));
    updateAgeProgressDisplay(gameState);
  }
}

// Handle mouse movement over the canvas
function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  
  // Get the tooltip element
  const tooltip = document.getElementById('tooltip');
  
  // Calculate grid coordinates
  const gridX = Math.floor((mouseX + cameraOffsetX) / tileSize);
  const gridY = Math.floor((mouseY + cameraOffsetY) / tileSize);
  
  // Show tooltip for tile info
  if (gridX >= 0 && gridX < mapSize && gridY >= 0 && gridY < mapSize) {
    const tile = gameState.map[gridY][gridX];
    
    if (tile.discovered[gameState.currentPlayer - 1]) {
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 10) + 'px';
      tooltip.style.top = (e.clientY + 10) + 'px';
      
      let tooltipContent = `Terrain: ${tile.type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`;
      
      // Add resource amount if it's a resource tile
      if (tile.resourceAmount > 0) {
        tooltipContent += `<br>Amount: ${tile.resourceAmount}`;
      }
      
      // Add unit info
      if (tile.unit) {
        tooltipContent += `<br>Unit: ${tile.unit.type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`;
        tooltipContent += `<br>Owner: Player ${tile.unit.owner}`;
        if (tile.unit.health) {
          tooltipContent += `<br>Health: ${tile.unit.health}%`;
        }
      }
      
      // Add building info
      if (tile.building) {
        tooltipContent += `<br>Building: ${tile.building.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        tooltipContent += `<br>Owner: Player ${tile.building.owner}`;
      }
      
      tooltip.innerHTML = tooltipContent;
    } else {
      tooltip.style.display = 'none';
    }
  } else {
    tooltip.style.display = 'none';
  }
  
  renderGame();
}

// Handle clicks on the game canvas
function handleCanvasClick(e) {
  if (!gameStarted) return;
  
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  const gridX = Math.floor((clickX + cameraOffsetX) / tileSize);
  const gridY = Math.floor((clickY + cameraOffsetY) / tileSize);
  
  // Ensure valid grid position
  if (gridX < 0 || gridX >= mapSize || gridY < 0 || gridY >= mapSize) return;
  
  const clickedTile = gameState.map[gridY][gridX];
  
  // Only interact with discovered tiles
  if (!clickedTile.discovered[gameState.currentPlayer - 1]) return;
  
  // If we're trying to build something
  if (gameState.selectedBuildingType) {
    buildStructure(gameState, gridX, gridY);
    renderGame();
    return;
  }
  
  // Select/deselect unit
  if (clickedTile.unit && clickedTile.unit.owner === gameState.currentPlayer) {
    // Select the unit
    selectedUnit = clickedTile.unit;
    gameState.selectedUnit = selectedUnit;
    showNotification(`Selected ${selectedUnit.type}`);
  } else if (selectedUnit) {
    // Move or attack with selected unit
    moveUnit(selectedUnit, gridX, gridY);
    selectedUnit = null;
    gameState.selectedUnit = null;
  }
  
  renderGame();
}

// Move a unit to a new location
function moveUnit(unit, targetX, targetY) {
  // Simple movement for now - can be expanded with path finding
  const tile = gameState.map[targetY][targetX];
  
  // Check if target is valid
  if (tile.type === 'water' && unit.type !== 'sea') {
    showNotification('Land units cannot move to water');
    return;
  }
  
  if (tile.building) {
    // Check if it's an enemy building to attack
    if (tile.building.owner !== unit.owner) {
      // Attack building - simplified version
      attackBuilding(unit, tile);
    } else {
      showNotification('Cannot move to an occupied friendly building');
    }
    return;
  }
  
  if (tile.unit) {
    // Check if it's an enemy unit to attack
    if (tile.unit.owner !== unit.owner) {
      // Attack unit - simplified version
      attackUnit(unit, tile.unit);
    } else {
      showNotification('Cannot move to a tile with a friendly unit');
    }
    return;
  }
  
  // Move the unit
  const sourceX = unit.x;
  const sourceY = unit.y;
  
  // Remove from old position
  gameState.map[sourceY][sourceX].unit = null;
  
  // Add to new position
  unit.x = targetX;
  unit.y = targetY;
  tile.unit = unit;
  
  showNotification(`Moved ${unit.type} to (${targetX}, ${targetY})`);
}

// Attack an enemy unit - simplified combat
function attackUnit(attacker, defender) {
  // Simple damage formula - could be expanded
  const damage = 25; // Fixed damage for now
  
  // Apply damage
  if (!defender.health) defender.health = 100;
  defender.health -= damage;
  
  showNotification(`${attacker.type} attacked ${defender.type} for ${damage} damage`);
  
  // Check if defender is defeated
  if (defender.health <= 0) {
    // Remove the defeated unit
    const x = defender.x;
    const y = defender.y;
    gameState.map[y][x].unit = null;
    
    // Remove from player's units
    const player = gameState.players[defender.owner - 1];
    player.units = player.units.filter(u => !(u.x === x && u.y === y));
    
    showNotification(`${defender.type} was defeated`);
  }
}

// Attack an enemy building - simplified
function attackBuilding(attacker, targetTile) {
  // For simplicity, buildings are captured in one attack
  showNotification(`${attacker.type} captured enemy ${targetTile.building.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
  
  // Update building ownership
  const buildingX = targetTile.x;
  const buildingY = targetTile.y;
  
  // Remove from previous owner
  const previousOwner = gameState.players[targetTile.building.owner - 1];
  previousOwner.buildings = previousOwner.buildings.filter(b => 
    !(b.x === buildingX && b.y === buildingY));
  
  // Add to new owner
  const newOwner = gameState.players[attacker.owner - 1];
  newOwner.buildings.push({
    type: targetTile.building.type,
    x: buildingX,
    y: buildingY
  });
  
  // Update the tile
  targetTile.building.owner = attacker.owner;
}

// Render the game - wrapper function for the render function in ui.js
function renderGame() {
  const canvasData = {
    canvas,
    ctx,
    minimap,
    minimapCtx,
    tileSize,
    minimapTileSize,
    fogOfWarEnabled,
    selectedUnit,
    mouseX,
    mouseY,
    cameraOffsetX,
    cameraOffsetY
  };
  
  render(gameState, canvasData);
}

// Expose necessary functions to window for HTML button access
window.endTurn = () => endTurn(gameState, renderGame);
window.advanceAge = () => advanceToNextAge(gameState);
window.toggleFogOfWar = () => {
  fogOfWarEnabled = toggleFogOfWar(gameState);
  renderGame();
};
window.setAIDifficulty = () => {
  const difficulty = document.getElementById('aiDifficulty').value;
  setAIDifficulty(gameState, difficulty);
};
window.handleDiplomacy = () => {
  const action = document.getElementById('diplomacyAction').value;
  if (action) {
    handleDiplomacy(gameState, action);
    document.getElementById('diplomacyAction').value = '';
  }
};
window.startBuilding = (buildingType) => {
  startBuilding(gameState, buildingType);
};
