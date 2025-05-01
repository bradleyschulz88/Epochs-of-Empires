// Building management functions
import { buildingTypes } from './buildings.js';

/**
 * Update the building buttons display filtered by category
 * @param {Object} gameState - The current game state
 * @param {string} category - The category to filter by ('all' for no filtering)
 * @param {Function} startBuildingCallback - The callback function to call when a building is selected
 */
export function updateBuildingButtonsByCategory(gameState, category, startBuildingCallback) {
  const buildingButtons = document.querySelector('.building-buttons');
  if (!buildingButtons) return;

  buildingButtons.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  
  for (const [buildingType, building] of Object.entries(buildingTypes)) {
    // Skip buildings from future ages
    if (building.age && gameState.ages.indexOf(building.age) > gameState.ages.indexOf(player.age)) {
      continue;
    }
    
    // Filter by category if specified
    if (category !== 'all' && building.category !== category) {
      continue;
    }
    
    // Format cost text
    let costText = '';
    for (const resource in building.cost) {
      costText += `${building.cost[resource]} ${resource}, `;
    }
    costText = costText.slice(0, -2);
    
    // Create button with enhanced styling
    const button = document.createElement('button');
    button.className = 'btn';
    
    // Set appropriate button color based on building type
    if (building.category === 'resource_node') {
      button.classList.add('btn-secondary');
    } else if (building.category === 'housing') {
      button.classList.add('btn-primary');
    } else if (building.category === 'defense') {
      button.classList.add('btn-warning');
    }
    
    // Create icon based on building type
    let icon = '🏗️'; // Default icon
    switch(buildingType) {
      case 'farm': icon = '🌾'; break;
      case 'house': case 'cabin': icon = '🏠'; break;
      case 'logging_camp': icon = '🪓'; break;
      case 'hunters_hut': icon = '🏹'; break;
      case 'mine': case 'iron_mine': icon = '⛏️'; break;
      case 'gold_mine': icon = '💰'; break;
      case 'barracks': icon = '⚔️'; break;
      case 'market': icon = '🏪'; break;
      case 'city': case 'capital': icon = '🏙️'; break;
    }
    
    // Use icon-first layout
    button.innerHTML = `
      <span class="icon">${icon}</span>
      <span>${buildingType.replace(/_/g, ' ')} (${costText})</span>
    `;
    
    // Set onClick handler
    button.onclick = () => {
      if (typeof startBuildingCallback === 'function') {
        startBuildingCallback(buildingType);
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
    
    // Add tooltip
    button.title = canAfford ? 
      `Build ${buildingType.replace(/_/g, ' ')} for ${costText}` :
      `Cannot afford ${buildingType.replace(/_/g, ' ')} (requires ${costText})`;
    
    buildingButtons.appendChild(button);
  }
  
  // If no buildings match the category, show a message
  if (buildingButtons.children.length === 0) {
    const message = document.createElement('p');
    message.textContent = `No buildings available in the '${category}' category.`;
    message.style.padding = '20px';
    message.style.textAlign = 'center';
    message.style.color = '#718096';
    message.style.fontStyle = 'italic';
    buildingButtons.appendChild(message);
  }
}

// Export the function for use in other modules
window.updateBuildingButtonsByCategory = updateBuildingButtonsByCategory;
