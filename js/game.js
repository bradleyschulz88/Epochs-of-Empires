import { tileSize, mapSize } from './modules/constants.js';
import { createInitialGameState } from './modules/gameState.js';
import { generateMap } from './modules/map.js';
import { render, updateResourceDisplay, updateUpkeepDisplay, updateUnitButtons, updateResearchButtons, updateBuildingButtons, updateAgeProgressDisplay, showNotification, getUnitTooltipContent } from './modules/ui.js';
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
import {
  moveUnit as moveUnitSystem,
  canMoveToTile,
  boardTransport,
  disembarkUnit,
  resetMovementPoints,
  initializeUnitMovement
} from './modules/movement.js';

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
gameState.aiDifficulty = 'normal';
  
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
    
    // Update production building selector
    updateProductionBuildingSelector(gameState);
  } else if (tabName === 'actions') {
    updateBuildingButtons(gameState, (buildingType) => startBuilding(gameState, buildingType));
    updateAgeProgressDisplay(gameState);
  } else if (tabName === 'cities') {
    // Update city list and production queues
    updateCityList(gameState);
    updateProductionQueues(gameState);
  } else if (tabName === 'diplomacy') {
    // Update trade routes list
    updateTradeRoutesList(gameState);
    
    // Update tax rate display
    const player = gameState.players[gameState.currentPlayer - 1];
    document.getElementById('taxRateDisplay').textContent = `${player.taxRate || 0}%`;
    document.getElementById('taxSlider').value = player.taxRate || 0;
  }
}

// Update production building selector in Units tab
function updateProductionBuildingSelector(gameState) {
  const player = gameState.players[gameState.currentPlayer - 1];
  const selector = document.getElementById('productionBuildingSelector');
  
  if (!selector) return;
  
  // Clear existing options
  selector.innerHTML = '';
  selector.innerHTML = '<option value="">Select a production building</option>';
  
  // Get all production buildings
  const productionBuildings = player.buildings.filter(building => {
    const buildingData = buildingTypes[building.type];
    return buildingData.category === 'production';
  });
  
  // Add options for each production building
  productionBuildings.forEach((building, index) => {
    const buildingName = building.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const unitType = buildingTypes[building.type].unitType;
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${buildingName} (${unitType} units)`;
    selector.appendChild(option);
  });
  
  // Add event listener for selection change
  selector.onchange = () => {
    const buildingIndex = selector.value;
    if (buildingIndex === '') {
      // Clear unit buttons if no building selected
      document.getElementById('unitButtons').innerHTML = '';
      return;
    }
    
    const building = productionBuildings[buildingIndex];
    const buildingData = buildingTypes[building.type];
    
    // Update unit buttons with only units that can be produced in this building
    updateUnitButtonsForBuilding(gameState, building, buildingData.unitType);
  };
}

// Update unit buttons based on selected production building
function updateUnitButtonsForBuilding(gameState, building, unitType) {
  const unitButtonsContainer = document.getElementById('unitButtons');
  unitButtonsContainer.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  // Filter units by type matching the building's production capability
  const filteredUnits = player.unlockedUnits.filter(unit => {
    const unitData = unitTypes[unit];
    return unitData && unitData.type === unitType;
  });
  
  if (filteredUnits.length === 0) {
    unitButtonsContainer.innerHTML = '<div class="empty-queue">No units available for this building type</div>';
    return;
  }
  
  // Group by age
  const unitsByAge = {};
  filteredUnits.forEach(unitName => {
    const unit = unitTypes[unitName];
    if (unit) {
      const unitAge = unit.age;
      if (!unitsByAge[unitAge]) {
        unitsByAge[unitAge] = [];
      }
      unitsByAge[unitAge].push(unitName);
    }
  });
  
  // Sort ages
  const sortedAges = Object.keys(unitsByAge).sort((a, b) => a - b);
  
  // Create unit category for each age
  sortedAges.forEach(age => {
    const ageName = gameState.ages[age];
    
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'unit-category';
    categoryDiv.innerHTML = `<h4>${ageName} Units</h4>`;
    
    unitsByAge[age].forEach(unitName => {
      const unit = unitTypes[unitName];
      const costText = formatResourceCost(unit.cost);
      
      const button = document.createElement('button');
      button.textContent = `${unitName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} (${costText})`;
      
      // Use queueUnit function instead of createUnit
      button.onclick = () => queueUnit(gameState, player.buildings.indexOf(building), unitName);
      
      // Check if player can afford it
      let canAfford = true;
      for (const resource in unit.cost) {
        if (!player.resources[resource] || player.resources[resource] < unit.cost[resource]) {
          canAfford = false;
          break;
        }
      }
      
      // Check if building queue is full
      const queueIsFull = (building.unitQueue || []).length >= (buildingTypes[building.type].queueCapacity || 3);
      button.disabled = !canAfford || queueIsFull;
      
      categoryDiv.appendChild(button);
    });
    
    unitButtonsContainer.appendChild(categoryDiv);
  });
}

// Helper function to format resource cost for UI display
function formatResourceCost(cost) {
  let costText = '';
  for (const resource in cost) {
    costText += `${cost[resource]} ${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}, `;
  }
  return costText.slice(0, -2); // Remove trailing comma and space
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
      
      // Add movement cost for terrain
      const terrainInfo = terrainTypes[tile.type];
      if (terrainInfo && terrainInfo.moveCost !== undefined) {
        tooltipContent += `<br>Movement Cost: ${terrainInfo.moveCost !== null ? terrainInfo.moveCost : 'Impassable'}`;
      }
      
      // Add resource amount if it's a resource tile
      if (tile.resourceAmount > 0) {
        tooltipContent += `<br>Amount: ${tile.resourceAmount}`;
      }
      
      // Add unit info with movement points
      if (tile.unit) {
        // Use the getUnitTooltipContent function from ui.js
        tooltipContent += `<br>${getUnitTooltipContent(tile.unit)}`;
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
  const sourceX = unit.x;
  const sourceY = unit.y;
  const targetTile = gameState.map[targetY][targetX];
  
  // Initialize unit movement properties if not already set
  if (unit.remainingMP === undefined) {
    initializeUnitMovement(unit);
  }
  
  // Check if this is an attack on an enemy building
  if (targetTile.building && targetTile.building.owner !== unit.owner) {
    // Attack building - simplified version
    attackBuilding(unit, targetTile);
    return;
  }
  
  // Check if this is an attack on an enemy unit
  if (targetTile.unit && targetTile.unit.owner !== unit.owner) {
    // Attack unit - simplified version
    attackUnit(unit, targetTile.unit);
    return;
  }
  
  // Check if this is a transport boarding action
  if (targetTile.unit && targetTile.unit.owner === unit.owner && 
      targetTile.unit.abilities && targetTile.unit.abilities.includes('transport')) {
    
    // Try to board the transport
    const success = boardTransport(unit, targetTile.unit, gameState.map, showNotification);
    if (success) {
      renderGame();
    }
    return;
  }
  
  // If unit is on a transport and trying to disembark
  if (unit.isEmbarked) {
    // Find the transport this unit is on
    let transport = null;
    for (const playerUnit of gameState.players[unit.owner - 1].units) {
      if (playerUnit.cargo && playerUnit.cargo.includes(unit)) {
        transport = playerUnit;
        break;
      }
    }
    
    if (transport) {
      const success = disembarkUnit(unit, transport, targetX, targetY, gameState.map, showNotification);
      if (success) {
        renderGame();
      }
      return;
    }
  }
  
  // Regular movement using the movement system
  const success = moveUnitSystem(unit, targetX, targetY, gameState.map, showNotification);
  
  if (success) {
    // Add movement UI update here - could be added to the UI module
    const unitMP = unit.remainingMP || 0;
    const maxMP = unitTypes[unit.type].move;
    showNotification(`${unit.type} MP: ${unitMP}/${maxMP}`);
  }
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

// Building category filter
window.filterBuildingsByCategory = () => {
  const category = document.getElementById('buildingCategoryFilter').value;
  updateBuildingButtonsByCategory(gameState, category, startBuilding);
};

// Update building buttons by category
function updateBuildingButtonsByCategory(gameState, category, startBuilding) {
  const buildingButtons = document.querySelector('.building-buttons');
  buildingButtons.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  const availableResources = resourcesByAge[player.age];
  
  for (const buildingType in buildingTypes) {
    // Skip HQ as it's placed at start
    if (buildingType === 'hq') continue;
    
    const building = buildingTypes[buildingType];
    
    // Filter by category if not "all"
    if (category !== 'all' && building.category !== category) continue;
    
    // Check if all resources for this building are available in current age
    let canBuild = true;
    for (const resource in building.cost) {
      if (!availableResources.includes(resource) && resource !== 'manpower') {
        canBuild = false;
        break;
      }
    }
    
    if (canBuild) {
      // Format cost text
      let costText = '';
      for (const resource in building.cost) {
        costText += `${building.cost[resource]} ${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}, `;
      }
      costText = costText.slice(0, -2); // Remove trailing comma
      
      // Create button
      const button = document.createElement('button');
      button.textContent = `${buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${costText})`;
      button.onclick = () => startBuilding(buildingType);
      
      // Check if player can afford it
      let canAfford = true;
      for (const resource in building.cost) {
        if (!player.resources[resource] || player.resources[resource] < building.cost[resource]) {
          canAfford = false;
          break;
        }
      }
      button.disabled = !canAfford;
      
      buildingButtons.appendChild(button);
    }
  }
}

// Tax rate adjustment
window.adjustTaxRate = (value) => {
  const player = gameState.players[gameState.currentPlayer - 1];
  player.taxRate = parseInt(value);
  document.getElementById('taxRateDisplay').textContent = `${player.taxRate}%`;
  
  // Update happiness based on tax rate
  // Each 5% tax reduces happiness by 1%
  const happinessModifier = -Math.floor(player.taxRate / 5);
  player.happiness += happinessModifier;
  
  // Update displays
  updateResourceDisplay(gameState);
};

// Create trade route
window.createTradeRoute = () => {
  const player = gameState.players[gameState.currentPlayer - 1];
  
  // Check if player has a market building
  const hasMarket = player.buildings.some(building => building.type === 'market');
  if (!hasMarket) {
    showNotification("You need a Market to establish trade routes");
    return;
  }
  
  // For demo purposes, create a simple trade route
  if (!player.tradeRoutes) player.tradeRoutes = [];
  
  // Get a random resource to trade
  const availableResources = resourcesByAge[player.age];
  const randomResource = availableResources[Math.floor(Math.random() * availableResources.length)];
  
  player.tradeRoutes.push({
    id: player.tradeRoutes.length + 1,
    resource: randomResource,
    amount: 10,
    direction: 'import',
    partner: 'AI Player',
    turns: 10
  });
  
  updateTradeRoutesList(gameState);
  showNotification(`New trade route established for ${randomResource}`);
};

// Update trade routes list
function updateTradeRoutesList(gameState) {
  const player = gameState.players[gameState.currentPlayer - 1];
  const tradeRoutesList = document.getElementById('tradeRoutesList');
  
  if (!tradeRoutesList) return;
  
  tradeRoutesList.innerHTML = '';
  
  // Check if player has trade routes
  if (!player.tradeRoutes || player.tradeRoutes.length === 0) {
    tradeRoutesList.innerHTML = '<div class="no-trade-routes">No active trade routes</div>';
    return;
  }
  
  // Display each trade route
  player.tradeRoutes.forEach(route => {
    const routeElement = document.createElement('div');
    routeElement.className = 'trade-route-item';
    
    routeElement.innerHTML = `
      <div class="route-details">
        ${route.direction === 'import' ? 'Import' : 'Export'} ${route.amount} ${route.resource}/turn
        <br>Partner: ${route.partner} (${route.turns} turns remaining)
      </div>
      <div class="delete-route" onclick="deleteTradeRoute(${route.id})">❌</div>
    `;
    
    tradeRoutesList.appendChild(routeElement);
  });
}

// Delete trade route
window.deleteTradeRoute = (routeId) => {
  const player = gameState.players[gameState.currentPlayer - 1];
  
  if (player.tradeRoutes) {
    player.tradeRoutes = player.tradeRoutes.filter(route => route.id !== routeId);
    updateTradeRoutesList(gameState);
    showNotification("Trade route cancelled");
  }
};

// Update city list
function updateCityList(gameState) {
  const player = gameState.players[gameState.currentPlayer - 1];
  const cityList = document.getElementById('cityList');
  
  if (!cityList) return;
  
  cityList.innerHTML = '';
  
  // Check if player has cities
  if (!player.cities || player.cities.length === 0) {
    cityList.innerHTML = '<div class="no-cities">No cities founded yet</div>';
    return;
  }
  
  // Display each city
  player.cities.forEach(city => {
    const cityElement = document.createElement('div');
    cityElement.className = 'city-item';
    
    // Get buildings in this city
    const cityBuildings = player.buildings.filter(building => {
      const distance = Math.sqrt(Math.pow(building.x - city.x, 2) + Math.pow(building.y - city.y, 2));
      return distance <= city.borderRadius;
    });
    
    const buildingsList = cityBuildings.map(b => b.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ');
    
    cityElement.innerHTML = `
      <div class="city-name">${city.name}</div>
      <div class="city-stats">
        <span>Population: ${Math.floor(city.population)}</span>
        <span>HP: ${city.hp}/${city.maxHP}</span>
        <span>Growth: ${city.growth > 0 ? '+' : ''}${city.growth.toFixed(1)}</span>
      </div>
      <div class="city-buildings">Buildings: ${buildingsList || 'None'}</div>
    `;
    
    cityList.appendChild(cityElement);
  });
}

// Update production queue lists
function updateProductionQueues(gameState) {
  const player = gameState.players[gameState.currentPlayer - 1];
  
  // Update building queue
  const buildingQueueList = document.getElementById('buildingQueueList');
  if (buildingQueueList) {
    buildingQueueList.innerHTML = '';
    
    if (!player.buildingQueue || player.buildingQueue.length === 0) {
      buildingQueueList.innerHTML = '<div class="empty-queue">No buildings in queue</div>';
    } else {
      player.buildingQueue.forEach((item, index) => {
        const queueItem = document.createElement('div');
        queueItem.className = 'queue-item';
        
        const buildingName = item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        queueItem.innerHTML = `
          <div>${buildingName}</div>
          <div class="progress-mini">
            <div class="progress-mini-bar" style="width: ${item.progress}%"></div>
          </div>
          <div class="cancel-btn" onclick="cancelBuilding(${index})">Cancel</div>
        `;
        
        buildingQueueList.appendChild(queueItem);
      });
    }
  }
  
  // Update unit queue
  const unitQueueList = document.getElementById('unitQueueList');
  if (unitQueueList) {
    unitQueueList.innerHTML = '';
    
    // Check if any production buildings have queued units
    let hasQueuedUnits = false;
    
    player.buildings.forEach((building, buildingIndex) => {
      if (building.unitQueue && building.unitQueue.length > 0) {
        hasQueuedUnits = true;
        
        building.unitQueue.forEach((item, itemIndex) => {
          const queueItem = document.createElement('div');
          queueItem.className = 'queue-item';
          
          const unitName = item.type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          const buildingName = building.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          queueItem.innerHTML = `
            <div>${unitName} (at ${buildingName})</div>
            <div class="progress-mini">
              <div class="progress-mini-bar" style="width: ${item.progress}%"></div>
            </div>
            <div class="cancel-btn" onclick="cancelUnit(${buildingIndex}, ${itemIndex})">Cancel</div>
          `;
          
          unitQueueList.appendChild(queueItem);
        });
      }
    });
    
    if (!hasQueuedUnits) {
      unitQueueList.innerHTML = '<div class="empty-queue">No units in queue</div>';
    }
  }
}

// Cancel building from queue
window.cancelBuilding = (index) => {
  const player = gameState.players[gameState.currentPlayer - 1];
  if (player.buildingQueue && player.buildingQueue[index]) {
    // Return 50% of resources
    const buildingType = player.buildingQueue[index].type;
    const building = buildingTypes[buildingType];
    
    for (const resource in building.cost) {
      const refundAmount = Math.floor(building.cost[resource] * 0.5);
      if (!player.resources[resource]) player.resources[resource] = 0;
      player.resources[resource] += refundAmount;
    }
    
    // Remove building in progress marker if it's the first item
    if (index === 0) {
      const x = player.buildingQueue[0].x;
      const y = player.buildingQueue[0].y;
      if (gameState.map[y][x].buildingInProgress) {
        gameState.map[y][x].buildingInProgress = null;
      }
    }
    
    // Remove from queue
    player.buildingQueue.splice(index, 1);
    
    updateProductionQueues(gameState);
    updateResourceDisplay(gameState);
    showNotification("Construction cancelled, 50% resources refunded");
  }
};

// Cancel unit from queue
window.cancelUnit = (buildingIndex, unitIndex) => {
  const player = gameState.players[gameState.currentPlayer - 1];
  if (player.buildings[buildingIndex]?.unitQueue?.[unitIndex]) {
    // Return 50% of resources
    const unitType = player.buildings[buildingIndex].unitQueue[unitIndex].type;
    const unit = unitTypes[unitType];
    
    for (const resource in unit.cost) {
      const refundAmount = Math.floor(unit.cost[resource] * 0.5);
      if (!player.resources[resource]) player.resources[resource] = 0;
      player.resources[resource] += refundAmount;
    }
    
    // Remove from queue
    player.buildings[buildingIndex].unitQueue.splice(unitIndex, 1);
    
    updateProductionQueues(gameState);
    updateResourceDisplay(gameState);
    showNotification("Production cancelled, 50% resources refunded");
  }
};
