# Epochs of Empires  

> Turn-based grand-strategy across 11 ages of human history — from Stone Age foragers to stealth drones.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)  
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](/LICENSE)  
[![Discord](https://img.shields.io/badge/Chat-Discord-7289DA.svg)](#)

---

## Table of Contents  
1. [About The Project](#about-the-project)  
2. [Features](#features)  
3. [Getting Started](#getting-started)  
   - [Prerequisites](#prerequisites)  
   - [Installation](#installation)  
4. [Usage](#usage)  
5. [Contributing](#contributing)  
6. [Roadmap](#roadmap)  
7. [License](#license)  
8. [Contact](#contact)  
9. [Acknowledgements](#acknowledgements)  

---

## About The Project  
**Epochs of Empires** is a turn-based strategy game where you start in the **Stone Age** on a **huge** procedurally generated world.  
Grow your civilization by:  
- Managing resources (Food, Wood, Stone, Iron, Gold, Oil, Tech Points)  
- Researching 11 distinct ages (Stone → Digital)  
- Training 200+ units (Foragers, Knights, Tanks, Drone Swarms, etc.)  
- Building cities, wonders, and leveraging events (plagues, volcanic eruptions)  
- Forging alliances or conquering foes in FFA or team modes  

![Gameplay Preview](docs/screenshot.png)  

---

## Features  
- **11 Ages of Progression**: Unlock new techs, units & buildings each era.  
- **Dynamic Resources**: Forests → Logging Camps, Plains → Farms, Oil Wells → Offshore Rigs, …  
- **Transport & Logistics**: Roads, naval transports, cargo planes.  
- **Multiple Victory Conditions**: Conquest, Culture (Wonders), Technology, Economy, Diplomacy.  
- **Random World Events**: Plague, Volcanic Eruption, Solar Flare.  
- **Custom Scenarios & Editor**: Design and share your own maps and events.  
- **AI Personalities & Difficulty**: From peaceful traders to warmongers.  

---

## Getting Started  

### Prerequisites  
- **Node.js** v14+  
- **npm** v6+  

### Installation  
```bash
# Clone the repo
git clone https://github.com/yourusername/epochs-of-empires.git
cd epochs-of-empires

# Install dependencies
npm install

# Start in development mode
npm run dev

Usage
Launch a Skirmish
bash
Copy
Edit
npm run start -- \
  --mapSize huge \
  --startAge StoneAge \
  --mode ffa
In-Game Console (Dev Only)
Press ~ to open console and enter debug commands:

js
Copy
Edit
// Advance research to Renaissance Age
game.research.complete('Gunpowder');
// Spawn 100 Food
game.resources.add('Food', 100);
Contributing
We love contributions! Please read our CONTRIBUTING.md for guidelines.

Fork the repository

Create your feature branch

Commit your changes with clear messages

Push to your branch and open a Pull Request

Roadmap

Milestone	Description	ETA
v0.1.0	Core gameplay: Ages 1–5, single-player skirmish	Q3 2025
v0.2.0	All 11 ages, AI tuning, UI polish	Q4 2025
v1.0.0	Multiplayer & Scenario Editor	Q1 2026
v1.1.0	Mobile port, accessibility features	Q3 2026
License
Distributed under the MIT License. See LICENSE for more information.

Contact
Lead Developer: Your Name – youremail@example.com
Project: https://github.com/yourusername/epochs-of-empires
Discord: https://discord.gg/your-invite

Acknowledgements
GameMaker Blog: Running a Successful Crowdfunding Campaign

Awesome README

Readme Best Practices

All our early playtesters and contributors!
