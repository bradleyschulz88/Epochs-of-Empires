// Technology tree
export const technologies = {
  'Stone Age': {
    'Basic Tools': { 
      cost: 30, 
      prerequisites: [], 
      unlocks: ['clubman', 'forager'],
      description: 'First basic tools for hunting and gathering'
    },
    'Fire Making': { 
      cost: 40, 
      prerequisites: ['Basic Tools'], 
      unlocks: ['camp'],
      description: 'Control of fire allows cooking and better weapons' 
    },
    'Stone Weapons': { 
      cost: 50, 
      prerequisites: ['Basic Tools'], 
      unlocks: ['spearthrower'],
      description: 'Advanced stone weapons for hunting and combat'
    }
  },
  'Bronze Age': {
    'Bronze Working': { 
      cost: 60, 
      prerequisites: [], 
      unlocks: ['spearman', 'slinger'],
      description: 'First metal tools and weapons' 
    },
    'Wheel': { 
      cost: 70, 
      prerequisites: ['Bronze Working'], 
      unlocks: ['chariot'],
      description: 'Invention of the wheel enables faster movement' 
    },
    'Early Sailing': { 
      cost: 80, 
      prerequisites: ['Bronze Working'], 
      unlocks: ['trireme'],
      description: 'First sailing vessels for crossing water' 
    }
  },
  'Iron Age': {
    'Iron Working': { 
      cost: 90, 
      prerequisites: [], 
      unlocks: ['swordsman', 'axeman'],
      description: 'Stronger metal weapons and tools' 
    },
    'Cavalry': { 
      cost: 100, 
      prerequisites: ['Iron Working'], 
      unlocks: ['horseman'],
      description: 'Mounted warriors for faster attacks' 
    },
    'Engineering': { 
      cost: 110, 
      prerequisites: ['Iron Working'], 
      unlocks: ['catapult'],
      description: 'Early siege weapons and fortifications' 
    }
  }
};
