import { resourceIcons, resourcesByAge } from './resources.js';
import { terrainTypes } from './terrain.js';
import { unitTypes } from './units.js';
import { technologies } from './technologies.js';
import { buildingTypes, buildingCategories } from './buildings.js';
import { revealArea } from './map.js';

// Update the resource display
export function updateResourceDisplay(gameState) {
  const container = document.getElementById('resourceContainer');
  container.innerHTML = '';
  
  const currentPlayer = gameState.players[gameState.currentPlayer - 1];
  const availableResources = resourcesByAge[currentPlayer.age];
  
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
    container.appendChild(resourceElement);
  }
  
  // Update population display
  updatePopulationDisplay(gameState);
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
  buildingButtons.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  const availableResources = resourcesByAge[player.age];
  
  for (const buildingType in buildingTypes) {
    // Skip HQ as it's placed at start
    if (buildingType === 'hq') continue;
    
    const building = buildingTypes[buildingType];
    
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
      for (const resource in unit.cost) {
        if (!player.resources[resource] || player.resources[resource] < unit.cost[resource]) {
          canAfford = false;
          break;
        }
      }
      button.disabled = !canAfford;
      
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

// Show a notification message
export function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.style.opacity = 1;
  
  setTimeout(() => {
    notification.style.opacity = 0;
  }, 3000);
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

// Render the game map
export function render(gameState, canvasData) {
  const { 
    canvas, ctx, minimap, minimapCtx, 
    tileSize, minimapTileSize, 
    fogOfWarEnabled, selectedUnit, 
    mouseX, mouseY, cameraOffsetX, cameraOffsetY 
  } = canvasData;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  minimapCtx.clearRect(0, 0, minimap.width, minimap.height);
  
  const mapSize = gameState.map.length;
  
  // Render map grid
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = gameState.map[y][x];
      const screenX = x * tileSize - cameraOffsetX;
      const screenY = y * tileSize - cameraOffsetY;
      
      // Skip rendering if outside of view
      if (screenX < -tileSize || screenY < -tileSize || 
          screenX > canvas.width || screenY > canvas.height) {
        // Still draw on minimap
        const minimapX = x * minimapTileSize;
        const minimapY = y * minimapTileSize;
        
        if (tile.discovered[gameState.currentPlayer - 1]) {
          // Get color based on terrain
          const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
          minimapCtx.fillStyle = terrainInfo.color;
          minimapCtx.fillRect(minimapX, minimapY, minimapTileSize, minimapTileSize);
        } else if (fogOfWarEnabled) {
          minimapCtx.fillStyle = '#000';
          minimapCtx.fillRect(minimapX, minimapY, minimapTileSize, minimapTileSize);
        }
        
        continue;
      }
      
      // Draw main map tiles
      if (tile.discovered[gameState.currentPlayer - 1]) {
        // Get terrain info and color
        const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
        ctx.fillStyle = terrainInfo.color;
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
        
        // Draw grid lines
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(screenX, screenY, tileSize, tileSize);
        
        // Draw buildings
        if (tile.building) {
          const owner = gameState.players[tile.building.owner - 1];
          ctx.fillStyle = owner.color;
          ctx.fillRect(screenX + 5, screenY + 5, tileSize - 10, tileSize - 10);
          
          // Indicate building type
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.fillText(tile.building.type.charAt(0).toUpperCase(), screenX + tileSize/2 - 3, screenY + tileSize/2 + 3);
        }
        
        // Draw units
        if (tile.unit) {
          const owner = gameState.players[tile.unit.owner - 1];
          ctx.fillStyle = owner.color;
          ctx.beginPath();
          ctx.arc(screenX + tileSize/2, screenY + tileSize/2, tileSize/3, 0, Math.PI * 2);
          ctx.fill();
          
          // Indicate unit type
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.fillText(tile.unit.type.charAt(0).toUpperCase(), screenX + tileSize/2 - 3, screenY + tileSize/2 + 3);
          
          // Draw health bar if damaged
          if (tile.unit.health && tile.unit.health < 100) {
            ctx.fillStyle = '#f00';
            ctx.fillRect(screenX + 5, screenY + tileSize - 8, tileSize - 10, 3);
            
            ctx.fillStyle = '#0f0';
            const healthWidth = (tileSize - 10) * (tile.unit.health / 100);
            ctx.fillRect(screenX + 5, screenY + tileSize - 8, healthWidth, 3);
          }
          
          // Draw movement points indicator for current player's units
          if (tile.unit.owner === gameState.currentPlayer && tile.unit.remainingMP !== undefined) {
            const unitTypeInfo = unitTypes[tile.unit.type];
            const maxMP = unitTypeInfo ? unitTypeInfo.move : 0;
            
            // Display small MP indicator
            ctx.fillStyle = '#fff';
            ctx.font = '8px Arial';
            ctx.fillText(`${tile.unit.remainingMP}/${maxMP}`, screenX + 2, screenY + 8);
          }
        }
        
        // Show resource amount for resource tiles
        if (Object.keys(terrainTypes).includes(tile.type) && tile.resourceAmount > 0) {
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.fillText(tile.resourceAmount.toString(), screenX + 2, screenY + 10);
        }
        
        // Highlight selected unit
        if (selectedUnit && selectedUnit.x === x && selectedUnit.y === y) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);
        }
        
        // Highlight tile under mouse
        if (Math.floor((mouseX + cameraOffsetX) / tileSize) === x && 
            Math.floor((mouseY + cameraOffsetY) / tileSize) === y) {
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);
        }
      } else if (fogOfWarEnabled) {
        // Draw fog of war
        ctx.fillStyle = '#000';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
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
        minimapCtx.fillStyle = '#000';
        minimapCtx.fillRect(minimapX, minimapY, minimapTileSize, minimapTileSize);
      }
    }
  }
  
  // Draw current view rectangle on minimap
  minimapCtx.strokeStyle = '#fff';
  minimapCtx.lineWidth = 1;
  const viewX = cameraOffsetX / tileSize * minimapTileSize;
  const viewY = cameraOffsetY / tileSize * minimapTileSize;
  const viewWidth = canvas.width / tileSize * minimapTileSize;
  const viewHeight = canvas.height / tileSize * minimapTileSize;
  minimapCtx.strokeRect(viewX, viewY, viewWidth, viewHeight);
}
