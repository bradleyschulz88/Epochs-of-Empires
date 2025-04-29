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
  const buildingButtons = document.querySelector('.building-buttons');
  if (!buildingButtons) {
    console.error("Building buttons container not found");
    return;
  }

  try {
    // Show loading state
    buildingButtons.innerHTML = `
      <div id="building-menu-loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading building options...</p>
      </div>`;

    // Create building menu tabs
    createBuildingMenuTabs(gameState, startBuilding);
  } catch (error) {
    console.error("Error creating building menu:", error);
    buildingButtons.innerHTML = `
      <div class="error-state">
        <p>Error loading building menu. Please try refreshing the page.</p>
        <p class="error-details">${error.message}</p>
      </div>`;
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
          missingResources.push(`${resource.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${available}/${required}`);
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
