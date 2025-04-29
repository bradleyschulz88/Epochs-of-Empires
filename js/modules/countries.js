/**
 * Country selection options for War Game
 * Contains countries players can select along with their flags
 */

export const countries = [
  { 
    name: "United States",
    flag: "🇺🇸",
    description: "A military superpower with strong production capabilities" 
  },
  { 
    name: "United Kingdom",
    flag: "🇬🇧",
    description: "Naval expertise with balanced military and economic strengths" 
  },
  { 
    name: "China", 
    flag: "🇨🇳",
    description: "Population advantage with strong defense and production" 
  },
  { 
    name: "Russia",
    flag: "🇷🇺",
    description: "Vast territory with powerful military units"
  },
  { 
    name: "Germany",
    flag: "🇩🇪",
    description: "Advanced technology and efficient production"
  },
  { 
    name: "France",
    flag: "🇫🇷",
    description: "Balanced military with strong cultural influence"
  },
  { 
    name: "Japan",
    flag: "🇯🇵",
    description: "Technology advantage with efficient resource use"
  },
  { 
    name: "Brazil",
    flag: "🇧🇷", 
    description: "Rich in natural resources with diverse development options"
  },
  { 
    name: "India",
    flag: "🇮🇳",
    description: "Population advantage with powerful economic growth"
  },
  { 
    name: "Australia",
    flag: "🇦🇺",
    description: "Resource-rich nation with defensive positioning"
  },
  { 
    name: "Canada",
    flag: "🇨🇦",
    description: "Resource advantage with diplomatic bonuses"
  },
  { 
    name: "South Korea",
    flag: "🇰🇷",
    description: "Technological advancement with rapid development"
  },
  { 
    name: "Italy",
    flag: "🇮🇹",
    description: "Cultural strength with versatile military options"
  },
  { 
    name: "South Africa",
    flag: "🇿🇦",
    description: "Resource-rich with balanced development capabilities"
  },
  { 
    name: "Egypt",
    flag: "🇪🇬",
    description: "Ancient civilization with powerful defensive structures"
  }
];

/**
 * Helper function to get country data by name
 * @param {string} name - Name of the country
 * @returns {Object|null} - Country data or null if not found
 */
export function getCountryByName(name) {
  return countries.find(country => country.name === name) || null;
}

/**
 * Helper function to get random country
 * @returns {Object} - Random country data
 */
export function getRandomCountry() {
  return countries[Math.floor(Math.random() * countries.length)];
}
