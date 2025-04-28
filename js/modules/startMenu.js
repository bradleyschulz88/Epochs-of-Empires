// Start Menu Module for War Game
import { mapSize } from './constants.js';
import { generateMap } from './map.js';
import { toggleFogOfWar, setAIDifficulty } from './gameEvents.js';

/**
 * Generate a new game with selected settings
 * @param {Object} gameState - The game state
 * @param {Object} settings - The selected game settings
 * @returns {Object} - Updated game state
 */
export function startNewGame(gameState, settings) {
    // Apply settings to gameState
    gameState.mapSize = settings.mapSize;
    gameState.mapType = settings.mapType;
    gameState.gameStarted = true;
    gameState.fogOfWarEnabled = settings.fogOfWar;
    gameState.aiDifficulty = settings.aiDifficulty;
    gameState.resourceDensity = settings.resourceDensity;
    gameState.aiPlayerCount = settings.aiPlayerCount || 1; // Default to 1 if not specified
    
    // Set AI players active or inactive based on selected count
    for (let i = 1; i < gameState.players.length; i++) {
        // Player index 0 is human player, indices 1+ are AI players
        if (i <= gameState.aiPlayerCount) {
            // Activate this AI player
            gameState.players[i].inactive = false;
        } else {
            // Deactivate this AI player
            gameState.players[i].inactive = true;
        }
    }
    
    // Generate map with selected settings
    gameState = generateMap(gameState);
    
    // Hide start menu overlay and show game container
    document.getElementById('startMenuOverlay').style.display = 'none';
    
    // If game container exists, make it visible
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.style.display = 'flex';
    }
    
    return gameState;
}

/**
 * Initialize the start menu
 * @param {Function} startGameCallback - Callback to initialize the game
 */
export function initStartMenu(startGameCallback) {
    // Create start menu if it doesn't exist yet
    if (!document.getElementById('startMenuOverlay')) {
        createStartMenuUI();
    } else {
        // If start menu overlay already exists, ensure it's attached to the document
        const existingOverlay = document.getElementById('startMenuOverlay');
        if (!document.body.contains(existingOverlay)) {
            document.body.appendChild(existingOverlay);
        }
    }
    
    // Make sure the game container is hidden when showing the start menu
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
    
    // Show the start menu
    document.getElementById('startMenuOverlay').style.display = 'flex';
    
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
    
    // Get number of AI players
    const aiCount = parseInt(document.getElementById('aiCountSelect').value);
    
    // Compile all settings
    return {
        mapSize: mapSize,
        mapType: document.getElementById('mapTypeSelect').value,
        resourceDensity: document.getElementById('resourceDensitySelect').value,
        aiDifficulty: document.getElementById('aiDifficultySelect').value,
        fogOfWar: document.getElementById('fogOfWarCheck').checked,
        aiPlayerCount: aiCount
    };
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
