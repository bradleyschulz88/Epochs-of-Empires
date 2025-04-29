import { tileSize } from './modules/constants.js';
import { initStartMenu, startNewGame, showSettingsMenu } from './modules/startMenu.js';
import { createInitialGameState } from './modules/gameState.js';
import { generateMap } from './modules/map.js';
import { render, updateResourceDisplay, updateUpkeepDisplay, updateUnitButtons, updateResearchButtons, updateBuildingButtons, updateAgeProgressDisplay, showNotification, getUnitTooltipContent } from './modules/ui.js';
import { terrainTypes } from './modules/terrain.js';
import { buildingTypes } from './modules/buildings.js';
import { unitTypes } from './modules/units.js';
import { resourcesByAge, resourceTileTypes } from './modules/resources.js';
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
import { revealArea } from './modules/map.js';
import {
  moveUnit as moveUnitSystem,
  canMoveToTile,
  boardTransport,
  disembarkUnit,
  resetMovementPoints,
  initializeUnitMovement,
  getValidMovementLocations
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

// Hex grid constants and utility functions for pixel-to-hex conversion
const HEX_SIZE = 30; // Size of hexagon (distance from center to corner)

/**
 * Convert axial coordinates (q,r) to pixel coordinates (x,y)
 * @param {Number} q - Q axial coordinate
 * @param {Number} r - R axial coordinate
 * @param {Number} size - Size of hex (distance from center to corner)
 * @returns {Object} - {x, y} pixel coordinates
 */
function axialToPixel(q, r, size = HEX_SIZE) {
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
function pixelToAxial(x, y, size = HEX_SIZE) {
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
function roundToHex(q, r) {
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
    
    // Enable new hex map generator if selected in settings
    if (settings && settings.useNewMapGenerator) {
      console.log("Using new hex-based map generator");
      gameState.useNewGenerator = true;
      
      // Set a seed for reproducible maps
      gameState.mapSeed = settings.mapSeed || Math.floor(Math.random() * 1000000);
      console.log(`Map seed: ${gameState.mapSeed}`);
    }
    
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
        
    // Initialize camera position and center the map
    try {
      // Center the camera based on the map dimensions
      if (gameState.usingHexGrid) {
        // For hex grid, center it based on the hex radius calculation
        const mapRadius = gameState.mapRadius || Math.floor(gameState.mapSize / 2);
        const hexSize = HEX_SIZE; // Constant from UI module, adjust as needed
        
        // Calculate total width/height in pixels for the hex grid
        const mapWidthInPixels = Math.sqrt(3) * hexSize * (mapRadius * 2 + 1);
        const mapHeightInPixels = 3/2 * hexSize * (mapRadius * 2 + 1);
        
        // Set camera to center the map
        cameraOffsetX = (mapWidthInPixels / 2) - (canvas.width / 2);
        cameraOffsetY = (mapHeightInPixels / 2) - (canvas.height / 2);
        
        console.log("Hex grid detected, centering camera at", cameraOffsetX, cameraOffsetY);
      } else {
        // For square grid, use the old logic
        cameraOffsetX = 0;
        cameraOffsetY = 0;
      }
      
      // Render initial game state with centered map
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
  // Event listener to close building suggestion when clicking anywhere
  document.addEventListener('click', (e) => {
    // Only handle this if it's not a direct click on the canvas
    if (e.target !== canvas) {
      const suggestion = document.querySelector('.building-suggestion');
      if (suggestion) {
        // Check if click is outside the suggestion box
        if (!suggestion.contains(e.target)) {
          suggestion.remove();
        }
      }
    }
  });

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
    // First, ensure our buildings section exists
    const actionsTab = document.getElementById('actions-tab');
    let buildingsSection = document.getElementById('buildings-section');
    
    if (!buildingsSection && actionsTab) {
      // If buildings section doesn't exist, create it
      console.log("Building section not found, creating it now");
      buildingsSection = document.createElement('div');
      buildingsSection.id = 'buildings-section';
      buildingsSection.style.backgroundColor = '#f8fafc';
      buildingsSection.style.padding = '15px';
      buildingsSection.style.borderRadius = '8px';
      buildingsSection.style.marginTop = '20px';
      buildingsSection.style.border = '2px solid #4a5568';
      
      // Add the title
      const title = document.createElement('h3');
      title.style.margin = '0';
      title.style.padding = '10px';
      title.style.background = '#4a5568';
      title.style.color = 'white';
      title.style.borderRadius = '8px';
      title.style.textAlign = 'center';
      title.style.fontSize = '18px';
      title.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      title.textContent = 'Construct Building';
      buildingsSection.appendChild(title);
      
      // Add category filter
      const filterContainer = document.createElement('div');
      filterContainer.style.margin = '15px 0';
      filterContainer.style.display = 'block';
      
      const filterSelect = document.createElement('select');
      filterSelect.id = 'buildingCategoryFilter';
      filterSelect.setAttribute('onchange', 'window.filterBuildingsByCategory()');
      filterSelect.style.width = '100%';
      filterSelect.style.padding = '10px';
      filterSelect.style.borderRadius = '6px';
      filterSelect.style.border = '1px solid #cbd5e0';
      filterSelect.style.backgroundColor = 'white';
      
      // Add options
      const categories = [
        ['all', 'All Buildings'],
        ['resource_node', 'Resource Buildings'],
        ['production', 'Production Buildings'],
        ['economic', 'Economic Buildings'],
        ['defense', 'Defense Buildings'],
        ['housing', 'Housing']
      ];
      
      categories.forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        filterSelect.appendChild(option);
      });
      
      filterContainer.appendChild(filterSelect);
      buildingsSection.appendChild(filterContainer);
      
      // Create quick build buttons
      const quickBuildContainer = document.createElement('div');
      quickBuildContainer.id = 'simple-building-buttons';
      quickBuildContainer.style.marginBottom = '20px';
      
      const quickBuildTitle = document.createElement('h4');
      quickBuildTitle.style.margin = '10px 0';
      quickBuildTitle.style.color = '#4a5568';
      quickBuildTitle.textContent = 'Quick Build Options:';
      quickBuildContainer.appendChild(quickBuildTitle);
      
      // Add standard building buttons
      const quickBuildings = [
        ['farm', 'Farm (50 Wood)', '#68d391', '#234e52'],
        ['house', 'House (40 Wood, 20 Stone)', '#4299e1', '#2a4365'],
        ['logging_camp', 'Logging Camp (30 Wood)', '#9ae6b4', '#234e52'],
        ['hunters_hut', 'Hunter\'s Hut (40 Wood)', '#fbd38d', '#744210']
      ];
      
      quickBuildings.forEach(([type, text, bgColor, textColor]) => {
        const btn = document.createElement('button');
        btn.setAttribute('onclick', `window.startBuilding('${type}')`);
        btn.style.backgroundColor = bgColor;
        btn.style.color = textColor;
        btn.style.fontWeight = 'bold';
        btn.style.width = '100%';
        btn.style.margin = '5px 0';
        btn.style.padding = '12px';
        btn.style.borderRadius = '8px';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.2s';
        btn.textContent = text;
        
        btn.addEventListener('mouseover', () => {
          btn.style.transform = 'translateY(-2px)';
          btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        });
        
        btn.addEventListener('mouseout', () => {
          btn.style.transform = '';
          btn.style.boxShadow = '';
        });
        
        quickBuildContainer.appendChild(btn);
      });
      
      buildingsSection.appendChild(quickBuildContainer);
      
      // Create container for building buttons
      const buildingButtonsContainer = document.createElement('div');
      buildingButtonsContainer.className = 'building-buttons';
      buildingButtonsContainer.style.display = 'block';
      buildingButtonsContainer.style.visibility = 'visible';
      buildingButtonsContainer.style.opacity = '1';
      buildingButtonsContainer.style.maxHeight = '400px';
      buildingButtonsContainer.style.overflowY = 'auto';
      buildingButtonsContainer.style.border = '1px solid #cbd5e0';
      buildingButtonsContainer.style.padding = '15px';
      buildingButtonsContainer.style.borderRadius = '8px';
      buildingButtonsContainer.style.backgroundColor = 'white';
      
      // Add a loading message
      const loadingMsg = document.createElement('div');
      loadingMsg.id = 'building-menu-loading';
      loadingMsg.style.padding = '20px';
      loadingMsg.style.textAlign = 'center';
      loadingMsg.style.color = '#4a5568';
      loadingMsg.style.fontWeight = 'bold';
      loadingMsg.style.backgroundColor = '#f7fafc';
      loadingMsg.style.borderRadius = '8px';
      loadingMsg.style.margin = '10px 0';
      loadingMsg.style.border = '1px dashed #cbd5e0';
      loadingMsg.textContent = 'Building menu is being loaded...';
      
      buildingButtonsContainer.appendChild(loadingMsg);
      buildingsSection.appendChild(buildingButtonsContainer);
      
      // Add buildings section to actions tab
      actionsTab.appendChild(buildingsSection);
      
      // Force UI to update - scroll to ensure visibility
      actionsTab.scrollTop = 0;
      setTimeout(() => {
        if (buildingsSection) {
          buildingsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
    
    // Make sure the building buttons container is visible
    const buildingButtons = document.querySelector('.building-buttons');
    if (buildingButtons) {
      // Force display properties to ensure visibility
      buildingButtons.style.display = 'block';
      buildingButtons.style.visibility = 'visible';
      buildingButtons.style.maxHeight = '400px';
      buildingButtons.style.overflowY = 'auto';
      buildingButtons.style.opacity = '1';
      
      // Log to check if the function is being called
      console.log("Actions tab active, ensuring building menu container is visible");
    } else {
      console.error("Building buttons container not found after tab switch");
    }
    
    // Update the building buttons content
    try {
      updateBuildingButtons(gameState, (buildingType) => startBuilding(gameState, buildingType));
    } catch (e) {
      console.error("Error updating building buttons:", e);
    }
    
    try {
      updateAgeProgressDisplay(gameState);
    } catch (e) {
      console.error("Error updating age progress display:", e);
    }
    
    // Ensure visibility after a short delay
    setTimeout(() => {
      const buildingMenu = document.querySelector('.building-buttons');
      if (buildingMenu) {
        buildingMenu.style.display = 'block';
        buildingMenu.style.visibility = 'visible';
        buildingMenu.style.opacity = '1';
        
        // Force scrollIntoView to ensure visible
        buildingMenu.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        console.log("Ensuring building menu visibility after tab switch");
      }
    }, 100);
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
  
  // Get hexagonal grid size from modules/ui.js
  const hexSize = 30; // Size of hex (should match the value in ui.js)
  
  // Convert mouse position to pixel coordinates (adjusted for camera)
  const pixelX = mouseX + cameraOffsetX;
  const pixelY = mouseY + cameraOffsetY;
  
  // Convert pixel coordinates to axial coordinates
  const hexCoords = pixelToAxial(pixelX, pixelY, hexSize);
  
  // Find the tile at these axial coordinates
  let gridX = -1;
  let gridY = -1;
  const mapSize = gameState.mapSize;
  
  // First try to find by axial coordinates
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

/**
 * Reveals a tile and surrounding area when clicked in fog of war
 * @param {Number} x - X coordinate of the tile to reveal
 * @param {Number} y - Y coordinate of the tile to reveal
 */
function revealTile(x, y) {
  const playerIndex = gameState.currentPlayer - 1;
  const revealRadius = 2; // Small reveal radius for clicked tiles
  
  // Use the revealArea function from map.js module
  revealArea(gameState, x, y, revealRadius, playerIndex);
  
  // Also check if there's a unit selected
  if (selectedUnit) {
    // When a unit is selected and player clicks on fog, also allow moving to that tile
    const moveResult = canMoveToTile(selectedUnit, selectedUnit.x, selectedUnit.y, x, y, gameState.map, true);
    
    if (moveResult.canMove) {
      // Valid move - proceed with movement automatically after revealing
      moveUnit(selectedUnit, x, y);
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
  
  // Skip interaction with undiscovered tiles - fog only disappears when a unit uncovers it
  if (!clickedTile.discovered[gameState.currentPlayer - 1]) {
    showNotification("This area is covered by fog of war. Send units to explore.");
    return;
  }
  
  // If we're trying to build something
  if (gameState.selectedBuildingType) {
    buildStructure(gameState, gridX, gridY);
    renderGame();
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
    showBuildingSuggestion(clickedTile, gridX, gridY);
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
        moveUnit(selectedUnit, gridX, gridY);
        
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
    // Check if this is a valid move before attempting direct movement
    const moveResult = canMoveToTile(selectedUnit, selectedUnit.x, selectedUnit.y, gridX, gridY, gameState.map);
    
    if (moveResult.canMove) {
      // Valid move - proceed with movement
      moveUnit(selectedUnit, gridX, gridY);
      selectedUnit = null;
      gameState.selectedUnit = null;
      
      // Hide unit actions
      unitActionsContainer.style.display = 'none';
    } else {
      // Invalid move - show notification with reason
      showNotification(moveResult.reason);
    }
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
    // Reveal fog of war around the unit's new position
    const unitTypeInfo = unitTypes[unit.type];
    const visionRadius = unitTypeInfo.vision || 2; // Default to 2 if vision not specified
    revealArea(gameState, targetX, targetY, visionRadius, gameState.currentPlayer - 1);
    
    // Check if unit moved to a resource tile and automatically build the appropriate structure
    const targetTile = gameState.map[targetY][targetX];
    autoConstructResourceBuilding(targetTile, targetX, targetY);

/**
 * Automatically build the appropriate resource structure on a tile
 * @param {Object} tile - The tile to build on
 * @param {Number} x - X coordinate of the tile
 * @param {Number} y - Y coordinate of the tile
 */
function autoConstructResourceBuilding(tile, x, y) {
  const tileType = tile.type;
  const player = gameState.players[gameState.currentPlayer - 1];
  let buildingType = null;
  
  // Skip if the tile already has a building
  if (tile.building || tile.buildingInProgress) {
    return;
  }
  
// Map resource types to appropriate buildings based on the tile and resource types
  
  // Check if the tile type matches a resource type with predefined building
  const resourceInfo = resourceTileTypes[tileType];
  if (resourceInfo && resourceInfo.buildingType) {
    buildingType = resourceInfo.buildingType;
  }
  // Handle special cases for terrains
  else if (tileType === 'plains') {
    // Plains could be farm or house depending on context
    if (tile.resourceType === 'settlement') {
      buildingType = 'house'; // Settlement zone → House (Early Homes)
    } else {
      buildingType = 'farm'; // Default to farm for plains (Basic Agriculture)
    }
  }
  
  // For special resource types not in resourceTileTypes but still needing buildings
  else if (tileType === 'seaSalt') {
    buildingType = 'salt_marsh_farm'; // Saltwater Marsh → Salt Marsh Farm (Bronze Age)
  }
  else if (tileType === 'saltMarsh') {
    buildingType = 'salt_marsh_farm'; // Saltwater Marsh → Salt Marsh Farm (Wetland Agriculture)
  }
  else if (tileType === 'pearls' || tileType === 'coral') {
    buildingType = 'pearl_farm'; // Coral Reef → Pearl Farm (Aquaculture)
  }
  else if (tileType === 'silica' || tileType === 'quartz') {
    buildingType = 'silica_mine'; // Quartz Vein → Silica Mine (Silica Extraction)
  }
  
  // If no resource tile matched, return without building
  if (!buildingType) {
    return;
  }
  
  // Check if the building type is available for the current age
  const buildingInfo = buildingTypes[buildingType];
  if (!buildingInfo || (buildingInfo.age && gameState.ages.indexOf(buildingInfo.age) > gameState.ages.indexOf(player.age))) {
    // Building not available in current age
    return;
  }
  
  // Check if player has resources to build
  if (buildingInfo.cost) {
    for (const resource in buildingInfo.cost) {
      if (!player.resources[resource] || player.resources[resource] < buildingInfo.cost[resource]) {
        // Not enough resources
        return;
      }
    }
    
    // Deduct resources
    for (const resource in buildingInfo.cost) {
      player.resources[resource] -= buildingInfo.cost[resource];
    }
  }
  
  // Add to building queue
  player.buildingQueue.push({
    type: buildingType,
    x: x,
    y: y,
    progress: 0
  });
  
  // Show building in progress on the map
  tile.buildingInProgress = {
    type: buildingType,
    owner: gameState.currentPlayer,
    progress: 0
  };
  
  // Update UI
  updateResourceDisplay(gameState);
  
  showNotification(`Automatically constructing ${buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} at (${x}, ${y})`);
}
    
    // Add movement UI update here - could be added to the UI module
    const unitMP = unit.remainingMP || 0;
    const maxMP = unitTypes[unit.type].move;
    showNotification(`${unit.type} MP: ${unitMP}/${maxMP}`);
    
    // If the unit has no MP left, automatically close the unit action menu
    if (unitMP <= 0) {
      const unitActionsContainer = document.getElementById('unit-actions-container');
      if (unitActionsContainer) {
        unitActionsContainer.style.display = 'none';
      }
      
      // Also clear the selected unit
      selectedUnit = null;
      gameState.selectedUnit = null;
      
      showNotification(`${unit.type} has no movement points remaining`);
    }
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
    
    // Find and store valid movement locations
    gameState.validMovementLocations = getValidMovementLocations(selectedUnit, gameState.map);
    
    // Set game state to indicate we're in unit movement mode
    gameState.unitActionMode = 'move';
    
    // Render the game to show movement options
    renderGame();
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

// Show recommended buildings based on tile resources
function showBuildingSuggestion(tile, x, y) {
  console.log("showBuildingSuggestion called", { tile, x, y });
  if (!tile || tile.building || tile.buildingInProgress) {
    console.log("Tile not suitable for building:", { 
      hasTile: !!tile, 
      hasBuilding: tile ? !!tile.building : 'N/A', 
      hasBuildingInProgress: tile ? !!tile.buildingInProgress : 'N/A'
    });
    return;
  }
  
  // Get the terrain and resource types
  const tileType = tile.type;
  const resourceType = tile.resourceType;
  const resourceAmount = tile.resourceAmount;
  
  // Debug logging to understand what tile data we're working with
  console.log("Tile clicked:", {
    position: { x, y },
    tileType: tileType,
    resourceType: resourceType,
    resourceAmount: resourceAmount,
    tile: JSON.stringify(tile)
  });
  
  // Get player's current age and tech level
  const player = gameState.players[gameState.currentPlayer - 1];
  const playerAge = player.age;
  const ageIndex = gameState.ages.indexOf(playerAge);
  
  // Create UI for building suggestions
  const suggestionDiv = document.createElement('div');
  suggestionDiv.className = 'building-suggestion';
  
  // Title and header
  let headerHTML = `<h3>Recommended Buildings</h3>`;
  
  // Description for the tile
  let tileDescription = "Select a building type that suits this terrain:";
  
  // Determine recommended buildings based on terrain and resource
  const recommendations = [];
  
  // Mapping of terrain types to their common appearances based on color
  const terrainAppearanceMap = {
    // Green tiles are usually plains (and can support farms)
    'plains': [
      {
        type: 'farm',
        desc: 'Farms can be built on plains and grasslands to produce food.',
        importance: 'high',
        color: '#8BC34A'
      },
      {
        type: 'house',
        desc: 'Houses provide shelter and increase population capacity.',
        importance: 'medium',
        color: '#4CAF50'
      }
    ],
    
    // Dark green tiles are usually forests
    'forest': [
      {
        type: 'logging_camp',
        desc: 'Logging camps harvest wood from forests.',
        importance: 'high',
        color: '#33691E'
      },
      {
        type: 'hunters_hut',
        desc: 'Hunter\'s huts gather food from wildlife in forests.',
        importance: 'medium',
        color: '#795548'
      }
    ],
    
    // Brown/gray tiles are usually hills or mountains
    'hills': [
      {
        type: 'quarry',
        desc: 'Quarries extract stone and minerals from hills.',
        importance: 'high',
        color: '#795548'
      },
      {
        type: 'lookout_tower',
        desc: 'Lookout towers provide enhanced visibility from high ground.',
        importance: 'low',
        color: '#9E9E9E'
      }
    ],
    
    // Gray/dark gray tiles are usually mountains
    'mountain': [
      {
        type: 'mine',
        desc: 'Mines extract valuable resources from mountains.',
        importance: 'high',
        color: '#9E9E9E'
      }
    ],
    
    // Yellow/tan tiles are usually deserts
    'desert': [
      {
        type: 'trading_post',
        desc: 'Trading posts can be built in deserts for trade routes.',
        importance: 'medium',
        color: '#FFC107'
      },
      {
        type: 'outpost',
        desc: 'Outposts provide military advantages in open terrain.',
        importance: 'low',
        color: '#FFD54F'
      }
    ],
    
    // Blue tiles are usually water
    'water': [
      {
        type: 'fishing_dock',
        desc: 'Fishing docks can be built on water tiles to gather food.',
        importance: 'high',
        color: '#2196F3'
      },
      {
        type: 'port',
        desc: 'Ports enable naval trade and unit creation.',
        importance: 'medium',
        color: '#03A9F4'
      },
      {
        type: 'dockyard',
        desc: 'Dockyards build and maintain naval vessels.',
        importance: 'medium',
        color: '#0288D1'
      }
    ],
    
    // Light blue tiles are usually rivers
    'river': [
      {
        type: 'water_mill',
        desc: 'Water mills use river power for production.',
        importance: 'high',
        color: '#87CEEB'
      },
      {
        type: 'bridge',
        desc: 'Bridges allow units to cross rivers more easily.',
        importance: 'medium',
        color: '#81D4FA'
      }
    ],
    
    // Light blue/white tiles are usually tundra
    'tundra': [
      {
        type: 'hunters_hut',
        desc: 'Hunter\'s huts can gather resources in cold regions.',
        importance: 'high',
        color: '#E0FFFF'
      }
    ]
  };
  
  // Add all possible building types for the current terrain
  if (tileType === 'water' || tileType === 'ocean' || tileType === 'lake' || tileType === 'sea') {
    // For any water-type tile, recommend water-specific buildings
    recommendations.push(...terrainAppearanceMap['water']);
    
    tileDescription = "This water tile is suitable for ports, fishing docks, and other naval structures.";
  } 
  else if (tileType === 'plains') {
    // Add plains buildings
    recommendations.push(...terrainAppearanceMap['plains']);
    
    // Based on visual inspection, offer forest buildings too since some plains might look like forests
    recommendations.push(...terrainAppearanceMap['forest']);
    
    // If there are water tiles nearby, offer water-related buildings as well
    const hasWaterNearby = checkForWaterTilesNearby(x, y);
    if (hasWaterNearby) {
      recommendations.push(...terrainAppearanceMap['water']);
      tileDescription += " There's water nearby, so naval structures are also an option.";
    }
  } 
  else if (tileType === 'forest') {
    // Add forest-specific buildings
    recommendations.push(...terrainAppearanceMap['forest']);
    tileDescription = "This forested area is ideal for logging and hunting structures.";
  }
  else if (tileType === 'mountain' || tileType === 'hills') {
    // Mountain or hills terrain
    const terrainKey = tileType === 'mountain' ? 'mountain' : 'hills';
    recommendations.push(...terrainAppearanceMap[terrainKey]);
    tileDescription = `This ${tileType} terrain is ideal for mining and quarrying operations.`;
  }
  else if (terrainAppearanceMap[tileType]) {
    // If tile type is directly matched for any other terrain, use those recommendations
    recommendations.push(...terrainAppearanceMap[tileType]);
  }
  else {
    // For any unrecognized terrain, default to basic recommendations
    recommendations.push(...terrainAppearanceMap['plains']);
    console.log(`Unrecognized terrain type: ${tileType}, defaulting to plains recommendations`);
  }
  
  // If there's a specific resource on this tile, prioritize resource extractors
  if (resourceType && resourceTileTypes[resourceType]) {
    const resourceInfo = resourceTileTypes[resourceType];
    if (resourceInfo.buildingType) {
      // Insert at the beginning of recommendations to prioritize
      recommendations.unshift({
        type: resourceInfo.buildingType,
        desc: resourceInfo.description || `Extract ${resourceType} resources.`,
        importance: 'critical',
        color: '#673AB7' // Purple for resource buildings
      });
      
      tileDescription = `This tile contains ${resourceType} resources. Building a specialized structure will extract them efficiently.`;
    }
  }
  
  // Generate HTML for building options
  let optionsHTML = '';
  
  // Filter to show only buildings available in current age
  const availableRecommendations = recommendations.filter(rec => {
    const buildingInfo = buildingTypes[rec.type];
    return buildingInfo && (!buildingInfo.age || gameState.ages.indexOf(buildingInfo.age) <= ageIndex);
  });
  
  if (availableRecommendations.length === 0) {
    // If no specific recommendations, show default building options
    availableRecommendations.push({
      type: 'farm',
      desc: 'General purpose farm for food production.',
      importance: 'medium',
      color: '#8BC34A'
    });
    
    availableRecommendations.push({
      type: 'house',
      desc: 'Basic housing to increase population capacity.',
      importance: 'medium',
      color: '#4CAF50'
    });
  }
  
  // Sort by importance
  const importanceValues = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1
  };
  
  availableRecommendations.sort((a, b) => 
    importanceValues[b.importance] - importanceValues[a.importance]
  );
  
  // Generate building cards
  availableRecommendations.forEach(rec => {
    const buildingInfo = buildingTypes[rec.type];
    if (!buildingInfo) return;
    
    // Format costs for display
    let costText = '';
    if (buildingInfo.cost) {
      for (const resource in buildingInfo.cost) {
        costText += `${buildingInfo.cost[resource]} ${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}, `;
      }
      costText = costText.slice(0, -2); // Remove trailing comma
    }
    
    // Check if player can afford it
    let canAfford = true;
    for (const resource in buildingInfo.cost) {
      if (!player.resources[resource] || player.resources[resource] < buildingInfo.cost[resource]) {
        canAfford = false;
        break;
      }
    }
    
    // Importance indicator
    const importanceColors = {
      'critical': '#B71C1C', // Dark red
      'high': '#FFA000',     // Orange
      'medium': '#388E3C',   // Green
      'low': '#1976D2'       // Blue
    };
    
    const importanceColor = importanceColors[rec.importance] || '#757575';
    
    optionsHTML += `
      <div class="building-option" style="border-left-color: ${importanceColor};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4>${rec.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
          <div class="importance-tag importance-${rec.importance}">${rec.importance.toUpperCase()}</div>
        </div>
        <p>${rec.desc}</p>
        <div class="building-cost">Cost: ${costText || 'Free'}</div>
        <button class="build-option" data-building="${rec.type}" ${!canAfford ? 'disabled' : ''}>
          ${canAfford ? 'Build Now' : 'Cannot Afford'}
        </button>
      </div>
    `;
  });
  
  // Assemble the complete suggestion UI
  suggestionDiv.innerHTML = `
    ${headerHTML}
    <p>${tileDescription}</p>
    ${optionsHTML}
    <div style="text-align: center; margin-top: 15px;">
      <button id="close-suggestion">Cancel</button>
    </div>
  `;
  
  // Remove any existing suggestion
  const existingSuggestion = document.querySelector('.building-suggestion');
  if (existingSuggestion) {
    existingSuggestion.remove();
  }
  
  // Add the suggestion to the document
  document.body.appendChild(suggestionDiv);
  
  // Make the suggestion box draggable
  makeDraggable(suggestionDiv);
  
  // Add event listeners to all build buttons
  document.querySelectorAll('.build-option').forEach(button => {
    button.addEventListener('click', () => {
      const buildingType = button.getAttribute('data-building');
      startBuilding(gameState, buildingType);
      suggestionDiv.remove();
    });
  });
  
  // Add event listener to close button
  document.getElementById('close-suggestion').addEventListener('click', () => {
    suggestionDiv.remove();
  });
  
  // Add a small hint about draggability
  const dragHint = document.createElement('div');
  dragHint.style.position = 'absolute';
  dragHint.style.top = '8px';
  dragHint.style.right = '8px';
  dragHint.style.fontSize = '10px';
  dragHint.style.color = '#718096';
  dragHint.textContent = 'Drag to move';
  dragHint.style.cursor = 'move';
  suggestionDiv.appendChild(dragHint);
}

/**
 * Check if there are water tiles near the given location
 * @param {Number} x - X coordinate to check
 * @param {Number} y - Y coordinate to check
 * @returns {Boolean} - True if water is found within 2 tiles
 */
function checkForWaterTilesNearby(x, y) {
  // Check in a 5x5 area around the position
  const radius = 2;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const checkX = x + dx;
      const checkY = y + dy;
      
      // Skip if out of bounds
      if (checkX < 0 || checkY < 0 || 
          checkX >= gameState.mapSize || 
          checkY >= gameState.mapSize) {
        continue;
      }
      
      const tile = gameState.map[checkY][checkX];
      
      // Check for water tiles
      if (tile.type === 'water' || tile.type === 'river' || 
          tile.type === 'ocean' || tile.type === 'lake') {
        return true;
      }
      
      // Check blue color indicators in tile properties
      if (tile.color && (
          tile.color === '#2196F3' || 
          tile.color === '#03A9F4' || 
          tile.color === '#00BCD4' ||
          tile.color === '#87CEEB' ||
          tile.color === '#81D4FA')) {
        return true;  
      }
    }
  }
  
  return false;
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
  console.log("Starting new game from UI button");
  // Create a confirmation dialog
  if (confirm("Start a new game? Your current progress will be lost.")) {
    try {
      console.log("Resetting game state");
      
      // Hide the game container first
      const gameContainer = document.getElementById('gameContainer');
      if (gameContainer) {
        gameContainer.style.display = 'none';
      }
      
      // Show loading indicator
      const loadingElement = document.getElementById('loading');
      if (loadingElement) {
        loadingElement.style.display = 'block';
        console.log("Loading indicator shown");
      }
      
      // Properly remove any existing startMenuOverlay to ensure a clean start
      const existingOverlay = document.getElementById('startMenuOverlay');
      if (existingOverlay) {
        document.body.removeChild(existingOverlay);
        console.log("Removed existing start menu overlay");
      }
      
      // Reset game variables
      gameState = createInitialGameState();
      window.gameState = gameState;
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
      
      // Clean up any existing game elements
      if (canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      if (minimap) {
        minimapCtx.clearRect(0, 0, minimap.width, minimap.height);
      }
      
      // Directly call initStartMenu instead of using setTimeout
      console.log("Initializing start menu...");
      initStartMenu(startGame);
      
      // Hide loading indicator
      setTimeout(() => {
        if (loadingElement) {
          loadingElement.style.display = 'none';
          console.log("Loading indicator hidden");
        }
      }, 500);
      
    } catch (error) {
      console.error("Critical error in startNewGameFromUI:", error);
      alert("An error occurred. Please refresh the page.");
    }
  } else {
    console.log("New game cancelled by user");
  }
};

// Make an element draggable
function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  // Ensure element is properly positioned for dragging
  if (window.getComputedStyle(element).position === 'static') {
    element.style.position = 'fixed';
  }
  
  // Remove any initial animation to avoid conflicts
  setTimeout(() => {
    element.style.animation = 'none';
  }, 300); // Wait for initial animation to complete
  
  // Find header element for drag handle
  const header = element.querySelector('h3') || element;
  
  // Add visual cues for draggable element
  header.style.cursor = 'move';
  header.style.userSelect = 'none';
  header.style.touchAction = 'none'; // Better touch support
  
  // Add a grab indicator to the header
  const dragIndicator = document.createElement('div');
  dragIndicator.textContent = '≡';
  dragIndicator.style.position = 'absolute';
  dragIndicator.style.top = '8px';
  dragIndicator.style.left = '10px';
  dragIndicator.style.fontSize = '16px';
  dragIndicator.style.color = '#718096';
  dragIndicator.style.cursor = 'move';
  header.appendChild(dragIndicator);
  
  // Setup event listeners
  header.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // Add active states
    header.style.backgroundColor = '#f8f9fa';
    
    // Register events for drag and release
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    
    console.log("Drag started"); // Debug logging
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // Get current position
    const rect = element.getBoundingClientRect();
    
    // Set the element's new position, ensuring it stays within viewport
    const newTop = rect.top - pos2;
    const newLeft = rect.left - pos1;
    
    // Check boundaries to keep within viewport (with small buffer)
    const buffer = 20;
    const maxX = window.innerWidth - rect.width - buffer;
    const maxY = window.innerHeight - rect.height - buffer;
    
    // Apply new position
    element.style.top = Math.max(buffer, Math.min(maxY, newTop)) + 'px';
    element.style.left = Math.max(buffer, Math.min(maxX, newLeft)) + 'px';
    
    // Force right:auto to prevent conflicts with initial positioning
    element.style.right = 'auto';
    
    console.log("Dragging: ", element.style.top, element.style.left); // Debug logging
  }

  function closeDragElement() {
    // Remove active states
    header.style.backgroundColor = '';
    
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
    
    console.log("Drag ended"); // Debug logging
  }
}

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
