import { resourceIcons, resourcesByAge, resourceTileTypes, getSimpleResourcesByAge } from './resources.js';
import { terrainTypes } from './terrain.js';
import { unitTypes } from './units.js';
import { technologies } from './technologies.js';
import { buildingTypes, buildingCategories, resourceExtractors } from './buildings.js';
import { revealArea } from './map.js';

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
  createBuildingMenuTabs(gameState, startBuilding);
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
      
      // Building cost
      const costDiv = document.createElement('div');
      costDiv.className = 'building-cost';
      
      for (const resource in building.cost) {
        const costItem = document.createElement('div');
        costItem.className = 'building-cost-item';
        
        // Get resource icon
        const resourceIcon = resourceIcons[resource] || '📦';
        
        costItem.innerHTML = `${resourceIcon} ${building.cost[resource]}`;
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
      
      // Rich tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'building-tooltip';
      
      tooltip.innerHTML = `
        <strong>${buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong><br>
        Age: ${building.age || 'Stone Age'}<br>
        ${building.description || ''}<br>
        ${building.techRequired ? `Requires: ${building.techRequired}<br>` : ''}
        ${building.category ? `Type: ${buildingCategories[building.category] || building.category}<br>` : ''}
        ${lockReason ? `Status: ${lockReason}` : ''}
      `;
      
      card.appendChild(tooltip);
      
      // Only make unlocked buildings clickable
      if (lockState === 'unlocked' && !isPreview) {
        // Add click event listener for building
        card.addEventListener('click', () => {
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
          
          if (canAfford) {
            startBuilding(buildingType);
          } else {
            // Show notification about missing resources
            showNotification(`Cannot afford ${buildingType.replace(/_/g, ' ')}: Missing ${missingResources.join(', ')}`);
          }
        });
      }
      
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
  buildingButtons.innerHTML = '';
  
  const player = gameState.players[gameState.currentPlayer - 1];
  const playerAge = player.age;
  
  console.log(`Updating building buttons for age: ${playerAge}, category: ${category}`);
  
  // Count buildings by category to check if we're adding any
  let buildingCount = 0;
  
  // Stone Age buildings that should always be available
  const stoneAgeBuildings = ['farm', 'logging_camp', 'house', 'hunters_hut'];
  
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
      
      // Create button
      const button = document.createElement('button');
      button.textContent = `${buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${costText})`;
      button.onclick = () => startBuilding(buildingType);
      
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
  }
  
  // Display a message if no buildings are available in this category
  if (buildingCount === 0) {
    const message = document.createElement('div');
    message.className = 'no-buildings-message';
    message.style.padding = '10px';
    message.style.fontStyle = 'italic';
    message.style.color = '#718096';
    message.style.textAlign = 'center';
    
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
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
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
  
  // Calculate effective tile size based on canvas dimensions and map size
  const effectiveTileSize = Math.min(
    canvas.width / gameState.mapSize,
    canvas.height / gameState.mapSize,
    tileSize
  );
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  minimapCtx.clearRect(0, 0, minimap.width, minimap.height);
  
  const mapSize = gameState.map.length;
  
  // Render map grid
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = gameState.map[y][x];
      const screenX = x * effectiveTileSize - cameraOffsetX;
      const screenY = y * effectiveTileSize - cameraOffsetY;
      
      // Skip rendering if outside of view
      if (screenX < -effectiveTileSize || screenY < -effectiveTileSize || 
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
          // Draw terrain but overlay with semi-transparent fog on minimap
          const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
          minimapCtx.fillStyle = terrainInfo.color;
          minimapCtx.fillRect(minimapX, minimapY, minimapTileSize, minimapTileSize);
          
          // Apply fog of war overlay on minimap
          minimapCtx.fillStyle = 'rgba(200, 200, 200, 0.7)';
          minimapCtx.fillRect(minimapX, minimapY, minimapTileSize, minimapTileSize);
        }
        
        continue;
      }
      
      // Draw main map tiles
      if (tile.discovered[gameState.currentPlayer - 1]) {
        // Get terrain info and color
        const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
        ctx.fillStyle = terrainInfo.color;
        ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
        
        // Draw grid lines
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
        
        // Draw buildings or buildings in progress
        if (tile.building) {
          const owner = gameState.players[tile.building.owner - 1];
          ctx.fillStyle = owner.color;
          ctx.fillRect(screenX + 5, screenY + 5, effectiveTileSize - 10, effectiveTileSize - 10);
          
          // Indicate building type
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.fillText(tile.building.type.charAt(0).toUpperCase(), screenX + effectiveTileSize/2 - 3, screenY + effectiveTileSize/2 + 3);
        } 
        else if (tile.buildingInProgress) {
          // Show in-progress building with construction pattern
          const owner = gameState.players[tile.buildingInProgress.owner - 1];
          
          // Striped pattern for in-progress buildings
          ctx.fillStyle = owner.color;
          ctx.globalAlpha = 0.5; // Make it semi-transparent
          ctx.fillRect(screenX + 5, screenY + 5, effectiveTileSize - 10, effectiveTileSize - 10);
          ctx.globalAlpha = 1.0;
          
          // Show progress
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.fillText(`${Math.floor(tile.buildingInProgress.progress)}%`, screenX + effectiveTileSize/2 - 10, screenY + effectiveTileSize/2 + 3);
        }
        
        // Draw units
        if (tile.unit) {
          const owner = gameState.players[tile.unit.owner - 1];
          ctx.fillStyle = owner.color;
          ctx.beginPath();
          ctx.arc(screenX + effectiveTileSize/2, screenY + effectiveTileSize/2, effectiveTileSize/3, 0, Math.PI * 2);
          ctx.fill();
          
          // Indicate unit type
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.fillText(tile.unit.type.charAt(0).toUpperCase(), screenX + effectiveTileSize/2 - 3, screenY + effectiveTileSize/2 + 3);
          
          // Draw health bar if damaged
          if (tile.unit.health && tile.unit.health < 100) {
            ctx.fillStyle = '#f00';
            ctx.fillRect(screenX + 5, screenY + effectiveTileSize - 8, effectiveTileSize - 10, 3);
            
            ctx.fillStyle = '#0f0';
            const healthWidth = (effectiveTileSize - 10) * (tile.unit.health / 100);
            ctx.fillRect(screenX + 5, screenY + effectiveTileSize - 8, healthWidth, 3);
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
        
        // Show resource amount for resource tiles with quality indicator
        if (Object.keys(resourceTileTypes).includes(tile.type) && tile.resourceAmount > 0) {
          // Draw quality indicator border
          let borderColor = '#fff'; // Default for standard
          if (tile.resourceQuality === 'rich') {
            borderColor = '#FFC107'; // Gold for rich resources
          } else if (tile.resourceQuality === 'poor') {
            borderColor = '#607D8B'; // Grey for poor resources
          }
          
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX + 1, screenY + 1, effectiveTileSize - 2, effectiveTileSize - 2);
          
          // Display resource amount
          ctx.fillStyle = '#fff';
          ctx.font = '10px Arial';
          ctx.fillText(tile.resourceAmount.toString(), screenX + 2, screenY + 10);
          
          // Display quality indicator in corner
          ctx.fillStyle = borderColor;
          ctx.font = '8px Arial Bold';
          const qualityText = tile.resourceQuality === 'rich' ? 'R' : (tile.resourceQuality === 'poor' ? 'P' : 'S');
          ctx.fillText(qualityText, screenX + effectiveTileSize - 8, screenY + 8);
          
          // If resource requires a building to extract, add indicator
          if (resourceTileTypes[tile.type].buildingRequired) {
            ctx.fillStyle = '#FF5722';
            ctx.fillRect(screenX + effectiveTileSize - 6, screenY + effectiveTileSize - 6, 4, 4);
          }
        }
        
        // Highlight selected unit
        if (selectedUnit && selectedUnit.x === x && selectedUnit.y === y) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX + 2, screenY + 2, effectiveTileSize - 4, effectiveTileSize - 4);
        }
        
        // Highlight valid movement locations when in move mode
        if (gameState.unitActionMode === 'move' && gameState.validMovementLocations) {
          // Find if this tile is a valid movement location
          const validLocation = gameState.validMovementLocations.find(loc => loc.x === x && loc.y === y);
          if (validLocation) {
            // Blue highlight for valid movement locations
            ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
            ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
            
            // Show movement cost
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(validLocation.cost, screenX + effectiveTileSize/2, screenY + effectiveTileSize/2);
            ctx.textAlign = 'start'; // Reset text align
          }
        }
        
        // Highlight tile under mouse
        if (Math.floor((mouseX + cameraOffsetX) / effectiveTileSize) === x && 
            Math.floor((mouseY + cameraOffsetY) / effectiveTileSize) === y) {
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX + 2, screenY + 2, effectiveTileSize - 4, effectiveTileSize - 4);
        }
      } else if (fogOfWarEnabled) {
        // Draw terrain but overlay with semi-transparent fog
        const terrainInfo = terrainTypes[tile.type] || terrainTypes.land;
        ctx.fillStyle = terrainInfo.color;
        ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
        
        // Draw grid lines
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
        
        // Apply semi-transparent fog overlay
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
        
        // Highlight fogged tile under mouse to indicate it can be clicked
        if (Math.floor((mouseX + cameraOffsetX) / effectiveTileSize) === x && 
            Math.floor((mouseY + cameraOffsetY) / effectiveTileSize) === y) {
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX + 2, screenY + 2, effectiveTileSize - 4, effectiveTileSize - 4);
        }
        
        // Show unit movement highlight if in move mode - even in fogged areas if they're valid movement locations
        if (gameState.unitActionMode === 'move' && gameState.validMovementLocations) {
          const validLocation = gameState.validMovementLocations.find(loc => loc.x === x && loc.y === y);
          if (validLocation) {
            ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
            ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(validLocation.cost, screenX + effectiveTileSize/2, screenY + effectiveTileSize/2);
            ctx.textAlign = 'start';
            
            // Add "unexplored" text for fogged tiles
            ctx.font = '8px Arial';
            ctx.fillText('unexplored', screenX + effectiveTileSize/2, screenY + effectiveTileSize/2 + 10);
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
  const viewX = cameraOffsetX / effectiveTileSize * minimapTileSize;
  const viewY = cameraOffsetY / effectiveTileSize * minimapTileSize;
  const viewWidth = canvas.width / effectiveTileSize * minimapTileSize;
  const viewHeight = canvas.height / effectiveTileSize * minimapTileSize;
  minimapCtx.strokeRect(viewX, viewY, viewWidth, viewHeight);
}
