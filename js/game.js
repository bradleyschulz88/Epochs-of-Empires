import { tileSize } from './modules/constants.js';
import { initStartMenu, startNewGame, showSettingsMenu } from './modules/startMenu.js';
import { createInitialGameState } from './modules/gameState.js';
import { generateMap, revealArea } from './modules/map.js';
import { render, updateResourceDisplay, updateUpkeepDisplay, updateUnitButtons, updateResearchButtons, updateBuildingButtons, updateAgeProgressDisplay, showNotification, getUnitTooltipContent, LoadingManager } from './modules/ui.js';
import { Viewport } from './modules/viewport.js';
import { SpatialPartition } from './modules/spatial.js';
import { ErrorHandler } from './modules/errorHandling.js';
import { EventHandler } from './modules/eventHandler.js';
import { GameLoopManager } from './modules/gameLoop.js';
import { terrainTypes } from './modules/terrain.js';
import { buildingTypes } from './modules/buildings.js';
import { unitTypes } from './modules/units.js';
import { resourcesByAge, resourceTileTypes } from './modules/resources.js';
import { updateBuildingButtonsByCategory } from './modules/buildingManager.js';

// Make functions globally available for cross-module usage
window.revealArea = revealArea;
window.attackUnit = attackUnit;
window.updateUnitActionsPanel = updateUnitActionsPanel;
window.canMoveToTile = canMoveToTile;
window.moveUnitSystem = moveUnitSystem;
window.unitTypes = unitTypes;
window.toggleFogOfWar = toggleFogOfWar;
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
  initializeUnitMovement,
  getValidMovementLocations
} from './modules/movement.js';
import { pixelToAxial } from './modules/hexgrid.js';

// Game canvas and context
let canvas = null;
let ctx = null;
let minimap = null;
let minimapCtx = null;
let minimapTileSize = 4;
let loadingManager;

// Game state and settings
let gameState = null;
let mouseX = 0, mouseY = 0;
let cameraOffsetX = 0, cameraOffsetY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let selectedUnit = null;
let gameStarted = false;
let currentTab = 'actions';

// Initialize the game
window.onload = async function() {
    try {
        // Create and show loading manager first
        loadingManager = new LoadingManager();
        loadingManager.show();
        loadingManager.updateProgress(0, "Initializing game...");
        
        // Initialize canvas elements
        canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error('Game canvas not found');
        }
        ctx = canvas.getContext('2d');
        
        // Add click handler
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('mousemove', handleMouseMove);
        
        minimap = document.getElementById('minimap');
        if (!minimap) {
            throw new Error('Minimap canvas not found');
        }
        minimapCtx = minimap.getContext('2d');
        
        // Create initial game state
        loadingManager.updateProgress(40, "Creating game state...");
        gameState = createInitialGameState();
        window.gameState = gameState;
        
        // Hide game container initially
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }
        
        loadingManager.updateProgress(80, "Initializing start menu...");
        
        // Initialize start menu
        initStartMenu(startGame);
        
        loadingManager.updateProgress(100, "Ready!");
        setTimeout(() => {
            loadingManager.hide();
        }, 500);
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        loadingManager.updateProgress(100, "Error: " + error.message);
        setTimeout(() => {
            loadingManager.hide();
            alert("Failed to initialize game: " + error.message);
        }, 1000);
    }
};

// Debounce function to limit frequent updates
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Make modules accessible globally
window.gameModules = {
  ui: null, // Will be filled in during setup
  viewport: null
};

// Cache DOM elements
// Make debouncedRender available globally
window.debouncedRender = debounce(() => {
    if (!gameStarted) return;
    
    // Get current viewport values if available
    let viewportData = {};
    if (window.gameModules.viewport) {
        const viewport = window.gameModules.viewport;
        viewportData = {
            cameraOffsetX: viewport.offsetX,
            cameraOffsetY: viewport.offsetY,
            scale: viewport.scale
        };
    } else {
        viewportData = {
            cameraOffsetX: cameraOffsetX,
            cameraOffsetY: cameraOffsetY,
            scale: 1
        };
    }
    
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
        ...viewportData
    };
    
    render(gameState, canvasData);
}, 16); // ~60fps

function setupEventHandlers(gameState, viewport, gameLoop) {
    // Store references to modules in global scope for cross-module access
    window.gameModules.viewport = viewport;
    window.gameModules.ui = {
        setHoveredTile: setHoveredTile,
        animateTileClick: animateTileClick,
        TILE_SIZE: 50,
        TILE_GUTTER: 3
    };
    
    const eventHandler = new EventHandler(gameState, viewport);
    
    // Additional game-specific event handlers
    window.addEventListener('resize', () => {
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            debouncedRender();
        }
    });
    
    // Trigger initial resize
    window.dispatchEvent(new Event('resize'));
    
    // Initialize UI event handlers
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            currentTab = button.dataset.tab;
            switchTab(currentTab);
        });
    });
    
    // Initialize tab handlers from selectors
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            if (tabName) {
                currentTab = tabName;
                switchTab(currentTab);
            }
        });
    });
    
    // Initialize fog of war toggle
    const fogToggleBtn = document.getElementById('fogToggle');
    if (fogToggleBtn) {
        fogToggleBtn.addEventListener('click', () => {
            if (typeof toggleFogOfWar === 'function') {
                toggleFogOfWar(gameState);
                showNotification(`Fog of War: ${gameState.fogOfWarEnabled ? 'Enabled' : 'Disabled'}`);
                debouncedRender();
            } else {
                console.error("toggleFogOfWar function not found");
            }
        });
    }
}

// Track the currently hovered tile for UI highlighting
function setHoveredTile(x, y) {
    // This function will be provided to the UI module
    // The UI module will call this when it detects a hover
    if (window.gameModules.ui) {
        window.gameModules.ui.hoveredTileX = x;
        window.gameModules.ui.hoveredTileY = y;
    }
    debouncedRender();
}

// Handle tile click animation
function animateTileClick(x, y) {
    // This function will be provided to the UI module
    // The UI module will call this when a tile is clicked
    // We'll use it to animate UI effects for clicked tiles
    if (x === null || y === null) return;
    
    // Trigger a visual feedback when a tile is clicked
    const clickEffect = {
        x: x,
        y: y,
        timestamp: performance.now()
    };
    
    if (window.gameModules.ui) {
        window.gameModules.ui.lastClickedTile = clickEffect;
    }
    
    debouncedRender();
}

// Function to switch between UI tabs
function switchTab(tabName) {
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(`${tabName}-tab`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Activate selected tab
    const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.setAttribute('aria-selected', 'true');
    }
    
    // Update current tab
    currentTab = tabName;
    
    // Refresh display based on tab
    switch(tabName) {
        case 'actions':
            updateBuildingButtons(gameState, startBuilding);
            break;
        case 'units':
            updateUnitButtons(gameState, createUnit);
            break;
        case 'research':
            updateResearchButtons(gameState, startResearch);
            break;
        case 'cities':
            updateCityList(gameState);
            break;
        case 'diplomacy':
            updateDiplomacyStatus(gameState);
            break;
    }
}

// Function to start a new game
function startGame(settings) {
    try {
        // Start new game with the selected settings
        gameState = startNewGame(gameState, settings);
        
        // Set up event handlers and game loop
        const viewport = new Viewport(canvas, gameState.mapSize * tileSize);
        const gameLoop = new GameLoopManager(gameState);
        setupEventHandlers(gameState, viewport, gameLoop);
        
        // Start the game
        gameStarted = true;
        gameLoop.start();
        
        // Show initial game state
        updateResourceDisplay(gameState);
        updateUpkeepDisplay(gameState);
        updateUnitButtons(gameState);
        updateResearchButtons(gameState);
        updateBuildingButtons(gameState);
        updateAgeProgressDisplay(gameState);
        
        // Initial render
        debouncedRender();
    } catch (error) {
        console.error('Failed to start game:', error);
        alert('Failed to start game. Please try again with different settings.');
    }
}

// Handle mouse movement over the canvas
function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  
  // Use debounced render for smoother performance
  debouncedRender();
}

/**
 * Reveals a tile and surrounding area when clicked in fog of war
 * @param {Number} x - X coordinate of the tile to reveal
 * @param {Number} y - Y coordinate of the tile to reveal
 */
function revealTile(x, y) {
  const playerIndex = gameState.currentPlayer - 1;
  const revealRadius = 2; // Small reveal radius for clicked tiles
  
  // Import revealArea function from map.js if needed
  if (typeof revealArea === 'undefined') {
    // Use the imported function directly
    import('./modules/map.js').then(mapModule => {
      mapModule.revealArea(gameState, x, y, revealRadius, playerIndex);
    });
  } else {
    // Use the already imported function
    revealArea(gameState, x, y, revealRadius, playerIndex);
  }
  
  // Also check if there's a unit selected
  if (selectedUnit) {
    // When a unit is selected and player clicks on fog, also allow moving to that tile
        const moveResult = canMoveToTile(selectedUnit, selectedUnit.x, selectedUnit.y, x, y, gameState.map, true);
        
        if (moveResult.canMove) {
          // Valid move - proceed with movement automatically after revealing
          moveUnitSystem(selectedUnit, x, y, gameState.map, (message) => {
            showNotification(message);
          });
          showNotification(`Unit moved to the newly revealed location`);
          
          // Make sure we update the unit panel if it's still showing
          updateUnitActionsPanel(selectedUnit);
        }
  }
  
  showNotification(`Area revealed at (${x}, ${y})`);
}

// Handle clicks on the game canvas with hex grid support
function handleCanvasClick(e) {
  if (!gameStarted) return;
  
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  // Get hex grid size for calculations
  const hexSize = 30; // Should match the size in ui.js
  
  // Convert mouse position to pixel coordinates (adjusted for camera)
  const pixelX = clickX + cameraOffsetX;
  const pixelY = clickY + cameraOffsetY;
  
  // Convert pixel coordinates to axial coordinates
  const hexCoords = pixelToAxial(pixelX, pixelY, hexSize);
  
  // Find the tile at these axial coordinates
  let gridX = -1;
  let gridY = -1;
  const mapSize = gameState.mapSize;
  
  // Search for the tile with matching axial coordinates
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = gameState.map[y][x];
      if (tile.q === hexCoords.q && tile.r === hexCoords.r) {
        gridX = x;
        gridY = y;
        break;
      }
    }
    if (gridX !== -1) break;
  }
  
  // If we couldn't find by axial coordinates (during transition), 
  // use the axial coordinates as indices if they're in bounds
  if (gridX === -1 && hexCoords.q >= 0 && hexCoords.q < mapSize && 
      hexCoords.r >= 0 && hexCoords.r < mapSize) {
    gridX = hexCoords.q;
    gridY = hexCoords.r;
  }
  
  // Ensure valid grid position
  if (gridX < 0 || gridX >= gameState.mapSize || gridY < 0 || gridY >= gameState.mapSize) return;

  const clickedTile = gameState.map[gridY][gridX];
  
  // For undiscovered tiles, we'll still allow some interactions
  if (!clickedTile.discovered[gameState.currentPlayer - 1]) {
    // If a unit is selected, try to move there (to explore the fog)
    if (selectedUnit) {
      // When a unit is selected and player clicks on fog, try to move to that tile
      const moveResult = canMoveToTile(selectedUnit, selectedUnit.x, selectedUnit.y, gridX, gridY, gameState.map, true);
      
      if (moveResult.canMove) {
        // Valid move - proceed with movement to explore fog of war
        moveUnitSystem(selectedUnit, gridX, gridY, gameState.map, (message) => {
          showNotification(message);
        });
        showNotification(`Unit moving to explore area at (${gridX}, ${gridY})`);
        
        // Update the UI
        updateUnitActionsPanel(selectedUnit);
        
        // Also reveal the area that the unit is moving to
        revealTile(gridX, gridY);
      } else {
        // Can't move but tell the player what's wrong
        showNotification(`Cannot move to that location: ${moveResult.reason}`);
      }
    } else {
      // No unit selected but still provide information
      showNotification("This area is covered by fog of war. Select a unit to explore it.");
    }
    
    // Still render the map after the interaction
    debouncedRender();
    return;
  }
  
  // If we're trying to build something
  if (gameState.selectedBuildingType) {
    buildStructure(gameState, gridX, gridY);
    debouncedRender();
    return;
  }
  
  // If the user clicks on a different tile or empty space, remove any existing building suggestion
  const existingSuggestion = document.querySelector('.building-suggestion');
  if (existingSuggestion) {
    existingSuggestion.remove();
  }
  
  // Only show building suggestion if:
  // 1. The tile has no buildings or buildings in progress
  // 2. AND either no unit is present OR the user has clicked on the same unit twice (double click)
  const isDoubleClickOnUnit = clickedTile.unit && clickedTile.unit === selectedUnit;
  
  if (!clickedTile.building && !clickedTile.buildingInProgress && (!clickedTile.unit || isDoubleClickOnUnit)) {
    // Call the showBuildingSuggestion function
    showBuildingSuggestion(clickedTile, gridX, gridY);
  }

// Function to show building suggestion UI
function showBuildingSuggestion(tile, x, y) {
  // Remove any existing suggestion first
  const existingSuggestion = document.querySelector('.building-suggestion');
  if (existingSuggestion) {
    existingSuggestion.remove();
  }
  
  // Create building suggestion element
  const suggestion = document.createElement('div');
  suggestion.className = 'building-suggestion';
  
  // Position it near the center of the screen
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  suggestion.style.left = `${centerX - 150}px`; // 150 is half the width of the suggestion box
  suggestion.style.top = `${centerY - 200}px`;  // Position it a bit above center
  
  // Get terrain type for filtering
  const terrainType = tile.type;
  
  // Get player's current age
  const currentPlayer = gameState.players[gameState.currentPlayer - 1];
  const playerAge = currentPlayer.age;
  
  // Create content
  suggestion.innerHTML = `
    <div class="suggestion-header">
      <h3>Build at (${x}, ${y}) - ${terrainType}</h3>
      <button class="close-suggestion">×</button>
    </div>
    <div class="suggestion-content">
      <p>Select a building type:</p>
      <div class="suggestion-buttons"></div>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(suggestion);
  
  // Add event listener to close button
  suggestion.querySelector('.close-suggestion').addEventListener('click', () => {
    suggestion.remove();
  });
  
  // Populate buttons with available buildings
  const buttonContainer = suggestion.querySelector('.suggestion-buttons');
  
  // Filter buildings by terrain and age
  for (const [buildingType, building] of Object.entries(buildingTypes)) {
    // Skip buildings from future ages
    if (building.age && gameState.ages.indexOf(building.age) > gameState.ages.indexOf(playerAge)) {
      continue;
    }
    
    // Skip buildings with terrain requirements that don't match
    if (building.terrainRequirement && !building.terrainRequirement.includes(terrainType)) {
      continue;
    }
    
    // Create button
    const button = document.createElement('button');
    button.className = 'suggestion-building-btn';
    button.textContent = buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Add tooltip with cost
    let tooltipText = '';
    for (const resource in building.cost) {
      tooltipText += `${resource}: ${building.cost[resource]}, `;
    }
    tooltipText = tooltipText.slice(0, -2); // Remove trailing comma
    button.title = tooltipText;
    
    // Check if player can afford it
    let canAfford = true;
    for (const resource in building.cost) {
      if ((currentPlayer.resources[resource] || 0) < building.cost[resource]) {
        canAfford = false;
        break;
      }
    }
    
    button.disabled = !canAfford;
    
    // Add click event
    button.addEventListener('click', () => {
      startBuilding(gameState, buildingType);
      suggestion.remove();
    });
    
    buttonContainer.appendChild(button);
  }
  
  // If no buildings are available for this terrain, show a message
  if (buttonContainer.children.length === 0) {
    buttonContainer.innerHTML = `<p>No buildings available for ${terrainType} terrain in the ${playerAge}.</p>`;
  }
}
  
  // Hide unit action container when deselecting
  const unitActionsContainer = document.getElementById('unit-actions-container');
  
  // Handle unit action mode (move, attack)
  if (gameState.unitActionMode && selectedUnit) {
    if (gameState.unitActionMode === 'move') {
      // Check if the clicked location is a valid movement destination
      const validLocation = gameState.validMovementLocations && 
                           gameState.validMovementLocations.find(loc => loc.x === gridX && loc.y === gridY);
      
      if (validLocation) {
        // Attempt to move the unit to the clicked location
      moveUnitSystem(selectedUnit, gridX, gridY, gameState.map, (message) => {
        showNotification(message);
      });
        
        // Update unit UI panel with new MP
        updateUnitActionsPanel(selectedUnit);
      } else {
        // If clicked on invalid location, show notification
        showNotification('Cannot move to that location');
      }
      
      // Clear unit action mode and valid movement locations
      gameState.unitActionMode = null;
      gameState.validMovementLocations = null;
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
    
    debouncedRender();
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
    // Check if this is a valid move before attempting direct movement
    const moveResult = canMoveToTile(selectedUnit, selectedUnit.x, selectedUnit.y, gridX, gridY, gameState.map);
    
    if (moveResult.canMove) {
      // Valid move - proceed with movement
      moveUnitSystem(selectedUnit, gridX, gridY, gameState.map, (message) => {
        showNotification(message);
      });
      selectedUnit = null;
      gameState.selectedUnit = null;
      
      // Hide unit actions
      unitActionsContainer.style.display = 'none';
    } else {
      // Invalid move - show notification with reason
      showNotification(moveResult.reason);
    }
  }
  
  debouncedRender();
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
  
  // Since attacking uses all movement points, automatically close the action menu
  const unitActionsContainer = document.getElementById('unit-actions-container');
  if (unitActionsContainer) {
    unitActionsContainer.style.display = 'none';
  }
  
  // Also clear the selected unit
  selectedUnit = null;
  gameState.selectedUnit = null;
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
  if (confirm("Start a new game? Your current progress will be lost.")) {
    try {
      loadingManager.show();
      loadingManager.updateProgress(0, "Initializing new game...");
      
      const gameContainer = document.getElementById('gameContainer');
      if (gameContainer) {
        gameContainer.style.display = 'none';
      }
      
      // Reset game state with loading progress updates
      loadingManager.updateProgress(20, "Resetting game state...");
      gameState = createInitialGameState();
      window.gameState = gameState;
      
      // Reset game variables
      loadingManager.updateProgress(40, "Cleaning up game elements...");
      mouseX = 0;
      mouseY = 0;
      cameraOffsetX = 0;
      cameraOffsetY = 0;
      isDragging = false;
      dragStartX = 0;
      dragStartY = 0;
      selectedUnit = null;
      gameStarted = false;
      currentTab = 'actions';
      
      // Clean up canvas
      if (canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      if (minimap) {
        minimapCtx.clearRect(0, 0, minimap.width, minimap.height);
      }
      
      loadingManager.updateProgress(60, "Initializing start menu...");
      const existingOverlay = document.getElementById('startMenuOverlay');
      if (existingOverlay) {
        document.body.removeChild(existingOverlay);
      }
      
      loadingManager.updateProgress(80, "Setting up new game...");
      initStartMenu(startGame);
      
      loadingManager.updateProgress(100, "Game ready!");
      setTimeout(() => {
        loadingManager.hide();
      }, 500);
      
    } catch (error) {
      console.error("Critical error in startNewGameFromUI:", error);
      loadingManager.updateProgress(100, "Error: " + error.message);
      setTimeout(() => {
        loadingManager.hide();
        alert("An error occurred. Please refresh the page.");
      }, 1000);
    }
  }
};
