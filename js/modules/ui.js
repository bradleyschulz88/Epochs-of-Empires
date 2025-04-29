import { resourceIcons, resourcesByAge, resourceTileTypes, getSimpleResourcesByAge } from './resources.js';
import { terrainTypes } from './terrain.js';
import { unitTypes } from './units.js';
import { technologies } from './technologies.js';
import { buildingTypes, buildingCategories, resourceExtractors } from './buildings.js';
import { revealArea } from './map.js';

// Constants for hexagon drawing
const HEX_SIZE = 30; // Size of hexagon (distance from center to corner)

/**
 * Draw a hexagon at the specified position
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Number} x - Center X coordinate
 * @param {Number} y - Center Y coordinate
 * @param {Number} size - Hex size (distance from center to corner)
 * @param {String} fillColor - Color to fill the hexagon
 */
function drawHexagon(ctx, x, y, size, fillColor) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = 2 * Math.PI / 6 * i;
    const pointX = x + size * Math.cos(angle);
    const pointY = y + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      ctx.lineTo(pointX, pointY);
    }
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
}

/**
 * Draw a hexagon outline at the specified position
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Number} x - Center X coordinate
 * @param {Number} y - Center Y coordinate
 * @param {Number} size - Hex size (distance from center to corner)
 */
function drawHexagonOutline(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = 2 * Math.PI / 6 * i;
    const pointX = x + size * Math.cos(angle);
    const pointY = y + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      ctx.lineTo(pointX, pointY);
    }
  }
  ctx.closePath();
  ctx.stroke();
}

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

// Update the resource display
export function updateResourceDisplay(gameState) {
  const container = document.getElementById('resourceContainer');
  container.innerHTML = '';
  
  const currentPlayer = gameState.players[gameState.currentPlayer - 1];
  const availableResources = getSimpleResourcesByAge(currentPlayer.age);
  
  // Create all possible resources, but only show available ones
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
    
    resourceElement.title = resourceIcons[resourceType];
    
    // Add click event to filter buildings for this resource type
    if (isAvailable) {
      resourceElement.style.cursor = 'pointer';
      resourceElement.addEventListener('click', () => {
        showBuildingsByResourceType(gameState, resourceType);
      });
    }
    
    container.appendChild(resourceElement);
  }
  
  // Update population display
  updatePopulationDisplay(gameState);
}

// Function to show buildings available for a specific resource type
function showBuildingsByResourceType(gameState, resourceType) {
  const buildingButtons = document.querySelector('.building-buttons');
  buildingButtons.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  const playerAge = player.age;
  
  console.log(`Filtering buildings for resource: ${resourceType} in age: ${playerAge}`);
  
  // Get the building types that can extract this resource
  const extractorTypes = resourceExtractors[resourceType] || [];
  
  if (extractorTypes.length === 0) {
    const message = document.createElement('div');
    message.className = 'no-buildings-message';
    message.textContent = `No buildings available to produce ${resourceType}`;
    buildingButtons.appendChild(message);
    return;
  }
  
  let buildingCount = 0;
  
  // Only show buildings that are extractors for this resource type and available in current age
  for (const buildingType of extractorTypes) {
    const building = buildingTypes[buildingType];
    
    // Skip buildings from future ages
    if (building.age && gameState.ages.indexOf(building.age) > gameState.ages.indexOf(playerAge)) {
      continue;
    }
    
    buildingCount++;
    
    // Format cost text
    let costText = '';
    for (const resource in building.cost) {
      costText += `${building.cost[resource]} ${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}, `;
    }
    costText = costText.slice(0, -2); // Remove trailing comma
    
    // Create button
    const button = document.createElement('button');
    button.textContent = `${buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${costText})`;
    button.onclick = () => window.startBuilding(buildingType);
    
    // Check if player can afford it
    let canAfford = true;
    let missingResources = [];
    
    for (const resource in building.cost) {
      const required = building.cost[resource];
      const available = player.resources[resource] || 0;
      
      if (available < required) {
        canAfford = false;
        missingResources.push(`${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: ${available}/${required}`);
      }
    }
    
    button.disabled = !canAfford;
    
    // Add tooltip for disabled buttons
    if (!canAfford) {
      button.title = `Insufficient resources:\n${missingResources.join('\n')}`;
    } else {
      button.title = building.description || `Build a ${buildingType.replace(/_/g, ' ')}`;
    }
    
    buildingButtons.appendChild(button);
  }
  
  // Display a message if no buildings are available for this resource
  if (buildingCount === 0) {
    const message = document.createElement('div');
    message.className = 'no-buildings-message';
    message.textContent = `No buildings available to produce ${resourceType} in the ${playerAge}`;
    buildingButtons.appendChild(message);
  }
  
  // Add a "Show All Buildings" link
  const showAllLink = document.createElement('div');
  showAllLink.className = 'show-all-buildings';
  showAllLink.textContent = 'Show All Buildings';
  showAllLink.style.cursor = 'pointer';
  showAllLink.style.marginTop = '10px';
  showAllLink.style.textAlign = 'center';
  showAllLink.style.textDecoration = 'underline';
  showAllLink.addEventListener('click', () => {
    updateBuildingButtons(gameState, window.startBuilding);
  });
  buildingButtons.appendChild(showAllLink);
}

// Update the population display
export function updatePopulationDisplay(gameState) {
  const player = gameState.players[gameState.currentPlayer - 1];
  
  // Update population counts
  document.getElementById('populationCount').textContent = Math.floor(player.totalPopulation);
  document.getElementById('populationCap').textContent = player.populationCap;
  
  // Update happiness and health
  document.getElementById('happinessLevel').textContent = player.happiness;
  document.getElementById('healthLevel').textContent = player.health;
  
  // Visual indicator for overpopulation
  const popContainer = document.querySelector('.population-container');
  if (player.totalPopulation >= player.populationCap) {
    popContainer.classList.add('overpopulated');
  } else {
    popContainer.classList.remove('overpopulated');
  }
}

// Update the upkeep display
export function updateUpkeepDisplay(gameState) {
  const upkeepList = document.getElementById('upkeepList');
  const player = gameState.players[gameState.currentPlayer - 1];
  
  let upkeepText = '';
  let hasUpkeep = false;
  
  for (const resource in player.upkeep) {
    if (player.upkeep[resource] > 0) {
      hasUpkeep = true;
      upkeepText += `${resourceIcons[resource]} ${resource.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${player.upkeep[resource]}/turn, `;
    }
  }
  
  if (hasUpkeep) {
    upkeepList.innerHTML = upkeepText.slice(0, -2); // Remove trailing comma and space
  } else {
    upkeepList.innerHTML = 'None';
  }
}

// Update building buttons display with resource costs
export function updateBuildingButtons(gameState, startBuilding) {
  // Clear any previous content first
  const buildingButtons = document.querySelector('.building-buttons');
  if (buildingButtons) {
    console.log("Building buttons container found with dimensions:", 
                buildingButtons.offsetWidth, "x", buildingButtons.offsetHeight);
    console.log("Building buttons container style:", buildingButtons.style.display, 
                buildingButtons.style.visibility, buildingButtons.style.opacity);
    
    // First completely clear the container
    buildingButtons.innerHTML = '';
    
    // Force display properties to ensure visibility
    buildingButtons.style.display = 'block';
    buildingButtons.style.visibility = 'visible';
    buildingButtons.style.opacity = '1';
    buildingButtons.style.maxHeight = 'none';
    buildingButtons.style.minHeight = '400px';
    buildingButtons.style.position = 'relative';
    buildingButtons.style.zIndex = '100';
    buildingButtons.style.backgroundColor = 'white';
    buildingButtons.style.padding = '15px';
    buildingButtons.style.border = '2px solid #4a5568';
    buildingButtons.style.borderRadius = '8px';
    buildingButtons.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    buildingButtons.style.margin = '20px 0';
    
    // Log to check if the function is being called
    console.log("Building menu container found, creating menu...");
    
    // Add a debug message to the container to ensure it's visible
    const debugMsg = document.createElement('div');
    debugMsg.style.padding = '10px';
    debugMsg.style.backgroundColor = '#f8f9fa';
    debugMsg.style.marginBottom = '10px';
    debugMsg.style.borderRadius = '4px';
    debugMsg.style.fontWeight = 'bold';
    debugMsg.textContent = 'Building menu container is active';
    buildingButtons.appendChild(debugMsg);
    
    // Create simple buttons first as a fallback
    const player = gameState.players[gameState.currentPlayer - 1];
    const playerAge = player.age;
    
    // Add at least one guaranteed building
    const farmButton = document.createElement('button');
    farmButton.textContent = 'Farm (50 Wood)';
    farmButton.onclick = () => startBuilding('farm');
    buildingButtons.appendChild(farmButton);
    
    const houseButton = document.createElement('button');
    houseButton.textContent = 'House (40 Wood, 20 Stone)';
    houseButton.onclick = () => startBuilding('house');
    buildingButtons.appendChild(houseButton);
    
    // Try to create the building menu tabs
    try {
      createBuildingMenuTabs(gameState, startBuilding);
    } catch (error) {
      console.error("Error creating building menu tabs:", error);
      // Show the error in the UI as well
      const errorMsg = document.createElement('div');
      errorMsg.style.padding = '10px';
      errorMsg.style.backgroundColor = '#f8d7da';
      errorMsg.style.color = '#721c24';
      errorMsg.style.marginTop = '10px';
      errorMsg.style.borderRadius = '4px';
      errorMsg.textContent = `Error creating menu: ${error.message}`;
      buildingButtons.appendChild(errorMsg);
    }
    
    // Ensure the container is visible after creation with multiple attempts
    setTimeout(() => {
      buildingButtons.style.display = 'block';
      buildingButtons.style.visibility = 'visible';
      buildingButtons.style.opacity = '1';
      console.log("Ensuring building menu visibility after timeout");
    }, 50);
    
    setTimeout(() => {
      console.log("Second visibility check:", 
                  buildingButtons.offsetWidth, "x", buildingButtons.offsetHeight,
                  buildingButtons.style.display, buildingButtons.style.visibility);
      
      if (buildingButtons.offsetHeight < 100) {
        console.warn("Building menu may still be hidden - forcing display properties again");
        buildingButtons.style.display = 'block !important';
        buildingButtons.style.visibility = 'visible !important';
        document.getElementById('actions-tab').style.overflowY = 'visible';
      }
    }, 500);
  } else {
    console.error("Building buttons container not found");
    
    // Try to find the actions tab and create the container
    const actionsTab = document.getElementById('actions-tab');
    if (actionsTab) {
      console.log("Actions tab found, creating new building buttons container");
      
      // Create building instructions header
      const header = document.createElement('h3');
      header.textContent = 'Construct Building';
      header.style.marginTop = '20px';
      header.style.padding = '10px';
      header.style.background = '#4a5568';
      header.style.color = 'white';
      header.style.borderRadius = '8px';
      header.style.textAlign = 'center';
      actionsTab.appendChild(header);
      
      // Create container for building buttons
      const newBuildingButtons = document.createElement('div');
      newBuildingButtons.className = 'building-buttons';
      newBuildingButtons.style.display = 'block';
      newBuildingButtons.style.visibility = 'visible';
      newBuildingButtons.style.minHeight = '400px';
      newBuildingButtons.style.maxHeight = 'none';
      newBuildingButtons.style.padding = '15px';
      newBuildingButtons.style.backgroundColor = 'white';
      newBuildingButtons.style.borderRadius = '8px';
      newBuildingButtons.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
      newBuildingButtons.style.margin = '15px 0';
      newBuildingButtons.style.position = 'relative';
      newBuildingButtons.style.zIndex = '100';
      
      // Add a notice that this is a newly created container
      const notice = document.createElement('div');
      notice.textContent = 'Building menu container recreated';
      notice.style.padding = '10px';
      notice.style.backgroundColor = '#e2e8f0';
      notice.style.marginBottom = '10px';
      notice.style.borderRadius = '4px';
      newBuildingButtons.appendChild(notice);
      
      // Add some basic building options
      const farmButton = document.createElement('button');
      farmButton.textContent = 'Farm (50 Wood)';
      farmButton.onclick = () => startBuilding('farm');
      newBuildingButtons.appendChild(farmButton);
      
      actionsTab.appendChild(newBuildingButtons);
      
      // Try to update with the proper menu
      try {
        updateBuildingButtonsByCategory(gameState, 'all', startBuilding);
      } catch (error) {
        console.error("Failed to update building buttons by category:", error);
      }
    }
  }
}

// Create category tabs for building menu
// Cache for storing building data by age
const buildingMenuCache = {};

function createBuildingMenuTabs(gameState, startBuilding) {
  const buildingMenu = document.querySelector('.building-buttons');
  buildingMenu.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  const playerAge = player.age;
  const playerAgeIndex = gameState.ages.indexOf(playerAge);
  
  console.log(`Creating building menu for ${playerAge} (index: ${playerAgeIndex})`);
  
  // Search and filter controls
  const searchFilters = document.createElement('div');
  searchFilters.className = 'building-search-filters';
  
  // Search input
  const searchContainer = document.createElement('div');
  searchContainer.className = 'building-search';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search buildings...';
  searchInput.setAttribute('aria-label', 'Search buildings');
  searchInput.addEventListener('input', () => {
    filterBuildings(gameState, searchInput.value);
  });
  
  searchContainer.appendChild(searchInput);
  searchFilters.appendChild(searchContainer);
  
  // Filter toggles
  const filterToggles = document.createElement('div');
  filterToggles.className = 'filter-toggles';
  
  // Show locked buildings toggle
  const lockedFilter = document.createElement('label');
  lockedFilter.className = 'filter-toggle';
  
  const lockedCheckbox = document.createElement('input');
  lockedCheckbox.type = 'checkbox';
  lockedCheckbox.checked = true;
  lockedCheckbox.id = 'show-locked';
  lockedCheckbox.setAttribute('aria-label', 'Show locked buildings');
  lockedCheckbox.addEventListener('change', () => {
    document.querySelectorAll('.building-locked, .building-tech-locked').forEach(card => {
      card.style.display = lockedCheckbox.checked ? 'flex' : 'none';
    });
  });
  
  lockedFilter.appendChild(lockedCheckbox);
  lockedFilter.appendChild(document.createTextNode('Show Locked Buildings'));
  
  // Show obsolete buildings toggle
  const obsoleteFilter = document.createElement('label');
  obsoleteFilter.className = 'filter-toggle';
  
  const obsoleteCheckbox = document.createElement('input');
  obsoleteCheckbox.type = 'checkbox';
  obsoleteCheckbox.checked = false;
  obsoleteCheckbox.id = 'show-obsolete';
  obsoleteCheckbox.setAttribute('aria-label', 'Show obsolete buildings');
  obsoleteCheckbox.addEventListener('change', () => {
    document.querySelectorAll('.building-obsolete').forEach(card => {
      card.style.display = obsoleteCheckbox.checked ? 'flex' : 'none';
    });
  });
  
  obsoleteFilter.appendChild(obsoleteCheckbox);
  obsoleteFilter.appendChild(document.createTextNode('Show Obsolete Buildings'));
  
  filterToggles.appendChild(lockedFilter);
  filterToggles.appendChild(obsoleteFilter);
  searchFilters.appendChild(filterToggles);
  buildingMenu.appendChild(searchFilters);
  
  // Age navigation
  const ageNavigation = document.createElement('div');
  ageNavigation.className = 'age-navigation';
  
  const prevAgeButton = document.createElement('button');
  prevAgeButton.className = 'age-nav-button';
  prevAgeButton.textContent = '← Previous Age';
  prevAgeButton.disabled = playerAgeIndex <= 0;
  prevAgeButton.onclick = () => {
    if (playerAgeIndex > 0) {
      showBuildingsFromAge(gameState, gameState.ages[playerAgeIndex - 1], startBuilding, true);
    }
  };
  
  const ageDisplay = document.createElement('span');
  ageDisplay.className = 'current-age-display';
  ageDisplay.textContent = playerAge;
  
  const nextAgeButton = document.createElement('button');
  nextAgeButton.className = 'age-nav-button';
  nextAgeButton.textContent = 'Next Age →';
  nextAgeButton.disabled = playerAgeIndex >= gameState.ages.length - 1;
  nextAgeButton.onclick = () => {
    if (playerAgeIndex < gameState.ages.length - 1) {
      showBuildingsFromAge(gameState, gameState.ages[playerAgeIndex + 1], startBuilding, true);
    }
  };
  
  ageNavigation.appendChild(prevAgeButton);
  ageNavigation.appendChild(ageDisplay);
  ageNavigation.appendChild(nextAgeButton);
  buildingMenu.appendChild(ageNavigation);
  
  // Create tab container
  const tabContainer = document.createElement('div');
  tabContainer.className = 'building-tabs';
  tabContainer.setAttribute('role', 'tablist');
  tabContainer.setAttribute('aria-label', 'Building categories');
  buildingMenu.appendChild(tabContainer);
  
  // Create content container
  const contentContainer = document.createElement('div');
  contentContainer.className = 'building-tabs-content';
  contentContainer.setAttribute('role', 'tabpanel');
  contentContainer.setAttribute('aria-live', 'polite');
  buildingMenu.appendChild(contentContainer);
  
  // Get building categories for the current age
  const categoryLabels = {
    "resource_node": "Resource Production",
    "production": "Military",
    "economic": "Economy",
    "defense": "Defense",
    "housing": "Housing",
    "city_center": "City Centers"
  };
  
  // Check which categories have buildings available in the current age
  const availableCategories = new Set();
  
  for (const buildingType in buildingTypes) {
    const building = buildingTypes[buildingType];
    const buildingAgeIndex = gameState.ages.indexOf(building.age);
    
    // Skip HQ as it's placed at start
    if (buildingType === 'hq') continue;
    
    // Include all buildings up to and including the current age
    if (buildingAgeIndex <= playerAgeIndex) {
      availableCategories.add(building.category);
    }
  }
  
  // Create 'All' tab first
  const allTab = document.createElement('div');
  allTab.className = 'building-tab active';
  allTab.textContent = 'All Buildings';
  allTab.dataset.category = 'all';
  allTab.setAttribute('role', 'tab');
  allTab.setAttribute('aria-selected', 'true');
  allTab.setAttribute('aria-controls', 'building-tab-all');
  allTab.setAttribute('tabindex', '0');
  
  allTab.addEventListener('click', () => {
    document.querySelectorAll('.building-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
    });
    allTab.classList.add('active');
    allTab.setAttribute('aria-selected', 'true');
    allTab.setAttribute('tabindex', '0');
    contentContainer.setAttribute('aria-labelledby', `building-tab-all`);
    updateBuildingTabContent(gameState, 'all', startBuilding);
  });
  
  // Add keyboard navigation for tab
  allTab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      allTab.click();
    }
  });
  
  tabContainer.appendChild(allTab);
  
  // Create tabs only for categories that have buildings
  availableCategories.forEach(category => {
    const tab = document.createElement('div');
    tab.className = 'building-tab';
    tab.textContent = categoryLabels[category] || category;
    tab.dataset.category = category;
    
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      document.querySelectorAll('.building-tab').forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Update content
      updateBuildingTabContent(gameState, category, startBuilding);
    });
    
    tabContainer.appendChild(tab);
  });
  
// Initialize with 'All' selected
  updateBuildingTabContent(gameState, 'all', startBuilding);
}

// Filter buildings by search term
function filterBuildings(gameState, searchTerm) {
  const searchTermLower = searchTerm.toLowerCase();
  const buildingCards = document.querySelectorAll('.building-card');
  
  buildingCards.forEach(card => {
    const buildingName = card.querySelector('h4').textContent.toLowerCase();
    const buildingDescription = card.querySelector('.building-tooltip').textContent.toLowerCase();
    
    if (searchTerm === '' || 
        buildingName.includes(searchTermLower) || 
        buildingDescription.includes(searchTermLower)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
  
  // Hide age headers with no visible buildings
  const ageHeaders = document.querySelectorAll('.building-age-header');
  ageHeaders.forEach(header => {
    // Find next header or end of container
    let sibling = header.nextElementSibling;
    let visibleBuildings = 0;
    
    while (sibling && !sibling.classList.contains('building-age-header')) {
      if (sibling.classList.contains('building-card') && 
          sibling.style.display !== 'none') {
        visibleBuildings++;
      }
      sibling = sibling.nextElementSibling;
    }
    
    header.style.display = visibleBuildings > 0 ? 'block' : 'none';
  });
}

// Update building tab content
function updateBuildingTabContent(gameState, category, startBuilding, isPreview = false) {
  const contentContainer = document.querySelector('.building-tabs-content');
  contentContainer.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  const playerAge = player.age;
  const playerAgeIndex = gameState.ages.indexOf(playerAge);
  
  console.log(`Updating building content for category: ${category}, age: ${playerAge}`);
  
  // Get player technologies for prerequisite checks
  const playerTechs = player.technologies || [];
  
  // Create details container that will hold grid and sidebar
  const detailsContainer = document.createElement('div');
  detailsContainer.className = 'details-container';
  contentContainer.appendChild(detailsContainer);
  
  // Create grid container for building cards
  const buildingGrid = document.createElement('div');
  buildingGrid.className = 'building-grid';
  detailsContainer.appendChild(buildingGrid);
  
  // Create details sidebar (initially empty)
  const detailsSidebar = document.createElement('div');
  detailsSidebar.className = 'building-details-sidebar';
  detailsSidebar.innerHTML = '<div class="details-placeholder">Select a building to see details</div>';
  detailsSidebar.setAttribute('aria-live', 'polite');
  detailsContainer.appendChild(detailsSidebar);
  
  // Count of buildings displayed
  let buildingCount = 0;
  
  // Group buildings by age for better organization
  const buildingsByAge = {};
  
  // First pass to organize buildings by age
  for (const buildingType in buildingTypes) {
    // Skip HQ as it's placed at start
    if (buildingType === 'hq') continue;
    
    const building = buildingTypes[buildingType];
    
    // Filter by category if not showing all
    if (category !== 'all' && building.category !== category) continue;
    
    const buildingAge = building.age || 'Stone Age';
    
    if (!buildingsByAge[buildingAge]) {
      buildingsByAge[buildingAge] = [];
    }
    
    buildingsByAge[buildingAge].push({buildingType, building});
  }
  
  // Then display buildings ordered by age
  for (const age of gameState.ages) {
    const buildings = buildingsByAge[age];
    if (!buildings || buildings.length === 0) continue;
    
    const ageHeader = document.createElement('h3');
    ageHeader.className = 'building-age-header';
    ageHeader.textContent = age;
    buildingGrid.appendChild(ageHeader);
    
    const ageIndex = gameState.ages.indexOf(age);
    const ageStatus = ageIndex < playerAgeIndex ? 'past' : (ageIndex === playerAgeIndex ? 'current' : 'future');
    
    for (const {buildingType, building} of buildings) {
      // Create building card
      const card = document.createElement('div');
      card.className = 'building-card';
      
      // Determine building lock state
      let lockState = 'unlocked';
      let lockReason = '';
      const buildingAgeIndex = gameState.ages.indexOf(building.age);
      
      if (buildingAgeIndex > playerAgeIndex) {
        lockState = 'locked'; // Future age building
        lockReason = `Available in ${building.age}`;
      } else if (building.techRequired && !playerTechs.includes(building.techRequired)) {
        lockState = 'tech-locked'; // Missing tech prerequisite
        lockReason = `Requires ${building.techRequired}`;
      } else if (ageStatus === 'past' && ageIndex < playerAgeIndex - 1) {
        lockState = 'obsolete'; // Building from 2+ ages ago
        lockReason = 'Obsolete';
      }
      
      // Add lock state class
      card.classList.add(`building-${lockState}`);
      
      // Building name
      const buildingName = document.createElement('h4');
      buildingName.textContent = buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      card.appendChild(buildingName);
      
      // Building icon (placeholder)
      const icon = document.createElement('div');
      icon.className = 'building-icon';
      icon.innerHTML = `<span class="icon-placeholder">${buildingType.charAt(0).toUpperCase()}</span>`;
      
      // Add lock indicator if locked
      if (lockState === 'locked' || lockState === 'tech-locked') {
        const lockIcon = document.createElement('div');
        lockIcon.className = 'lock-icon';
        lockIcon.textContent = '🔒';
        icon.appendChild(lockIcon);
      } else if (lockState === 'obsolete') {
        const obsoleteIcon = document.createElement('div');
        obsoleteIcon.className = 'obsolete-icon';
        obsoleteIcon.textContent = '⚠️';
        icon.appendChild(obsoleteIcon);
      }
      
      card.appendChild(icon);
      
      // Building prerequisites
      if (building.techRequired) {
        const prereqDiv = document.createElement('div');
        prereqDiv.className = 'building-prerequisites';
        prereqDiv.textContent = `Requires: ${building.techRequired}`;
        card.appendChild(prereqDiv);
      }
      
      // Building cost with affordability indicators
      const costDiv = document.createElement('div');
      costDiv.className = 'building-cost';
      
      for (const resource in building.cost) {
        const required = building.cost[resource];
        const available = player.resources[resource] || 0;
        const isAffordable = available >= required;
        
        const costItem = document.createElement('div');
        costItem.className = `building-cost-item ${isAffordable ? 'affordable' : 'unaffordable'}`;
        
        // Get resource icon
        const resourceIcon = resourceIcons[resource] || '📦';
        
        costItem.innerHTML = `${resourceIcon} ${building.cost[resource]}`;
        
        // Add tooltip showing available/required resources
        costItem.title = `${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: ${available}/${required}`;
        
        costDiv.appendChild(costItem);
      }
      
      card.appendChild(costDiv);
      
      // Building yields/production
      if (building.production) {
        const yieldsDiv = document.createElement('div');
        yieldsDiv.className = 'building-yields';
        
        let yieldsText = 'Yields: ';
        for (const resource in building.production) {
          const resourceIcon = resourceIcons[resource] || '📦';
          yieldsText += `${resourceIcon} ${building.production[resource]}, `;
        }
        
        yieldsDiv.textContent = yieldsText.slice(0, -2); // Remove trailing comma
        card.appendChild(yieldsDiv);
      }
      
      // Help icon for more info
      const helpIcon = document.createElement('div');
      helpIcon.className = 'building-help';
      helpIcon.textContent = '?';
      helpIcon.title = building.description || `${buildingType.replace(/_/g, ' ')}`;
      card.appendChild(helpIcon);
      
      // Enhanced rich tooltip with more detailed information
      const tooltip = document.createElement('div');
      tooltip.className = 'building-tooltip';
      
      let tooltipHTML = `
        <strong>${buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong><br>
        <div style="margin: 8px 0; font-size: 0.9em; opacity: 0.9;">Age: ${building.age || 'Stone Age'}</div>`;
      
      if (building.description) {
        tooltipHTML += `<div style="margin-bottom: 10px; line-height: 1.4;">${building.description}</div>`;
      }
      
      // Building stats
      tooltipHTML += '<div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px; margin: 5px 0;">';
      
      if (building.production) {
        tooltipHTML += '<div><strong>Produces:</strong> ';
        for (const resource in building.production) {
          const resourceIcon = resourceIcons[resource] || '📦';
          tooltipHTML += `${resourceIcon} ${building.production[resource]} ${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}, `;
        }
        tooltipHTML = tooltipHTML.slice(0, -2) + '</div>'; // Remove trailing comma
      }
      
      if (building.defense) {
        tooltipHTML += `<div><strong>Defense:</strong> ${building.defense}</div>`;
      }
      
      if (building.vision) {
        tooltipHTML += `<div><strong>Vision Range:</strong> ${building.vision} tiles</div>`;
      }
      
      if (building.buildTime) {
        tooltipHTML += `<div><strong>Build Time:</strong> ${building.buildTime} ${building.buildTime === 1 ? 'turn' : 'turns'}</div>`;
      }
      
      tooltipHTML += '</div>';
      
      // Requirements section
      if (building.techRequired || building.terrainRequirement || building.requiresCity) {
        tooltipHTML += '<div style="margin-top: 8px;"><strong>Requirements:</strong>';
        
        if (building.techRequired) {
          tooltipHTML += `<div>🔬 ${building.techRequired}</div>`;
        }
        
        if (building.terrainRequirement) {
          tooltipHTML += `<div>🏞️ ${building.terrainRequirement.join(' or ')} terrain</div>`;
        }
        
        if (building.requiresCity) {
          tooltipHTML += '<div>🏙️ Must be built within city borders</div>';
        }
        
        tooltipHTML += '</div>';
      }
      
      // Status section
      if (lockReason) {
        tooltipHTML += `<div style="margin-top: 8px; color: ${lockState === 'locked' ? '#FC8181' : (lockState === 'tech-locked' ? '#F6BD60' : '#A0AEC0')}">
          <strong>Status:</strong> ${lockReason}
        </div>`;
      }
      
      tooltip.innerHTML = tooltipHTML;
      
      card.appendChild(tooltip);
      
      // Make all buildings clickable to show details, but only unlocked ones can be built
      card.addEventListener('click', () => {
        // Update sidebar with details for this building
        updateBuildingDetailsSidebar(detailsSidebar, buildingType, building, player);
        
        // Highlight selected card and remove highlight from others
        document.querySelectorAll('.building-card').forEach(c => c.classList.remove('selected-building'));
        card.classList.add('selected-building');
        
        if (lockState === 'unlocked' && !isPreview) {
          // Check if player can afford it
          let canAfford = true;
          let missingResources = [];
          
          for (const resource in building.cost) {
            const required = building.cost[resource];
            const available = player.resources[resource] || 0;
            
            if (available < required) {
              canAfford = false;
              missingResources.push(`${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: ${available}/${required}`);
            }
          }
          
          // If it's an unlocked building and we can afford it, add a build button
          if (canAfford) {
            const buildButton = document.createElement('button');
            buildButton.className = 'action-button build-button';
            buildButton.textContent = `Build ${buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
            buildButton.onclick = (e) => {
              e.stopPropagation(); // Prevent re-triggering the card click
              startBuilding(buildingType);
            };
            
            // Add build button to the sidebar
            const actionSection = detailsSidebar.querySelector('.details-action') || document.createElement('div');
            actionSection.className = 'details-action';
            actionSection.innerHTML = '';
            actionSection.appendChild(buildButton);
            
            if (!detailsSidebar.contains(actionSection)) {
              detailsSidebar.appendChild(actionSection);
            }
          } else {
            // Show notification about missing resources when trying to build unaffordable
            const actionSection = detailsSidebar.querySelector('.details-action') || document.createElement('div');
            actionSection.className = 'details-action';
            
            const missingResourcesList = document.createElement('div');
            missingResourcesList.className = 'missing-resources';
            missingResourcesList.innerHTML = `
              <div class="cannot-afford">Cannot Afford:</div>
              <ul>
                ${missingResources.map(res => `<li>${res}</li>`).join('')}
              </ul>
            `;
            
            actionSection.innerHTML = '';
            actionSection.appendChild(missingResourcesList);
            
            if (!detailsSidebar.contains(actionSection)) {
              detailsSidebar.appendChild(actionSection);
            }
          }
        } else {
          // If locked, show reason in sidebar
          const actionSection = detailsSidebar.querySelector('.details-action') || document.createElement('div');
          actionSection.className = 'details-action';
          
          const lockStatusDiv = document.createElement('div');
          lockStatusDiv.className = `lock-status ${lockState}`;
          lockStatusDiv.innerHTML = `<div class="lock-icon-large">${lockState === 'obsolete' ? '⚠️' : '🔒'}</div><div>${lockReason}</div>`;
          
          actionSection.innerHTML = '';
          actionSection.appendChild(lockStatusDiv);
          
          if (!detailsSidebar.contains(actionSection)) {
            detailsSidebar.appendChild(actionSection);
          }
        }
      });
      
      buildingGrid.appendChild(card);
      buildingCount++;
    }
  }
  
  // If no buildings were displayed, show a message
  if (buildingCount === 0) {
    const message = document.createElement('div');
    message.className = 'no-buildings-message';
    message.style.padding = '20px';
    message.style.textAlign = 'center';
    message.style.color = '#718096';
    
    if (category === 'all') {
      message.textContent = `No buildings available in the ${playerAge}. Research technologies to unlock more building options.`;
    } else {
      message.textContent = `No ${buildingCategories[category] || category} buildings available in the ${playerAge}. Research technologies to unlock more building options.`;
    }
    
    buildingGrid.appendChild(message);
  }
}

// Show buildings from a specific age (for age navigation buttons)
function showBuildingsFromAge(gameState, age, startBuilding, isPreview = false) {
  const buildingMenu = document.querySelector('.building-buttons');
  const ageDisplay = buildingMenu.querySelector('.current-age-display');
  
  // Update age display
  ageDisplay.textContent = age + (isPreview ? ' (Preview)' : '');
  
  // Create a modified gameState copy with the selected age
  const modifiedGameState = {...gameState};
  const modifiedPlayer = {...gameState.players[gameState.currentPlayer - 1]};
  modifiedPlayer.age = age;
  
  // Replace the current player in the copied state
  modifiedGameState.players = [...gameState.players];
  modifiedGameState.players[gameState.currentPlayer - 1] = modifiedPlayer;
  
  // Get the currently active tab
  const activeTab = document.querySelector('.building-tab.active');
  const category = activeTab ? activeTab.dataset.category : 'all';
  
  // Update the tab content with the modified state
  updateBuildingTabContent(modifiedGameState, category, startBuilding, isPreview);
  
  // Update the navigation buttons
  const ageIndex = gameState.ages.indexOf(age);
  const prevButton = buildingMenu.querySelector('.age-nav-button:first-child');
  const nextButton = buildingMenu.querySelector('.age-nav-button:last-child');
  
  prevButton.disabled = ageIndex <= 0;
  nextButton.disabled = ageIndex >= gameState.ages.length - 1;
}

// Update building buttons filtered by category
export function updateBuildingButtonsByCategory(gameState, category, startBuilding) {
  const buildingButtons = document.querySelector('.building-buttons');
  
  // Make sure the container exists
  if (!buildingButtons) {
    console.error("Building buttons container not found when filtering by category");
    return;
  }
  
  // Clear previous content
  buildingButtons.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  const playerAge = player.age;
  
  console.log(`Filtering building buttons for age: ${playerAge}, category: ${category}`);
  
  // Add a category title
  const categoryTitle = document.createElement('h4');
  categoryTitle.style.margin = '0 0 15px 0';
  categoryTitle.style.color = '#4a5568';
  categoryTitle.style.borderBottom = '2px solid #e2e8f0';
  categoryTitle.style.paddingBottom = '10px';
  categoryTitle.textContent = category === 'all' ? 
                             'All Available Buildings' : 
                             `${buildingCategories[category] || category} Buildings`;
  buildingButtons.appendChild(categoryTitle);
  
  // Count buildings by category to check if we're adding any
  let buildingCount = 0;
  
  // Stone Age buildings that should always be available
  const stoneAgeBuildings = ['farm', 'logging_camp', 'house', 'hunters_hut'];
  
  const currentAgeBuildings = [];
  const previousAgeBuildings = [];
  
  for (const buildingType in buildingTypes) {
    // Skip HQ as it's placed at start
    if (buildingType === 'hq') continue;
    
    const building = buildingTypes[buildingType];
    
    // Always show Stone Age essential buildings in any age
    const isStoneAgeBuilding = stoneAgeBuildings.includes(buildingType);
    
    // Skip buildings from future ages unless they're essential Stone Age buildings
    if (!isStoneAgeBuilding && building.age && gameState.ages.indexOf(building.age) > gameState.ages.indexOf(playerAge)) {
      continue;
    }
    
    // Filter by category if not showing all
    if (category !== 'all' && building.category !== category) {
      continue;
    }
    
    // Always include Stone Age buildings, otherwise check age requirements
    let canBuild = isStoneAgeBuilding;
    
    if (!isStoneAgeBuilding) {
      // Check if the building is appropriate for the current age or earlier
      canBuild = !building.age || gameState.ages.indexOf(building.age) <= gameState.ages.indexOf(playerAge);
    }
    
    if (canBuild) {
      buildingCount++;
      
      // Format cost text
      let costText = '';
      for (const resource in building.cost) {
        costText += `${building.cost[resource]} ${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}, `;
      }
      costText = costText.slice(0, -2); // Remove trailing comma
      
      // Create button with better styling
      const button = document.createElement('button');
      button.className = 'building-option';
      button.textContent = `${buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${costText})`;
      button.onclick = () => startBuilding(buildingType);
      
      // Apply some styling
      button.style.width = '100%';
      button.style.marginBottom = '8px';
      button.style.padding = '10px';
      button.style.borderRadius = '6px';
      button.style.border = 'none';
      button.style.backgroundColor = '#f8fafc';
      button.style.borderLeft = '4px solid #4a5568';
      button.style.textAlign = 'left';
      button.style.fontWeight = 'normal';
      button.style.transition = 'all 0.2s';
      
      // Check if player can afford it
      let canAfford = true;
      let missingResources = [];
      
      for (const resource in building.cost) {
        const required = building.cost[resource];
        const available = player.resources[resource] || 0;
        
        if (available < required) {
          canAfford = false;
          missingResources.push(`${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: ${available}/${required}`);
        }
      }
      
      button.disabled = !canAfford;
      
      // Add tooltip for disabled buttons
      if (!canAfford) {
        button.title = `Insufficient resources:\n${missingResources.join('\n')}`;
        button.style.opacity = '0.6';
        button.style.borderLeftColor = '#a0aec0';
      } else {
        button.title = building.description || `Build a ${buildingType.replace(/_/g, ' ')}`;
        
        // Add hover effects for enabled buttons only
        button.addEventListener('mouseover', () => {
          button.style.backgroundColor = '#edf2f7';
          button.style.transform = 'translateX(2px)';
        });
        
        button.addEventListener('mouseout', () => {
          button.style.backgroundColor = '#f8fafc';
          button.style.transform = 'none';
        });
      }
      
      // Sort by age - current age buildings first, then previous age buildings
      if (!building.age || building.age === playerAge) {
        currentAgeBuildings.push(button);
      } else {
        previousAgeBuildings.push(button);
      }
    }
  }
  
  // Show a section for current age buildings if any
  if (currentAgeBuildings.length > 0) {
    const currentAgeSection = document.createElement('div');
    currentAgeSection.style.marginBottom = '20px';
    
    const sectionTitle = document.createElement('h5');
    sectionTitle.textContent = `${playerAge} Buildings`;
    sectionTitle.style.margin = '10px 0';
    sectionTitle.style.color = '#2d3748';
    currentAgeSection.appendChild(sectionTitle);
    
    currentAgeBuildings.forEach(button => currentAgeSection.appendChild(button));
    buildingButtons.appendChild(currentAgeSection);
  }
  
  // Show a section for previous age buildings if any
  if (previousAgeBuildings.length > 0) {
    const previousAgeSection = document.createElement('div');
    
    const sectionTitle = document.createElement('h5');
    sectionTitle.textContent = 'Earlier Age Buildings';
    sectionTitle.style.margin = '10px 0';
    sectionTitle.style.color = '#2d3748';
    previousAgeSection.appendChild(sectionTitle);
    
    previousAgeBuildings.forEach(button => previousAgeSection.appendChild(button));
    buildingButtons.appendChild(previousAgeSection);
  }
  
  // Display a message if no buildings are available in this category
  if (buildingCount === 0) {
    const message = document.createElement('div');
    message.className = 'no-buildings-message';
    message.style.padding = '15px';
    message.style.fontStyle = 'italic';
    message.style.color = '#718096';
    message.style.textAlign = 'center';
    message.style.backgroundColor = '#f7fafc';
    message.style.borderRadius = '8px';
    message.style.border = '1px dashed #cbd5e0';
    
    if (category === 'all') {
      message.textContent = `No buildings available in the ${playerAge}. Research technologies to unlock more building options.`;
    } else {
      message.textContent = `No ${buildingCategories[category] || category} buildings available in the ${playerAge}. Research technologies to unlock more building options.`;
    }
    
    buildingButtons.appendChild(message);
  }
}

// Update unit buttons with available units to produce
export function updateUnitButtons(gameState, createUnit) {
  const unitButtonsContainer = document.getElementById('unitButtons');
  unitButtonsContainer.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  // Group units by age
  const unitsByAge = {};
  
  player.unlockedUnits.forEach(unitType => {
    const unit = unitTypes[unitType];
    if (unit) {
      const unitAge = unit.age;
      if (!unitsByAge[unitAge]) {
        unitsByAge[unitAge] = [];
      }
      unitsByAge[unitAge].push(unitType);
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
    
    unitsByAge[age].forEach(unitType => {
      const unit = unitTypes[unitType];
      const costText = formatResourceCost(unit.cost);
      
      const button = document.createElement('button');
      button.textContent = `${unitType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} (${costText})`;
      button.onclick = () => createUnit(unitType);
      
      // Check if player can afford it
      let canAfford = true;
      let missingResources = [];
      
      for (const resource in unit.cost) {
        const required = unit.cost[resource];
        const available = player.resources[resource] || 0;
        
        if (available < required) {
          canAfford = false;
          missingResources.push(`${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: ${available}/${required}`);
        }
      }
      
      button.disabled = !canAfford;
      
      // Add tooltip for disabled buttons
      if (!canAfford) {
        button.title = `Insufficient resources:\n${missingResources.join('\n')}`;
      } else {
        const unitInfo = unitTypes[unitType];
        let tooltipText = `${unitType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`;
        
        if (unitInfo.description) {
          tooltipText += `\n${unitInfo.description}`;
        }
        
        if (unitInfo.attack) {
          tooltipText += `\nAttack: ${unitInfo.attack}`;
        }
        
        if (unitInfo.defense) {
          tooltipText += `\nDefense: ${unitInfo.defense}`;
        }
        
        if (unitInfo.move) {
          tooltipText += `\nMovement: ${unitInfo.move}`;
        }
        
        if (unitInfo.abilities && unitInfo.abilities.length > 0) {
          tooltipText += `\nAbilities: ${unitInfo.abilities.join(', ')}`;
        }
        
        button.title = tooltipText;
      }
      
      categoryDiv.appendChild(button);
    });
    
    unitButtonsContainer.appendChild(categoryDiv);
  });
}

// Update research buttons
export function updateResearchButtons(gameState, startResearch) {
  const researchButtons = document.getElementById('researchButtons');
  const player = gameState.players[gameState.currentPlayer - 1];
  const currentAge = player.age;
  
  researchButtons.innerHTML = '';
  
  // Get technologies for current age
  const ageTechnologies = technologies[currentAge];
  if (!ageTechnologies) return;
  
  for (const techName in ageTechnologies) {
    const tech = ageTechnologies[techName];
    
    // Check if already researched
    if (player.technologies.includes(techName)) continue;
    
    // Check prerequisites
    let prerequisitesMet = true;
    for (const prereq of tech.prerequisites) {
      if (!player.technologies.includes(prereq)) {
        prerequisitesMet = false;
        break;
      }
    }
    
    // Create button
    const button = document.createElement('button');
    button.textContent = `${techName} (${tech.cost} Tech Points)`;
    button.disabled = !prerequisitesMet || player.currentResearch;
    button.title = tech.description;
    
    // If already researching this, show progress
    if (player.currentResearch === techName) {
      button.textContent += ` - Researching (${Math.floor(player.researchProgress)}%)`;
      button.disabled = true;
    }
    
    button.onclick = () => startResearch(techName);
    researchButtons.appendChild(button);
  }
  
  // Update research progress bar
  const progressBar = document.getElementById('researchProgressBar');
  const progressLabel = document.getElementById('researchProgressLabel');
  
  if (player.currentResearch) {
    progressBar.style.width = `${player.researchProgress}%`;
    progressLabel.textContent = `Researching ${player.currentResearch}: ${Math.floor(player.researchProgress)}%`;
  } else {
    progressBar.style.width = '0%';
    progressLabel.textContent = 'No research in progress';
  }
}

// Update the building details sidebar
function updateBuildingDetailsSidebar(sidebar, buildingType, building, player) {
  // Clear the sidebar
  sidebar.innerHTML = '';
  
  // Create header with building icon and name
  const header = document.createElement('h3');
  header.className = 'details-header';
  
  const iconDiv = document.createElement('div');
  iconDiv.className = 'building-icon';
  iconDiv.innerHTML = `<span class="icon-placeholder">${buildingType.charAt(0).toUpperCase()}</span>`;
  
  const nameSpan = document.createElement('span');
  nameSpan.textContent = buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  header.appendChild(iconDiv);
  header.appendChild(nameSpan);
  sidebar.appendChild(header);
  
  // Add building description
  if (building.description) {
    const description = document.createElement('div');
    description.className = 'details-description';
    description.textContent = building.description;
    sidebar.appendChild(description);
  }
  
  // Add stats section
  const statsDiv = document.createElement('div');
  statsDiv.className = 'details-stats';
  
  // Age
  addStatItem(statsDiv, 'Age', building.age || 'Stone Age');
  
  // Category
  if (building.category) {
    addStatItem(statsDiv, 'Type', buildingCategories[building.category] || building.category);
  }
  
  // Production
  if (building.production) {
    for (const resource in building.production) {
      const resourceIcon = resourceIcons[resource] || '📦';
      const resourceName = resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      addStatItem(statsDiv, `${resourceIcon} ${resourceName} Production`, building.production[resource]);
    }
  }
  
  // Defense
  if (building.defense) {
    addStatItem(statsDiv, 'Defense', building.defense);
  }
  
  // Vision
  if (building.vision) {
    addStatItem(statsDiv, 'Vision Range', `${building.vision} tiles`);
  }
  
  // Build time
  if (building.buildTime) {
    addStatItem(statsDiv, 'Build Time', `${building.buildTime} ${building.buildTime === 1 ? 'turn' : 'turns'}`);
  }
  
  // Placement requirements
  if (building.terrainRequirement || building.requiresCity) {
    let requirementText = '';
    
    if (building.terrainRequirement) {
      requirementText += `${building.terrainRequirement.join(' or ')} terrain`;
    }
    
    if (building.requiresCity) {
      if (requirementText) requirementText += ', ';
      requirementText += 'must be within city borders';
    }
    
    addStatItem(statsDiv, 'Placement', requirementText);
  }
  
  // Resource requirements
  const costItems = [];
  for (const resource in building.cost) {
    const required = building.cost[resource];
    const available = player.resources[resource] || 0;
    const resourceIcon = resourceIcons[resource] || '📦';
    const resourceName = resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    
    costItems.push({
      label: `${resourceIcon} ${resourceName}`,
      value: `${available}/${required}`,
      isAffordable: available >= required
    });
  }
  
  if (costItems.length > 0) {
    const costsHeader = document.createElement('div');
    costsHeader.className = 'stat-section-title';
    costsHeader.textContent = 'Resource Requirements';
    statsDiv.appendChild(costsHeader);
    
    costItems.forEach(item => {
      const statItem = document.createElement('div');
      statItem.className = 'stat-item';
      
      const label = document.createElement('div');
      label.className = 'stat-label';
      label.textContent = item.label;
      
      const value = document.createElement('div');
      value.className = `stat-value ${item.isAffordable ? 'affordable' : 'unaffordable'}`;
      value.textContent = item.value;
      
      statItem.appendChild(label);
      statItem.appendChild(value);
      statsDiv.appendChild(statItem);
    });
  }
  
  sidebar.appendChild(statsDiv);
  
  // Add placement preview section if applicable
  if (building.terrainRequirement) {
    const previewSection = document.createElement('div');
    previewSection.className = 'placement-preview';
    
    const previewTitle = document.createElement('div');
    previewTitle.className = 'preview-title';
    previewTitle.textContent = 'Valid Placement';
    
    const previewTypes = document.createElement('div');
    previewTypes.className = 'preview-types';
    
    building.terrainRequirement.forEach(terrain => {
      const terrainType = document.createElement('div');
      terrainType.className = 'preview-tile-type valid';
      terrainType.textContent = terrain;
      previewTypes.appendChild(terrainType);
    });
    
    previewSection.appendChild(previewTitle);
    previewSection.appendChild(previewTypes);
    sidebar.appendChild(previewSection);
  }
}

// Helper to add a stat item to the stats div
function addStatItem(statsDiv, label, value) {
  const statItem = document.createElement('div');
  statItem.className = 'stat-item';
  
  const statLabel = document.createElement('div');
  statLabel.className = 'stat-label';
  statLabel.textContent = label;
  
  const statValue = document.createElement('div');
  statValue.className = 'stat-value';
  statValue.textContent = value;
  
  statItem.appendChild(statLabel);
  statItem.appendChild(statValue);
  statsDiv.appendChild(statItem);
}

// Update the age progress bar
export function updateAgeProgressDisplay(gameState) {
  const player = gameState.players[gameState.currentPlayer - 1];
  const progressBar = document.getElementById('ageProgressBar');
  const progressLabel = document.getElementById('ageProgressLabel');
  
  progressBar.style.width = `${player.ageProgress}%`;
  progressLabel.textContent = `Age Progress: ${Math.floor(player.ageProgress)}%`;
  
  // Update advance age button state
  const advanceAgeBtn = document.getElementById('advanceAgeBtn');
  advanceAgeBtn.disabled = player.ageProgress < 100 || gameState.ages.indexOf(player.age) >= gameState.ages.length - 1;
}

// Helper function to format resource cost for UI display
export function formatResourceCost(cost) {
  let costText = '';
  for (const resource in cost) {
    costText += `${cost[resource]} ${resource.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}, `;
  }
  return costText.slice(0, -2); // Remove trailing comma and space
}

// Show a notification message with optional type
export function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  
  // Remove any existing type classes
  notification.classList.remove('notification-info', 'notification-success', 'notification-warning', 'notification-error');
  
  // Add the appropriate type class
  notification.classList.add('show', `notification-${type}`);
  
  setTimeout(() => {
    notification.classList.remove('show', `notification-${type}`);
  }, 3500);
}

// Get tooltip content for a unit, including movement points
export function getUnitTooltipContent(unit) {
  let content = `Unit: ${unit.type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`;
  content += `<br>Owner: Player ${unit.owner}`;
  
  if (unit.health) {
    content += `<br>Health: ${unit.health}%`;
  }
  
  // Add movement points if available
  if (unit.remainingMP !== undefined) {
    const unitTypeInfo = unitTypes[unit.type];
    const maxMP = unitTypeInfo ? unitTypeInfo.move : 0;
    content += `<br>MP: ${unit.remainingMP}/${maxMP}`;
  }
  
  // Add cargo info for transports
  if (unit.cargo && unit.cargo.length > 0) {
    const unitTypeInfo = unitTypes[unit.type];
    const capacity = unitTypeInfo.capacity || 0;
    content += `<br>Cargo: ${unit.cargo.length}/${capacity}`;
    
    // List cargo contents
    unit.cargo.forEach(cargoUnit => {
      content += `<br> - ${cargoUnit.type}`;
    });
  }
  
  // Add special abilities
  const unitTypeInfo = unitTypes[unit.type];
  if (unitTypeInfo && unitTypeInfo.abilities && unitTypeInfo.abilities.length > 0) {
    content += `<br>Abilities: ${unitTypeInfo.abilities.join(', ')}`;
  }
  
  return content;
}

// Render the game map with hexagonal tiles
export function render(gameState, canvasData) {
  const { 
    canvas, ctx, minimap, minimapCtx, 
    tileSize, minimapTileSize, 
    fogOfWarEnabled, selectedUnit, 
    mouseX, mouseY, cameraOffsetX, cameraOffsetY 
  } = canvasData;
  
  // Calculate hex size based on canvas dimensions and map radius
  const mapRadius = gameState.mapRadius || Math.floor(gameState.mapSize / 2);
  const hexSize = Math.min(
    canvas.width / (mapRadius * 3.5), // Ensure entire map fits
    canvas.height / (mapRadius * 3.5),
    tileSize // Use configured tile size as a maximum
  );
  
  // Add a visual center offset to position the map in the middle of the screen
  const centerOffsetX = canvas.width / 2;
  const centerOffsetY = canvas.height / 2;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  minimapCtx.clearRect(0, 0, minimap.width, minimap.height);
  
  const mapSize = gameState.map.length;
  
  // Render map grid as hexagons
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = gameState.map[y][x];
      
      // Get the tile's coordinates (either axial or fallback to x,y)
      const q = tile.q !== undefined ? tile.q : x;
      const r = tile.r !== undefined ? tile.r : y;
      
      // Get pixel coordinates for the hex center
      let pixelX, pixelY;
      if (tile.pixelX !== undefined && tile.pixelY !== undefined) {
        pixelX = tile.pixelX;
        pixelY = tile.pixelY;
      } else {
        // Calculate pixel coordinates from axial coordinates
        const pixelCoords = axialToPixel(q, r, hexSize);
        pixelX = pixelCoords.x;
        pixelY = pixelCoords.y;
      }
      
      // Adjust for camera offset to get screen coordinates
      const screenX = pixelX - cameraOffsetX;
      const screenY = pixelY - cameraOffsetY;
      
      // The buffer size needs to be larger for hexagons
      const bufferSize = hexSize * 2;
      
      // Skip rendering if outside of view
      if (screenX < -bufferSize || screenY < -bufferSize || 
          screenX > canvas.width + bufferSize || screenY > canvas.height + bufferSize) {
        // Still draw on minimap
        const minimapScale = minimap.width / (mapSize * Math.sqrt(3) * hexSize);
        const minimapX = pixelX * minimapScale;
        const minimapY = pixelY * minimapScale;
        const minimapHexSize = minimapTileSize / 2;
        
        if (tile.discovered[gameState.currentPlayer - 1]) {
          // Get color based on terrain
          const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
          minimapCtx.fillStyle = terrainInfo.color;
          
          // Draw a simple circle on minimap for better visibility
          minimapCtx.beginPath();
          minimapCtx.arc(minimapX, minimapY, minimapHexSize / 2, 0, Math.PI * 2);
          minimapCtx.fill();
        } else if (fogOfWarEnabled) {
          // Draw terrain but overlay with semi-transparent fog on minimap
          const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
          minimapCtx.fillStyle = terrainInfo.color;
          minimapCtx.beginPath();
          minimapCtx.arc(minimapX, minimapY, minimapHexSize / 2, 0, Math.PI * 2);
          minimapCtx.fill();
          
          // Apply fog of war overlay on minimap
          minimapCtx.fillStyle = 'rgba(200, 200, 200, 0.7)';
          minimapCtx.beginPath();
          minimapCtx.arc(minimapX, minimapY, minimapHexSize / 2, 0, Math.PI * 2);
          minimapCtx.fill();
        }
        
        continue;
      }
      
      // Draw main map tiles as hexagons
      if (tile.discovered[gameState.currentPlayer - 1]) {
        // Get terrain info and color
        const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
        
        // Draw the hexagon for the tile
        drawHexagon(ctx, screenX, screenY, hexSize, terrainInfo.color);
        
        // Draw hex grid lines
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 0.5;
        drawHexagonOutline(ctx, screenX, screenY, hexSize);
        
        // Draw buildings or buildings in progress with hex shapes
        if (tile.building) {
          const owner = gameState.players[tile.building.owner - 1];
          ctx.fillStyle = owner.color;
          
          // Draw smaller hexagon for building
          drawHexagon(ctx, screenX, screenY, hexSize * 0.7, owner.color);
          
          // Indicate building type
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(tile.building.type.charAt(0).toUpperCase(), screenX, screenY + 3);
          ctx.textAlign = 'start'; // Reset text alignment
        } 
        else if (tile.buildingInProgress) {
          // Show in-progress building with construction pattern
          const owner = gameState.players[tile.buildingInProgress.owner - 1];
          
          // Striped pattern for in-progress buildings
          ctx.fillStyle = owner.color;
          ctx.globalAlpha = 0.5; // Make it semi-transparent
          drawHexagon(ctx, screenX, screenY, hexSize * 0.7, owner.color);
          ctx.globalAlpha = 1.0;
          
          // Show progress
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.floor(tile.buildingInProgress.progress)}%`, screenX, screenY + 3);
          ctx.textAlign = 'start'; // Reset text alignment
        }
        
        // Draw units (still using circles for better visibility)
        if (tile.unit) {
          const owner = gameState.players[tile.unit.owner - 1];
          ctx.fillStyle = owner.color;
          ctx.beginPath();
          ctx.arc(screenX, screenY, hexSize/2, 0, Math.PI * 2);
          ctx.fill();
          
          // Indicate unit type
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(tile.unit.type.charAt(0).toUpperCase(), screenX, screenY + 3);
          ctx.textAlign = 'start'; // Reset text alignment
          
          // Draw health bar if damaged - position below unit
          if (tile.unit.health && tile.unit.health < 100) {
            const barWidth = hexSize; // Width of the health bar
            const barHeight = 3;  // Height of the health bar
            const barX = screenX - barWidth/2;  // Center the bar horizontally
            const barY = screenY + hexSize/2 + 5; // Position below unit
            
            ctx.fillStyle = '#f00';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = '#0f0';
            const healthWidth = barWidth * (tile.unit.health / 100);
            ctx.fillRect(barX, barY, healthWidth, barHeight);
          }
          
          // Draw movement points indicator for current player's units
          if (tile.unit.owner === gameState.currentPlayer && tile.unit.remainingMP !== undefined) {
            const unitTypeInfo = unitTypes[tile.unit.type];
            const maxMP = unitTypeInfo ? unitTypeInfo.move : 0;
            
            // Display small MP indicator
            ctx.fillStyle = '#fff';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${tile.unit.remainingMP}/${maxMP}`, screenX, screenY - hexSize/2 + 8);
            ctx.textAlign = 'start'; // Reset text alignment
          }
        }
        
        // Show resource amount for resource tiles with quality indicator - adapted for hex
        if (Object.keys(resourceTileTypes).includes(tile.type) && tile.resourceAmount > 0) {
          // Draw quality indicator border
          let borderColor = '#fff'; // Default for standard
          if (tile.resourceQuality === 'rich') {
            borderColor = '#FFC107'; // Gold for rich resources
          } else if (tile.resourceQuality === 'poor') {
            borderColor = '#607D8B'; // Grey for poor resources
          }
          
          // Draw a slightly larger hex outline with the quality color
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 2;
          drawHexagonOutline(ctx, screenX, screenY, hexSize * 0.85);
          
          // Display resource amount
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(tile.resourceAmount.toString(), screenX, screenY - hexSize/3);
          ctx.textAlign = 'start'; // Reset text alignment
          
          // Display quality indicator
          ctx.fillStyle = borderColor;
          ctx.font = '8px Arial Bold';
          ctx.textAlign = 'center';
          const qualityText = tile.resourceQuality === 'rich' ? 'R' : (tile.resourceQuality === 'poor' ? 'P' : 'S');
          ctx.fillText(qualityText, screenX + hexSize/2, screenY - hexSize/2);
          ctx.textAlign = 'start'; // Reset text alignment
          
          // If resource requires a building to extract, add indicator
          if (resourceTileTypes[tile.type].buildingRequired) {
            ctx.fillStyle = '#FF5722';
            ctx.beginPath();
            ctx.arc(screenX + hexSize/2, screenY + hexSize/2, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        // Highlight selected unit
        if (selectedUnit && selectedUnit.x === x && selectedUnit.y === y) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          drawHexagonOutline(ctx, screenX, screenY, hexSize * 0.9);
        }
        
        // Highlight valid movement locations when in move mode - adapted for hex
        if (gameState.unitActionMode === 'move' && gameState.validMovementLocations) {
          // Find if this tile is a valid movement location
          const validLocation = gameState.validMovementLocations.find(loc => loc.x === x && loc.y === y);
          if (validLocation) {
            // Enhanced visual style for movement locations based on cost
            const movementCost = validLocation.cost;
            
            // Color gradient based on movement cost
            let movementColor;
            
            if (selectedUnit && unitTypes[selectedUnit.type]) {
              const maxMove = unitTypes[selectedUnit.type].move;
              const moveCostRatio = movementCost / maxMove;
              
              // Green to yellow to red gradient based on how much of total MP is used
              if (moveCostRatio <= 0.3) {
                movementColor = 'rgba(40, 167, 69, 0.5)'; // Green for low cost
              } else if (moveCostRatio <= 0.7) {
                movementColor = 'rgba(255, 193, 7, 0.5)'; // Yellow for medium cost
              } else {
                movementColor = 'rgba(220, 53, 69, 0.5)'; // Red for high cost
              }
            } else {
              movementColor = 'rgba(0, 150, 255, 0.4)'; // Default blue
            }
            
            // Fill hex with movement color
            drawHexagon(ctx, screenX, screenY, hexSize * 0.95, movementColor);
            
            // Add directional movement indicator (arrow) - adapted for hex
            if (selectedUnit) {
              // Calculate the direction between the two tiles using axial coordinates
              const sourceQ = selectedUnit.q !== undefined ? selectedUnit.q : selectedUnit.x;
              const sourceR = selectedUnit.r !== undefined ? selectedUnit.r : selectedUnit.y;
              const targetQ = validLocation.q !== undefined ? validLocation.q : validLocation.x;
              const targetR = validLocation.r !== undefined ? validLocation.r : validLocation.y;
              
              // Calculate direction as angle
              const dx = targetQ - sourceQ;
              const dy = targetR - sourceR;
              const angle = Math.atan2(dy, dx);
              
              // Draw arrow
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              
              const arrowSize = hexSize * 0.25;
              
              // Draw arrow tip
              ctx.beginPath();
              ctx.moveTo(
                screenX - Math.cos(angle) * arrowSize,
                screenY - Math.sin(angle) * arrowSize
              );
              ctx.lineTo(
                screenX - Math.cos(angle) * arrowSize + Math.cos(angle + Math.PI/6) * arrowSize,
                screenY - Math.sin(angle) * arrowSize + Math.sin(angle + Math.PI/6) * arrowSize
              );
              ctx.lineTo(
                screenX - Math.cos(angle) * arrowSize + Math.cos(angle - Math.PI/6) * arrowSize,
                screenY - Math.sin(angle) * arrowSize + Math.sin(angle - Math.PI/6) * arrowSize
              );
              ctx.closePath();
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }
            
            // Show movement cost
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(validLocation.cost, screenX, screenY + 3);
            ctx.textAlign = 'start'; // Reset text align
            
            // Draw outline to make hex more visible
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            drawHexagonOutline(ctx, screenX, screenY, hexSize);
          }
        }
        
        // Highlight tile under mouse - now using hex coordinates
        const mousePixelX = mouseX + cameraOffsetX;
        const mousePixelY = mouseY + cameraOffsetY;
        const mouseHexCoords = pixelToAxial(mousePixelX, mousePixelY, hexSize);
        
        if (mouseHexCoords.q === q && mouseHexCoords.r === r) {
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          drawHexagonOutline(ctx, screenX, screenY, hexSize * 0.9);
        }
      } else if (fogOfWarEnabled) {
        // Draw terrain but overlay with semi-transparent fog - with hexagons
        const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
        ctx.fillStyle = terrainInfo.color;
        drawHexagon(ctx, screenX, screenY, hexSize, terrainInfo.color);
        
        // Draw grid lines
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 0.5;
        drawHexagonOutline(ctx, screenX, screenY, hexSize);
        
        // Apply semi-transparent fog overlay
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        drawHexagon(ctx, screenX, screenY, hexSize, 'rgba(200, 200, 200, 0.7)');
        
        // Highlight fogged tile under mouse to indicate it can be clicked
        const mousePixelX = mouseX + cameraOffsetX;
        const mousePixelY = mouseY + cameraOffsetY;
        const mouseHexCoords = pixelToAxial(mousePixelX, mousePixelY, hexSize);
        
        if (mouseHexCoords.q === q && mouseHexCoords.r === r) {
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          drawHexagonOutline(ctx, screenX, screenY, hexSize * 0.9);
        }
        
        // Show unit movement highlight if in move mode - for fogged areas
        if (gameState.unitActionMode === 'move' && gameState.validMovementLocations) {
          const validLocation = gameState.validMovementLocations.find(loc => loc.x === x && loc.y === y);
          if (validLocation) {
            ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
            drawHexagon(ctx, screenX, screenY, hexSize * 0.95, 'rgba(0, 150, 255, 0.3)');
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(validLocation.cost, screenX, screenY);
            
            // Add "unexplored" text for fogged tiles
            ctx.font = '8px Arial';
            ctx.fillText('unexplored', screenX, screenY + 10);
            ctx.textAlign = 'start';
          }
        }
      }
      
      // Draw on minimap
      const minimapX = x * minimapTileSize;
      const minimapY = y * minimapTileSize;
      
      if (tile.discovered[gameState.currentPlayer - 1]) {
        // Get color based on terrain
        const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
        minimapCtx.fillStyle = terrainInfo.color;
        minimapCtx.fillRect(minimapX, minimapY, minimapTileSize, minimapTileSize);
        
        // Show units on minimap
        if (tile.unit) {
          const owner = gameState.players[tile.unit.owner - 1];
          minimapCtx.fillStyle = owner.color;
          minimapCtx.fillRect(minimapX, minimapY, minimapTileSize, minimapTileSize);
        }
        
        // Show buildings on minimap
        if (tile.building) {
          const owner = gameState.players[tile.building.owner - 1];
          minimapCtx.fillStyle = owner.color;
          minimapCtx.fillRect(minimapX, minimapY, minimapTileSize, minimapTileSize);
        }
      } else {
        // Draw terrain but with lighter color on minimap for undiscovered tiles
        const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
        minimapCtx.fillStyle = terrainInfo.color;
        minimapCtx.fillRect(minimapX, minimapY, minimapTileSize, minimapTileSize);
        
        // Apply fog of war overlay on minimap
        minimapCtx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        minimapCtx.fillRect(minimapX, minimapY, minimapTileSize, minimapTileSize);
      }
    }
  }
  
  // Draw current view rectangle on minimap
  minimapCtx.strokeStyle = '#fff';
  minimapCtx.lineWidth = 1;
  // Adjust minimap calculations for hex grid
  const minimapScale = minimap.width / (mapSize * Math.sqrt(3) * hexSize);
  const viewX = cameraOffsetX * minimapScale;
  const viewY = cameraOffsetY * minimapScale;
  const viewWidth = canvas.width * minimapScale;
  const viewHeight = canvas.height * minimapScale;
  minimapCtx.strokeRect(viewX, viewY, viewWidth, viewHeight);
}
