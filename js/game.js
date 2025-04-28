import { tileSize } from './modules/constants.js';
import { initStartMenu, startNewGame, showSettingsMenu } from './modules/startMenu.js';
import { createInitialGameState } from './modules/gameState.js';
import { generateMap } from './modules/map.js';
import { render, updateResourceDisplay, updateUpkeepDisplay, updateUnitButtons, updateResearchButtons, updateBuildingButtons, updateAgeProgressDisplay, showNotification, getUnitTooltipContent } from './modules/ui.js';
import { terrainTypes } from './modules/terrain.js';
import { buildingTypes } from './modules/buildings.js';
import { unitTypes } from './modules/units.js';
import { resourcesByAge } from './modules/resources.js';
import { 
  endTurn, 
  startResearch, 
  advanceToNextAge, 
  toggleFogOfWar, 
  setAIDifficulty, 
  handleDiplomacy,
  createUnit,
  startBuilding,
  buildStructure,
  processProductionQueues
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
let gameStarted = false;
let currentTab = 'actions';

// Initialize the game
window.onload = function() {
  // Get canvas references
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  minimap = document.getElementById('minimap');
  minimapCtx = minimap.getContext('2d');
  
  // Store gameState in window for access from settings
  window.gameState = gameState;
  
  // Setup canvas resizing
  setupCanvasResizing();
  
  // Show the start menu
  initStartMenu(startGame);
};

// Handle canvas resizing based on window size
function setupCanvasResizing() {
  // Initial sizing
  resizeCanvas();
  
  // Add event listener for window resize
  window.addEventListener('resize', resizeCanvas);
}

// Resize canvas to fit container
function resizeCanvas() {
  const canvasContainer = document.getElementById('canvasContainer');
  if (!canvasContainer) return;
  
  const containerWidth = canvasContainer.clientWidth;
  const containerHeight = canvasContainer.clientHeight;
  
  // Set canvas attributes to match container size
  canvas.width = containerWidth;
  canvas.height = containerHeight;
  
  // Render game if it's already started
  if (gameStarted) {
    renderGame();
  }
}

// Start game with the selected settings
function startGame(settings) {
  // Show loading screen first
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'block';
  }
  
  // Wrap in try/catch to prevent silent failures during game initialization
  try {
    // Apply settings to initial game state - do this synchronously
    gameState = startNewGame(gameState, settings);
    
    // Use setTimeout to allow the loading screen to appear before heavy processing starts
    setTimeout(() => {
      try {
        console.log("Game initialization started");
        
        // Set minimap tile size based on map size
        if (minimap && gameState.mapSize) {
          minimapTileSize = minimap.width / gameState.mapSize;
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Initialize UI - wrap each in try/catch to prevent one failure from stopping others
        try {
          // Make sure gameState is valid before passing to UI functions
          if (gameState) {
            updateResourceDisplay(gameState);
          }
        } catch (e) {
          console.error("Error updating resource display:", e);
        }
        
        try {
          updateUnitButtons(gameState, (unitType) => createUnit(gameState, unitType));
        } catch (e) {
          console.error("Error updating unit buttons:", e);
        }
        
        try {
          updateResearchButtons(gameState, (techName) => startResearch(gameState, techName));
        } catch (e) {
          console.error("Error updating research buttons:", e);
        }
        
        try {
          updateBuildingButtons(gameState, (buildingType) => startBuilding(gameState, buildingType));
        } catch (e) {
          console.error("Error updating building buttons:", e);
        }
        
        try {
          updateUpkeepDisplay(gameState);
        } catch (e) {
          console.error("Error updating upkeep display:", e);
        }
        
        try {
          updateAgeProgressDisplay(gameState);
        } catch (e) {
          console.error("Error updating age progress display:", e);
        }
        
        // Render initial game state
        try {
          renderGame();
        } catch (e) {
          console.error("Error rendering game:", e);
        }
        
        // Hide loading screen after everything is ready
        if (loadingElement) {
          loadingElement.style.display = 'none';
        }
        
        gameStarted = true;
        console.log("Game initialization completed");
        
        // Force a redraw of resource display to ensure resource titles have click handlers
        setTimeout(() => {
          try {
            updateResourceDisplay(gameState);
          } catch (e) {
            console.error("Error updating resource display after initialization:", e);
          }
        }, 500);
        
      } catch (error) {
        console.error("Error during game initialization:", error);
        if (loadingElement) {
          loadingElement.style.display = 'none';
        }
      }
    }, 100);
  } catch (error) {
    console.error("Critical error starting game:", error);
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }
}

// Set up event listeners
function setupEventListeners() {
  console.log("Setting up event listeners");
  try {
    // Tab switching
    const tabElements = document.querySelectorAll('.tab');
    if (tabElements && tabElements.length > 0) {
      tabElements.forEach(tab => {
        try {
          tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            if (tabName) {
              switchTab(tabName);
            }
          });
        } catch (e) {
          console.error("Error setting up tab click listener:", e);
        }
      });
    } else {
      console.warn("No tab elements found");
    }
    
    // Canvas interactions - check if canvas exists
    if (canvas) {
      try {
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
      } catch (e) {
        console.error("Error setting up canvas event listeners:", e);
      }
    } else {
      console.error("Canvas element not found");
    }
    
    // Document-level events for dragging
    try {
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
      if (canvas) {
        canvas.addEventListener('wheel', e => {
          e.preventDefault();
          // Zoom functionality could be implemented here
        });
      }
    } catch (e) {
      console.error("Error setting up document event listeners:", e);
    }
    
    // Button event listeners - check existence before adding listeners
    try {
      const advanceAgeBtn = document.getElementById('advanceAgeBtn');
      if (advanceAgeBtn) {
        advanceAgeBtn.addEventListener('click', () => {
          advanceToNextAge(gameState);
          renderGame();
        });
      }
      
      const endTurnBtn = document.querySelector('button[onclick="endTurn()"]');
      if (endTurnBtn) {
        endTurnBtn.addEventListener('click', () => {
          endTurn(gameState, renderGame);
        });
      }
      
      const toggleFogOfWarBtn = document.querySelector('button[onclick="toggleFogOfWar()"]');
      if (toggleFogOfWarBtn) {
        toggleFogOfWarBtn.addEventListener('click', () => {
          toggleFogOfWar(gameState);
          renderGame();
        });
      }
      
      const aiDifficultySelect = document.getElementById('aiDifficulty');
      if (aiDifficultySelect) {
        aiDifficultySelect.addEventListener('change', () => {
          const difficulty = aiDifficultySelect.value;
          setAIDifficulty(gameState, difficulty);
        });
      }
      
      const diplomacyActionSelect = document.getElementById('diplomacyAction');
      if (diplomacyActionSelect) {
        diplomacyActionSelect.addEventListener('change', () => {
          const action = diplomacyActionSelect.value;
          if (action) {
            handleDiplomacy(gameState, action);
            diplomacyActionSelect.value = '';
          }
        });
      }
    } catch (e) {
      console.error("Error setting up button event listeners:", e);
    }
    
    console.log("Event listeners setup completed");
  } catch (error) {
    console.error("Critical error in setupEventListeners:", error);
  }
}

// Placeholder functions for missing implementations
// These placeholders prevent errors when called
function updateCityList(gameState) {
  const cityList = document.getElementById('cityList');
  if (!cityList) return;
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  if (player.cities && player.cities.length > 0) {
    cityList.innerHTML = '';
    player.cities.forEach(city => {
      const cityItem = document.createElement('div');
      cityItem.className = 'city-item';
      cityItem.innerHTML = `<h4>${city.name}</h4><p>Population: ${city.population || 5}</p>`;
      cityList.appendChild(cityItem);
    });
  } else {
    cityList.innerHTML = '<div class="no-cities">No cities founded yet</div>';
  }
}

function updateProductionQueues(gameState) {
  const buildingQueueList = document.getElementById('buildingQueueList');
  const unitQueueList = document.getElementById('unitQueueList');
  
  if (!buildingQueueList || !unitQueueList) return;
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  // Building queue
  if (player.buildingQueue && player.buildingQueue.length > 0) {
    buildingQueueList.innerHTML = '';
    player.buildingQueue.forEach(item => {
      const queueItem = document.createElement('div');
      queueItem.className = 'queue-item';
      queueItem.textContent = `${item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${Math.floor(item.progress)}%`;
      buildingQueueList.appendChild(queueItem);
    });
  } else {
    buildingQueueList.innerHTML = '<div class="empty-queue">No buildings in queue</div>';
  }
  
  // Check if any buildings have unit queues
  let hasUnitQueues = false;
  if (player.buildings) {
    player.buildings.forEach(building => {
      if (building.unitQueue && building.unitQueue.length > 0) {
        hasUnitQueues = true;
      }
    });
  }
  
  if (hasUnitQueues) {
    unitQueueList.innerHTML = '';
    player.buildings.forEach(building => {
      if (building.unitQueue && building.unitQueue.length > 0) {
        building.unitQueue.forEach(item => {
          const queueItem = document.createElement('div');
          queueItem.className = 'queue-item';
          queueItem.textContent = `${item.type.replace(/\b\w/g, l => l.toUpperCase())} - ${Math.floor(item.progress)}%`;
          unitQueueList.appendChild(queueItem);
        });
      }
    });
  } else {
    unitQueueList.innerHTML = '<div class="empty-queue">No units in queue</div>';
  }
}

function updateTradeRoutesList(gameState) {
  const tradeRoutesList = document.getElementById('tradeRoutesList');
  if (!tradeRoutesList) return;
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  if (player.tradeRoutes && player.tradeRoutes.length > 0) {
    tradeRoutesList.innerHTML = '';
    player.tradeRoutes.forEach(route => {
      const routeItem = document.createElement('div');
      routeItem.className = 'trade-route-item';
      routeItem.innerHTML = `
        <strong>${route.direction === 'import' ? 'Import' : 'Export'}</strong>: 
        ${route.amount} ${route.resource}
        from ${route.partner} (${route.turns} turns remaining)
      `;
      tradeRoutesList.appendChild(routeItem);
    });
  } else {
    tradeRoutesList.innerHTML = '<div class="no-trade-routes">No active trade routes</div>';
  }
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
    // Call a function that handles showing units of a specific type
    // Since this function isn't defined elsewhere, implement it inline
    const unitButtonsContainer = document.getElementById('unitButtons');
    if (unitButtonsContainer) {
      unitButtonsContainer.innerHTML = '';
      
      const player = gameState.players[gameState.currentPlayer - 1];
      const unitType = buildingData.unitType;
      
      // Filter units by type
      const availableUnits = player.unlockedUnits.filter(unit => {
        const unitData = unitTypes[unit];
        return unitData && unitData.type === unitType;
      });
      
      if (availableUnits.length > 0) {
        availableUnits.forEach(unitName => {
          const unitData = unitTypes[unitName];
          const costText = formatResourceCost(unitData.cost || {});
          
          const button = document.createElement('button');
          button.textContent = `${unitName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} (${costText})`;
          button.onclick = () => createUnit(gameState, unitName, building);
          
          unitButtonsContainer.appendChild(button);
        });
      } else {
        unitButtonsContainer.innerHTML = '<div class="no-units">No units available for this building type</div>';
      }
    }
  };
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
  
  // Calculate effective tile size
  const effectiveTileSize = Math.min(
    canvas.width / gameState.mapSize,
    canvas.height / gameState.mapSize,
    tileSize
  );
  
  // Calculate grid coordinates
  const gridX = Math.floor((mouseX + cameraOffsetX) / effectiveTileSize);
  const gridY = Math.floor((mouseY + cameraOffsetY) / effectiveTileSize);
  
  // Show tooltip for tile info
  if (gridX >= 0 && gridX < gameState.mapSize && gridY >= 0 && gridY < gameState.mapSize) {
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
  
  // Calculate effective tile size 
  const effectiveTileSize = Math.min(
    canvas.width / gameState.mapSize,
    canvas.height / gameState.mapSize,
    tileSize
  );
  
  const gridX = Math.floor((clickX + cameraOffsetX) / effectiveTileSize);
  const gridY = Math.floor((clickY + cameraOffsetY) / effectiveTileSize);
  
  // Ensure valid grid position
  if (gridX < 0 || gridX >= gameState.mapSize || gridY < 0 || gridY >= gameState.mapSize) return;
  
  const clickedTile = gameState.map[gridY][gridX];
  
  // Only interact with discovered tiles
  if (!clickedTile.discovered[gameState.currentPlayer - 1]) return;
  
  // If we're trying to build something
  if (gameState.selectedBuildingType) {
    buildStructure(gameState, gridX, gridY);
    renderGame();
    return;
  }
  
  // Hide unit action container when deselecting
  const unitActionsContainer = document.getElementById('unit-actions-container');
  
  // Handle unit action mode (move, attack)
  if (gameState.unitActionMode && selectedUnit) {
    if (gameState.unitActionMode === 'move') {
      // Attempt to move the unit to the clicked location
      moveUnit(selectedUnit, gridX, gridY);
      
      // Update unit UI panel with new MP
      updateUnitActionsPanel(selectedUnit);
      
      // Clear unit action mode
      gameState.unitActionMode = null;
    } 
    else if (gameState.unitActionMode === 'attack') {
      // Check if the clicked tile has an enemy unit
      if (clickedTile.unit && clickedTile.unit.owner !== gameState.currentPlayer) {
        attackUnit(selectedUnit, clickedTile.unit);
        
        // Update unit UI panel with new MP
        updateUnitActionsPanel(selectedUnit);
        
        // Clear unit action mode
        gameState.unitActionMode = null;
      } else {
        showNotification('No enemy unit at that location');
      }
    }
    
    renderGame();
    return;
  }
  
  // Select/deselect unit - normal mode when not in a specific action mode
  if (clickedTile.unit && clickedTile.unit.owner === gameState.currentPlayer) {
    // Select the unit
    selectedUnit = clickedTile.unit;
    gameState.selectedUnit = selectedUnit;
    showNotification(`Selected ${selectedUnit.type}`);
    
    // Show unit actions
    updateUnitActionsPanel(selectedUnit);
    switchTab('actions');
  } else if (selectedUnit && !gameState.unitActionMode) {
    // Move or attack with selected unit (direct click without explicit mode)
    moveUnit(selectedUnit, gridX, gridY);
    selectedUnit = null;
    gameState.selectedUnit = null;
    
    // Hide unit actions
    unitActionsContainer.style.display = 'none';
  }
  
  renderGame();
}

// Handle unit attacks
function attackUnit(attackingUnit, defendingUnit) {
  // Simple combat system
  const attackerType = unitTypes[attackingUnit.type];
  const defenderType = unitTypes[defendingUnit.type];
  
  // Get base attack and defense values
  const attackValue = attackerType.attack || 0;
  const defenseValue = defenderType.defense || 0;
  
  // Apply any fortification bonus
  const defenseBonus = defendingUnit.defenseBonus || 0;
  const totalDefense = defenseValue * (1 + defenseBonus / 100);
  
  // Calculate damage
  let damage = Math.max(5, Math.floor((attackValue / totalDefense) * 30));
  damage = Math.min(damage, 100); // Cap damage at 100%
  
  // Apply damage to defending unit
  if (!defendingUnit.health) defendingUnit.health = 100;
  defendingUnit.health -= damage;
  
  // Use movement points for attack
  if (!attackingUnit.remainingMP) attackingUnit.remainingMP = attackerType.move;
  attackingUnit.remainingMP = 0; // Attacking uses all remaining MP
  
  // Check if defender is defeated
  if (defendingUnit.health <= 0) {
    // Get tile coordinates for defender
    const defenderX = defendingUnit.x;
    const defenderY = defendingUnit.y;
    
    // Remove the defeated unit
    gameState.map[defenderY][defenderX].unit = null;
    showNotification(`Enemy ${defendingUnit.type} defeated!`);
  } else {
    showNotification(`Attacked enemy ${defendingUnit.type}, dealing ${damage}% damage.`);
  }
}

// Update the unit actions panel with information about the selected unit
function updateUnitActionsPanel(unit) {
  const unitActionsContainer = document.getElementById('unit-actions-container');
  const selectedUnitInfo = document.getElementById('selected-unit-info');
  
  if (!unit) {
    unitActionsContainer.style.display = 'none';
    return;
  }
  
  // Get unit details - handle potential missing unitTypes
  const unitTypeInfo = unitTypes[unit.type] || {
    move: 2,  // Default values if unit type not found
    attack: 0,
    defense: 0
  };
  
  // Initialize movement points if not already done
  if (unit.remainingMP === undefined) {
    initializeUnitMovement(unit);
  }
  
  // Create HTML for unit info
  const unitInfoHTML = `
    <div style="margin: 10px 0;">
      <strong>${unit.type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</strong><br>
      Health: ${unit.health || 100}%<br>
      Movement: ${unit.remainingMP || unitTypeInfo.move}/${unitTypeInfo.move}<br>
      ${unitTypeInfo.attack ? `Attack: ${unitTypeInfo.attack}<br>` : ''}
      ${unitTypeInfo.defense ? `Defense: ${unitTypeInfo.defense}<br>` : ''}
    </div>
  `;
  
  // Update the unit info display
  selectedUnitInfo.innerHTML = unitInfoHTML;
  
  // Show the unit actions container
  unitActionsContainer.style.display = 'block';
  
  // Update button states based on the unit's status
  const moveBtn = document.getElementById('move-unit-btn');
  const attackBtn = document.getElementById('attack-unit-btn');
  const fortifyBtn = document.getElementById('fortify-unit-btn');
  const skipBtn = document.getElementById('skip-unit-btn');
  
  if (moveBtn && attackBtn && fortifyBtn && skipBtn) {
    // Disable move button if no movement points left
    moveBtn.disabled = (unit.remainingMP <= 0);
    
    // Disable attack button if the unit can't attack or has no movement points
    attackBtn.disabled = (!unitTypeInfo.attack || unit.remainingMP <= 0);
    
    // Update button tooltips
    moveBtn.title = moveBtn.disabled ? 'No movement points remaining' : 'Move this unit';
    attackBtn.title = attackBtn.disabled ? 'Cannot attack' : 'Attack an enemy';
    fortifyBtn.title = 'Increase defense by fortifying position';
    skipBtn.title = 'Skip this unit\'s turn';
  } else {
    console.error("Unit action buttons not found in the DOM");
  }
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
  
  // Regular movement using the movement system
  const success = moveUnitSystem(unit, targetX, targetY, gameState.map, showNotification);
  
  if (success) {
    // Add movement UI update here - could be added to the UI module
    const unitMP = unit.remainingMP || 0;
    const maxMP = unitTypes[unit.type].move;
    showNotification(`${unit.type} MP: ${unitMP}/${maxMP}`);
  }
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
    fogOfWarEnabled: gameState.fogOfWarEnabled,
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
  toggleFogOfWar(gameState);
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
  // Switch to the actions tab when selecting a building from resource click
  switchTab('actions');
};

// Unit action functions
window.prepareUnitMove = () => {
  if (selectedUnit) {
    showNotification('Click on destination tile to move unit');
    
    // Highlight valid movement tiles could be implemented here
    // For now, just show a notification
    
    // Set game state to indicate we're in unit movement mode
    gameState.unitActionMode = 'move';
  }
};

window.prepareUnitAttack = () => {
  if (selectedUnit) {
    const unitTypeInfo = unitTypes[selectedUnit.type];
    if (!unitTypeInfo.attack) {
      showNotification('This unit cannot attack');
      return;
    }
    
    if (selectedUnit.remainingMP <= 0) {
      showNotification('Unit has no movement points left to attack');
      return;
    }
    
    showNotification('Click on enemy unit to attack');
    
    // Highlight attackable units could be implemented here
    // For now, just show a notification
    
    // Set game state to indicate we're in attack mode
    gameState.unitActionMode = 'attack';
  }
};

window.fortifyUnit = () => {
  if (selectedUnit) {
    // Apply fortification bonus
    selectedUnit.fortified = true;
    selectedUnit.defenseBonus = 50; // 50% bonus to defense when fortified
    selectedUnit.remainingMP = 0; // Use all remaining movement points
    
    showNotification(`${selectedUnit.type} fortified (+50% defense)`);
    
    // Update the UI
    updateUnitActionsPanel(selectedUnit);
    renderGame();
  }
};

window.skipUnitTurn = () => {
  if (selectedUnit) {
    // Mark the unit as having used its turn
    selectedUnit.remainingMP = 0;
    
    // Deselect the unit
    const unitActionsContainer = document.getElementById('unit-actions-container');
    unitActionsContainer.style.display = 'none';
    
    showNotification(`${selectedUnit.type} turn skipped`);
    
    selectedUnit = null;
    gameState.selectedUnit = null;
    
    renderGame();
  }
};

// Building category filter
window.filterBuildingsByCategory = () => {
  const category = document.getElementById('buildingCategoryFilter').value;
  updateBuildingButtonsByCategory(gameState, category, startBuilding);
};

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
  
  // Placeholder function for trade routes list update
  // This function isn't implemented but is referenced
  if (typeof updateTradeRoutesList === 'function') {
    updateTradeRoutesList(gameState);
  } else {
    console.log("Trade route added but updateTradeRoutesList function is not defined");
  }
  
  showNotification(`New trade route established for ${randomResource}`);
};

// Settings menu
window.openSettings = function() {
  showSettingsMenu(gameState);
};

// Start new game from UI button
window.startNewGameFromUI = function() {
  // Create a confirmation dialog
  if (confirm("Start a new game? Your current progress will be lost.")) {
    // Reset game state
    gameState = createInitialGameState();
    
    // Show start menu for new game options
    const gameContainer = document.getElementById('gameContainer');
    gameContainer.style.display = 'none';
    
    // Store gameState in window for access from settings
    window.gameState = gameState;
    
    // Show the start menu again
    initStartMenu(startGame);
    
    showNotification("New game initialized. Select your settings.");
  }
};

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
  // Add 'Escape' key for settings
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      // Toggle settings menu
      const settingsOverlay = document.getElementById('settingsOverlay');
      if (settingsOverlay) {
        settingsOverlay.style.display = settingsOverlay.style.display === 'flex' ? 'none' : 'flex';
      }
    }
  });
  
  let keyboardShortcutsVisible = false;
  const shortcuts = document.getElementById('keyboardShortcuts');
  
  document.addEventListener('keydown', function(e) {
    // Don't capture keystrokes when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    switch(e.key) {
      case 'e':
      case 'E':
        // End turn shortcut
        endTurn(gameState, renderGame);
        break;
      case 'h':
      case 'H':
        // Toggle keyboard shortcuts help
        keyboardShortcutsVisible = !keyboardShortcutsVisible;
        shortcuts.classList.toggle('show', keyboardShortcutsVisible);
        break;
    }
  });
}
