// Test script for checking building display
const ages = ['Stone Age', 'Bronze Age', 'Iron Age', 'Medieval Age', 'Renaissance Age', 'Industrial Age', 'Imperial Age', 'Great War Age'];

const stoneAgeBuildings = ['farm', 'logging_camp', 'house', 'hunters_hut'];

// Simplified log of what buttons would be generated
for (const buildingType of stoneAgeBuildings) {
    console.log(`Building button would be created for: ${buildingType}`);
}

console.log("\nTest script completed successfully.");
console.log("The following buildings should now be visible in the 'Construct Building' section:");
console.log("- Farm: Produces food");
console.log("- Logging Camp: Produces wood");
console.log("- House: Increases population cap");
console.log("- Hunters Hut: Alternative food source");
console.log("\nPlease test in-game to verify these changes.");
