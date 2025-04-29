/**
 * HexGrid Test
 * A demonstration of the hex grid module capabilities.
 */

import { 
  createHexGrid, 
  HEX_DIRECTIONS, 
  axialToPixel, 
  pixelToAxial, 
  hexDistance,
  areHexesAdjacent,
  getHexNeighbors,
  findHexByAxial,
  getHexPoints,
  createHexRing,
  createHexSpiral
} from './modules/hexgrid.js';

// Canvas setup
const canvas = document.getElementById('hexCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

// Hex grid parameters
const HEX_SIZE = 30; // Hex radius in pixels
const GRID_WIDTH = 10; // Number of columns
const GRID_HEIGHT = 10; // Number of rows
const ORIGIN = [width / 4, height / 4]; // Offset for grid position
let selectedHex = null; // Currently selected hex for demo purposes

// Color palette
const COLORS = {
  background: '#1e2939',
  hexFill: '#2c3e50',
  hexStroke: '#34495e',
  hexHighlight: '#3498db',
  hexSelected: '#e74c3c',
  text: '#ecf0f1'
};

// Create a hex grid
const hexGrid = createHexGrid(GRID_WIDTH, GRID_HEIGHT, HEX_SIZE, ORIGIN);

// Initialize the canvas
function initCanvas() {
  canvas.width = window.innerWidth * 0.8;
  canvas.height = window.innerHeight * 0.8;
  
  // Add event listeners
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('click', handleMouseClick);
  
  // Initial render
  render();
}

// Convert pixel coordinates to hex coordinates
function getHexFromPixel(x, y) {
  const adjustedX = x - ORIGIN[0];
  const adjustedY = y - ORIGIN[1];
  const hex = pixelToAxial(adjustedX, adjustedY, HEX_SIZE);
  return findHexByAxial(hexGrid, hex.q, hex.r);
}

// Handle mouse movement
function handleMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const hoveredHex = getHexFromPixel(x, y);
  
  // Render with hovered hex
  render(hoveredHex);
}

// Handle mouse clicks
function handleMouseClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const clickedHex = getHexFromPixel(x, y);
  
  if (clickedHex) {
    selectedHex = selectedHex === clickedHex ? null : clickedHex;
    render(null, selectedHex);
  }
}

// Draw a single hexagon
function drawHex(x, y, size, fillColor, strokeColor) {
  const points = getHexPoints(size);
  
  ctx.beginPath();
  // Move to the first point
  ctx.moveTo(x + points[0][0], y + points[0][1]);
  
  // Draw lines to the other points
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(x + points[i][0], y + points[i][1]);
  }
  
  // Close the path back to the first point
  ctx.lineTo(x + points[0][0], y + points[0][1]);
  
  // Fill and stroke
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Render the hex grid
function render(hoveredHex = null) {
  // Clear canvas
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw each hex
  for (const hex of hexGrid) {
    let fillColor = COLORS.hexFill;
    let strokeColor = COLORS.hexStroke;
    
    // Highlight if this is the hovered hex
    if (hoveredHex && hex.q === hoveredHex.q && hex.r === hoveredHex.r) {
      fillColor = COLORS.hexHighlight;
    }
    
    // Highlight if this is the selected hex
    if (selectedHex && hex.q === selectedHex.q && hex.r === selectedHex.r) {
      fillColor = COLORS.hexSelected;
    }
    
    // Draw the hex
    drawHex(hex.x, hex.y, HEX_SIZE, fillColor, strokeColor);
    
    // Add text coordinates
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${hex.q},${hex.r}`, hex.x, hex.y);
  }
  
  // If there's a selected hex, highlight its neighbors
  if (selectedHex) {
    const neighbors = getHexNeighbors(selectedHex.q, selectedHex.r);
    
    for (const neighbor of neighbors) {
      const hex = findHexByAxial(hexGrid, neighbor.q, neighbor.r);
      if (hex) {
        ctx.beginPath();
        ctx.arc(hex.x, hex.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#e67e22';
        ctx.fill();
      }
    }
  }
  
  // Display information panel
  displayInfoPanel(hoveredHex);
}

// Display information panel with hex grid details
function displayInfoPanel(hoveredHex) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 10, 300, 160);
  
  ctx.fillStyle = COLORS.text;
  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  
  ctx.fillText(`HexGrid Demo - ${GRID_WIDTH}×${GRID_HEIGHT} grid, ${HEX_SIZE}px size`, 20, 30);
  ctx.fillText(`Total Hexes: ${hexGrid.length}`, 20, 50);
  
  // Display hex information if one is hovered
  if (hoveredHex) {
    ctx.fillText(`Hovered Hex: q=${hoveredHex.q}, r=${hoveredHex.r}`, 20, 70);
    ctx.fillText(`Pixel coordinates: x=${Math.round(hoveredHex.x)}, y=${Math.round(hoveredHex.y)}`, 20, 90);
    
    if (selectedHex) {
      const distance = hexDistance(hoveredHex.q, hoveredHex.r, selectedHex.q, selectedHex.r);
      const isAdjacent = areHexesAdjacent(hoveredHex.q, hoveredHex.r, selectedHex.q, selectedHex.r);
      
      ctx.fillText(`Distance from selected: ${distance} hex steps`, 20, 110);
      ctx.fillText(`Adjacent to selected: ${isAdjacent ? 'Yes' : 'No'}`, 20, 130);
    }
  } else if (selectedHex) {
    ctx.fillText(`Selected Hex: q=${selectedHex.q}, r=${selectedHex.r}`, 20, 70);
    ctx.fillText(`Pixel coordinates: x=${Math.round(selectedHex.x)}, y=${Math.round(selectedHex.y)}`, 20, 90);
    ctx.fillText(`Neighbors: ${selectedHex.neighbors.length} hexes`, 20, 110);
    ctx.fillText(`Click on a hex to select/deselect it`, 20, 130);
  } else {
    ctx.fillText(`Hover over a hex to see details`, 20, 70);
    ctx.fillText(`Click on a hex to select it and view neighbors`, 20, 90);
  }
  
  ctx.fillText(`Use this module in your game with createHexGrid()`, 20, 150);
}

// Call init on load
window.addEventListener('load', initCanvas);
window.addEventListener('resize', initCanvas);
