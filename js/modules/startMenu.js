// Start Menu Module for War Game
import { mapSize } from './constants.js';
import { generateMap } from './map.js';
import { toggleFogOfWar, setAIDifficulty } from './gameEvents.js';
import { countries, getCountryByName } from './countries.js';
import { validateGameState, cleanGameState } from './errorHandling.js';
import { createInitialGameState } from './gameState.js';

export function startNewGame(gameState, settings) {
    console.log('Starting new game with settings:', settings);
    
    try {
        // Validate settings before applying
        if (!settings || !settings.mapSize || !settings.mapType) {
            throw new Error('Invalid game settings provided');
        }

        // Create backup of current state
        const previousState = JSON.parse(JSON.stringify(gameState));
        
        try {
            // Validate initial game state
            const initialValidation = validateGameState(gameState);
            if (!initialValidation.isValid) {
                console.error('Initial game state validation failed:', initialValidation.errors);
                gameState = createInitialGameState(); // Reset to fresh state
            }

            // Apply settings to gameState
            gameState.mapSize = settings.mapSize;
            gameState.mapType = settings.mapType;
            gameState.gameStarted = true;
            gameState.fogOfWarEnabled = settings.fogOfWar;
            gameState.aiDifficulty = settings.aiDifficulty;
            gameState.resourceDensity = settings.resourceDensity;
            gameState.aiPlayerCount = settings.aiPlayerCount || 1;
            gameState.useNewGenerator = settings.useNewMapGenerator || false;
            gameState.mapSeed = settings.mapSeed;

            // Apply selected country to human player
            if (settings.playerCountry && gameState.players && gameState.players.length > 0) {
                gameState.players[0].faction = settings.playerCountry.name;
                gameState.players[0].name = `Player (${settings.playerCountry.flag} ${settings.playerCountry.name})`;
            }
            
            // Set AI players active/inactive
            if (gameState.players) {
                for (let i = 1; i < gameState.players.length; i++) {
                    gameState.players[i].inactive = i > gameState.aiPlayerCount;
                }
            }
            
            // Generate map with error handling and recovery
            console.log('Generating map...');
            try {
                gameState = generateMap(gameState);
                
                // Validate the generated game state
                const validationResult = validateGameState(gameState);
                if (!validationResult.isValid) {
                    throw new Error(`Invalid game state after map generation: ${validationResult.errors.join(', ')}`);
                }
            } catch (mapError) {
                console.error('Map generation failed:', mapError);
                // Clean up the game state
                gameState = cleanGameState(gameState);
                // Restore previous state and try again with different seed
                if (!settings.mapSeed) {
                    settings.mapSeed = Math.floor(Math.random() * 1000000);
                    console.log('Retrying map generation with new seed:', settings.mapSeed);
                    gameState = generateMap(gameState);
                } else {
                    throw new Error('Failed to generate map with provided seed');
                }
            }
            
            // Hide start menu
            const startMenuOverlay = document.getElementById('startMenuOverlay');
            if (startMenuOverlay) {
                startMenuOverlay.style.display = 'none';
            }

            // Show game container
            const gameContainer = document.getElementById('gameContainer');
            if (gameContainer) {
                gameContainer.style.display = 'flex';
            }
            
            return gameState;
        } catch (error) {
            console.error('Error during game initialization:', error);
            // Restore previous state
            gameState = previousState;
            throw error;
        }
    } catch (error) {
        console.error('Critical error in startNewGame:', error);
        alert('Failed to start new game. Please try again with different settings.');
        return gameState;
    }
}

/**
 * Initialize the start menu
 * @param {Function} startGameCallback - Callback to initialize the game
 */
export function initStartMenu(startGameCallback) {
    console.log('Initializing start menu');
    
    // First, remove any existing overlay to prevent duplicates
    const existingOverlay = document.getElementById('startMenuOverlay');
    if (existingOverlay) {
        try {
            document.body.removeChild(existingOverlay);
        } catch (e) {
            console.error('Error removing existing overlay:', e);
        }
    }
    
    // Create a fresh start menu UI
    createStartMenuUI();
    
    // Ensure proper display state
    const overlay = document.getElementById('startMenuOverlay');
    const gameContainer = document.getElementById('gameContainer');
    
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
        console.log('Start menu overlay is visible');
    } else {
        console.error('Failed to create start menu overlay');
        return;
    }
    
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
    
    // Setup event handlers
    setupStartMenuHandlers(startGameCallback);
}

/**
 * Create the start menu UI elements
 */
function createStartMenuUI() {
    const overlay = document.createElement('div');
    overlay.id = 'startMenuOverlay';
    overlay.className = 'start-menu-overlay';
    
    overlay.innerHTML = `
        <div class="start-menu-container">
            <h1>War Game</h1>
            <div class="menu-section">
                <h2>Game Settings</h2>
                
                <div class="setting-group">
                    <label for="countrySelect">Select Your Country:</label>
                    <select id="countrySelect">
                        ${countries.map(country => 
                            `<option value="${country.name}">${country.flag} ${country.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div id="countryDescription" class="country-description"></div>
                
                <div class="setting-group">
                    <label for="mapSizeSelect">Map Size:</label>
                    <select id="mapSizeSelect">
                        <option value="small">Small (20x20)</option>
                        <option value="medium" selected>Medium (30x30)</option>
                        <option value="large">Large (40x40)</option>
                        <option value="huge">Huge (50x50)</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <label for="mapTypeSelect">Map Type:</label>
                    <select id="mapTypeSelect">
                        <option value="continents" selected>Continents</option>
                        <option value="archipelago">Archipelago (Islands)</option>
                        <option value="pangaea">Pangaea (Single Landmass)</option>
                        <option value="highlands">Highlands (Mountainous)</option>
                        <option value="desert">Desert World</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <label for="resourceDensitySelect">Resource Density:</label>
                    <select id="resourceDensitySelect">
                        <option value="sparse">Sparse</option>
                        <option value="standard" selected>Standard</option>
                        <option value="abundant">Abundant</option>
                        <option value="rich">Rich</option>
                    </select>
                </div>
                
                <div class="setting-group checkbox-group">
                    <input type="checkbox" id="useNewMapGenerator">
                    <label for="useNewMapGenerator">Use improved hex map generator</label>
                    <div class="setting-description">
                        Uses Perlin noise to create more realistic and varied terrain
                    </div>
                </div>
                
                <div class="setting-group">
                    <label for="mapSeedInput">Map Seed (optional):</label>
                    <input type="number" id="mapSeedInput" placeholder="Random seed" min="0" max="999999">
                    <div class="setting-description">
                        Enter a seed number to generate the same map again
                    </div>
                </div>
                
                <div class="setting-group">
                    <label for="aiCountSelect">Number of AI Players:</label>
                    <select id="aiCountSelect">
                        <option value="1" selected>1 AI</option>
                        <option value="2">2 AIs</option>
                        <option value="3">3 AIs</option>
                        <option value="4">4 AIs</option>
                        <option value="5">5 AIs</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <label for="aiDifficultySelect">AI Difficulty:</label>
                    <select id="aiDifficultySelect">
                        <option value="easy">Easy</option>
                        <option value="medium" selected>Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                
                <div class="setting-group checkbox-group">
                    <input type="checkbox" id="fogOfWarCheck" checked>
                    <label for="fogOfWarCheck">Enable Fog of War</label>
                </div>
            </div>
            
            <div class="menu-buttons">
                <button id="startGameBtn" class="primary-button">Start New Game</button>
                <button id="showGuideBtn">Game Guide</button>
            </div>
            
            <div id="gameGuide" class="game-guide">
                <h3>Game Guide</h3>
                <p>War Game is a turn-based strategy game where you build your civilization from the Stone Age to the Modern Era.</p>
                
                <h4>Basic Controls:</h4>
                <ul>
                    <li><strong>Left Click</strong> - Select units/tiles</li>
                    <li><strong>Right Click</strong> - Pan the map</li>
                    <li><strong>Tab</strong> - Switch between action tabs</li>
                    <li><strong>E</strong> - End your turn</li>
                </ul>
                
                <h4>Getting Started:</h4>
                <ol>
                    <li>Build resource gathering buildings near resources</li>
                    <li>Construct production buildings to create military units</li>
                    <li>Research technologies to unlock new buildings and units</li>
                    <li>Explore the map and expand your territory</li>
                </ol>
                
                <button id="hideGuideBtn">Close Guide</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

/**
 * Set up event handlers for the start menu
 * @param {Function} startGameCallback - Callback to initialize the game
 */
function setupStartMenuHandlers(startGameCallback) {
    // Start game button
    document.getElementById('startGameBtn').addEventListener('click', () => {
        const settings = getSelectedSettings();
        startGameCallback(settings);
    });
    
    // Game guide toggle
    document.getElementById('showGuideBtn').addEventListener('click', () => {
        document.getElementById('gameGuide').style.display = 'block';
    });
    
    document.getElementById('hideGuideBtn').addEventListener('click', () => {
        document.getElementById('gameGuide').style.display = 'none';
    });
    
    // Map preview generation
    document.getElementById('mapTypeSelect').addEventListener('change', updateMapPreview);
    document.getElementById('mapSizeSelect').addEventListener('change', updateMapPreview);
    
    // Country selection handler
    const countrySelect = document.getElementById('countrySelect');
    const countryDescription = document.getElementById('countryDescription');
    
    // Set initial description
    const initialCountry = getCountryByName(countrySelect.value);
    if (initialCountry) {
        countryDescription.textContent = initialCountry.description;
    }
    
    // Update description when selection changes
    countrySelect.addEventListener('change', () => {
        const selectedCountry = getCountryByName(countrySelect.value);
        if (selectedCountry) {
            countryDescription.textContent = selectedCountry.description;
        }
    });
}

/**
 * Get all selected settings from the UI
 * @returns {Object} - The selected settings
 */
function getSelectedSettings() {
    // Get map size
    const mapSizeSelect = document.getElementById('mapSizeSelect').value;
    let mapSize = 30; // Default medium
    
    switch (mapSizeSelect) {
        case 'small': mapSize = 20; break;
        case 'medium': mapSize = 30; break;
        case 'large': mapSize = 40; break;
        case 'huge': mapSize = 50; break;
    }
    
    // Get map type
    const mapType = document.getElementById('mapTypeSelect').value;
    console.log("Selected map type:", mapType); // Debug to confirm selection
    
    // Get number of AI players
    const aiCount = parseInt(document.getElementById('aiCountSelect').value);
    
    // Get selected country
    const countryName = document.getElementById('countrySelect').value;
    const selectedCountry = getCountryByName(countryName);
    
    // Get map generator setting
    const useNewMapGenerator = document.getElementById('useNewMapGenerator').checked;
    
    // Get map seed (if provided)
    let mapSeed = document.getElementById('mapSeedInput').value;
    mapSeed = mapSeed ? parseInt(mapSeed) : Math.floor(Math.random() * 1000000);
    
    // Compile all settings
    const settings = {
        mapSize: mapSize,
        mapType: mapType,
        resourceDensity: document.getElementById('resourceDensitySelect').value,
        aiDifficulty: document.getElementById('aiDifficultySelect').value,
        fogOfWar: document.getElementById('fogOfWarCheck').checked,
        aiPlayerCount: aiCount,
        playerCountry: selectedCountry || countries[0],  // Default to first country if not found
        useNewMapGenerator: useNewMapGenerator,
        mapSeed: mapSeed
    };
    
    console.log("Game settings:", settings); // Log all settings for debugging
    return settings;
}

/**
 * Update the map preview when settings change
 * This is a placeholder for future implementation
 */
function updateMapPreview() {
    // This would generate a small preview of the map
    // For now, we'll just log that it would change
    console.log('Map preview would update based on:', getSelectedSettings());
}

/**
 * Show settings menu during gameplay
 * @param {Object} gameState - The game state
 */
export function showSettingsMenu(gameState) {
    // Create settings overlay if it doesn't exist
    if (!document.getElementById('settingsOverlay')) {
        createSettingsOverlay();
    }
    
    // Update settings to match current game state
    updateSettingsOverlay(gameState);
    
    // Show the settings overlay
    document.getElementById('settingsOverlay').style.display = 'flex';
}

/**
 * Create the settings overlay for in-game settings
 */
function createSettingsOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'settingsOverlay';
    overlay.className = 'settings-overlay';
    
    overlay.innerHTML = `
        <div class="settings-container">
            <h2>Game Settings</h2>
            
            <div class="setting-group">
                <label for="settingsAIDifficulty">AI Difficulty:</label>
                <select id="settingsAIDifficulty">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>
            
            <div class="setting-group checkbox-group">
                <input type="checkbox" id="settingsFogOfWar">
                <label for="settingsFogOfWar">Enable Fog of War</label>
            </div>
            
            <div class="setting-group">
                <label for="musicVolumeSlider">Music Volume:</label>
                <input type="range" id="musicVolumeSlider" min="0" max="100" value="50">
                <span id="musicVolumeValue">50%</span>
            </div>
            
            <div class="setting-group">
                <label for="sfxVolumeSlider">Sound Effects:</label>
                <input type="range" id="sfxVolumeSlider" min="0" max="100" value="50">
                <span id="sfxVolumeValue">50%</span>
            </div>
            
            <div class="setting-group checkbox-group">
                <input type="checkbox" id="settingsAnimations" checked>
                <label for="settingsAnimations">Enable Animations</label>
            </div>
            
            <div class="menu-buttons">
                <button id="applySettingsBtn" class="primary-button">Apply</button>
                <button id="cancelSettingsBtn">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('applySettingsBtn').addEventListener('click', () => {
        const gameState = window.gameState; // Access from global scope
        applySettings(gameState);
        document.getElementById('settingsOverlay').style.display = 'none';
    });
    
    document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
        document.getElementById('settingsOverlay').style.display = 'none';
    });
    
    // Volume sliders
    document.getElementById('musicVolumeSlider').addEventListener('input', (e) => {
        document.getElementById('musicVolumeValue').textContent = `${e.target.value}%`;
    });
    
    document.getElementById('sfxVolumeSlider').addEventListener('input', (e) => {
        document.getElementById('sfxVolumeValue').textContent = `${e.target.value}%`;
    });
}

/**
 * Update settings overlay to match current game state
 * @param {Object} gameState - The game state
 */
function updateSettingsOverlay(gameState) {
    document.getElementById('settingsAIDifficulty').value = gameState.aiDifficulty;
    document.getElementById('settingsFogOfWar').checked = gameState.fogOfWarEnabled;
}

/**
 * Apply settings from the overlay to the game state
 * @param {Object} gameState - The game state
 */
function applySettings(gameState) {
    // Get settings from UI
    const aiDifficulty = document.getElementById('settingsAIDifficulty').value;
    const fogOfWar = document.getElementById('settingsFogOfWar').checked;
    
    // Apply to game state
    gameState.aiDifficulty = aiDifficulty;
    
    // Apply fog of war setting
    if (gameState.fogOfWarEnabled !== fogOfWar) {
        toggleFogOfWar(gameState);
    }
    
    // Apply AI difficulty
    setAIDifficulty(gameState, aiDifficulty);
    
    // Store audio settings globally
    const musicVolume = document.getElementById('musicVolumeSlider').value;
    const sfxVolume = document.getElementById('sfxVolumeSlider').value;
    const enableAnimations = document.getElementById('settingsAnimations').checked;
    
    gameState.settings = {
        musicVolume: musicVolume / 100,
        sfxVolume: sfxVolume / 100,
        enableAnimations: enableAnimations
    };
}
