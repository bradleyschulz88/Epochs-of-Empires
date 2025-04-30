import { resourceTileTypes } from './resources.js';
import { buildingTypes } from './buildings.js';

export class TradeSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.marketPrices = this.initializeMarketPrices();
    }

    /**
     * Initialize base market prices for resources
     */
    initializeMarketPrices() {
        return {
            food: 10,
            wood: 8,
            stone: 12,
            iron: 20,
            gold: 1,
            // Add other resources as needed
        };
    }

    /**
     * Create a new trade route
     */
    createTradeRoute(sourcePlayer, targetPlayer, resource, amount, duration) {
        if (!this.canEstablishTradeRoute(sourcePlayer, targetPlayer, resource, amount)) {
            return {
                success: false,
                reason: this.getTradeBlocker(sourcePlayer, targetPlayer, resource, amount)
            };
        }

        const routeCost = this.calculateRouteCost(sourcePlayer, targetPlayer, resource, amount);
        const tradePrice = this.calculateTradePrice(resource, amount);

        const route = {
            id: this.generateRouteId(),
            source: sourcePlayer.index,
            target: targetPlayer.index,
            resource: resource,
            amount: amount,
            duration: duration,
            remainingTurns: duration,
            cost: routeCost,
            price: tradePrice
        };

        // Add route to both players
        if (!sourcePlayer.tradeRoutes) sourcePlayer.tradeRoutes = [];
        if (!targetPlayer.tradeRoutes) targetPlayer.tradeRoutes = [];

        sourcePlayer.tradeRoutes.push({...route, direction: 'export'});
        targetPlayer.tradeRoutes.push({...route, direction: 'import'});

        return {
            success: true,
            route: route
        };
    }

    /**
     * Generate unique trade route ID
     */
    generateRouteId() {
        return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if a trade route can be established
     */
    canEstablishTradeRoute(sourcePlayer, targetPlayer, resource, amount) {
        // Check if players have markets
        if (!this.hasMarket(sourcePlayer) || !this.hasMarket(targetPlayer)) {
            return false;
        }

        // Check diplomatic status
        if (!this.canTrade(sourcePlayer, targetPlayer)) {
            return false;
        }

        // Check resource availability
        if (!sourcePlayer.resources[resource] || 
            sourcePlayer.resources[resource] < amount) {
            return false;
        }

        // Check trade route limits
        const maxRoutes = this.getMaxTradeRoutes(sourcePlayer);
        if (sourcePlayer.tradeRoutes?.length >= maxRoutes) {
            return false;
        }

        return true;
    }

    /**
     * Get reason why trade route cannot be established
     */
    getTradeBlocker(sourcePlayer, targetPlayer, resource, amount) {
        if (!this.hasMarket(sourcePlayer)) {
            return 'Source player needs a market';
        }

        if (!this.hasMarket(targetPlayer)) {
            return 'Target player needs a market';
        }

        if (!this.canTrade(sourcePlayer, targetPlayer)) {
            return 'Players cannot trade due to diplomatic status';
        }

        if (!sourcePlayer.resources[resource] || 
            sourcePlayer.resources[resource] < amount) {
            return 'Insufficient resources for trade';
        }

        const maxRoutes = this.getMaxTradeRoutes(sourcePlayer);
        if (sourcePlayer.tradeRoutes?.length >= maxRoutes) {
            return 'Trade route limit reached';
        }

        return 'Unknown reason';
    }

    /**
     * Check if player has a market
     */
    hasMarket(player) {
        return this.gameState.map.some(row =>
            row.some(tile =>
                tile.building?.owner === player.index &&
                tile.building?.type === 'market'
            )
        );
    }

    /**
     * Check if two players can trade
     */
    canTrade(player1, player2) {
        // Can't trade with self
        if (player1.index === player2.index) {
            return false;
        }

        // Can't trade while at war
        if (this.areAtWar(player1, player2)) {
            return false;
        }

        return true;
    }

    /**
     * Check if two players are at war
     */
    areAtWar(player1, player2) {
        return player1.enemies?.includes(player2.index) ||
               player2.enemies?.includes(player1.index);
    }

    /**
     * Get maximum number of trade routes a player can have
     */
    getMaxTradeRoutes(player) {
        let max = 2; // Base number

        // Bonus from markets
        max += this.countBuildings(player, 'market');

        // Bonus from technologies
        if (player.technologies?.includes('trade_networks')) {
            max += 2;
        }
        if (player.technologies?.includes('advanced_commerce')) {
            max += 2;
        }

        return max;
    }

    /**
     * Count buildings of a specific type
     */
    countBuildings(player, buildingType) {
        let count = 0;
        
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                if (tile.building && 
                    tile.building.owner === player.index && 
                    tile.building.type === buildingType) {
                    count++;
                }
            });
        });
        
        return count;
    }

    /**
     * Calculate trade route establishment cost
     */
    calculateRouteCost(sourcePlayer, targetPlayer, resource, amount) {
        let cost = Math.ceil(amount * 0.1); // Base cost

        // Distance modifier
        const distance = this.calculateTradeDistance(sourcePlayer, targetPlayer);
        cost *= (1 + distance * 0.1);

        // Technology discounts
        if (sourcePlayer.technologies?.includes('trade_networks')) {
            cost *= 0.8;
        }

        return Math.ceil(cost);
    }

    /**
     * Calculate trade distance between players
     */
    calculateTradeDistance(player1, player2) {
        // Find closest markets between players
        let minDistance = Infinity;

        this.gameState.map.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (tile.building?.type === 'market' && 
                    tile.building?.owner === player1.index) {
                    // Find closest market of player2
                    this.gameState.map.forEach((row2, y2) => {
                        row2.forEach((tile2, x2) => {
                            if (tile2.building?.type === 'market' && 
                                tile2.building?.owner === player2.index) {
                                const distance = Math.sqrt(
                                    Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2)
                                );
                                minDistance = Math.min(minDistance, distance);
                            }
                        });
                    });
                }
            });
        });

        return Math.ceil(minDistance);
    }

    /**
     * Calculate trade price for resources
     */
    calculateTradePrice(resource, amount) {
        let basePrice = this.marketPrices[resource] * amount;

        // Adjust based on market conditions
        basePrice *= this.getMarketMultiplier(resource);

        return Math.ceil(basePrice);
    }

    /**
     * Get market price multiplier based on supply/demand
     */
    getMarketMultiplier(resource) {
        let totalSupply = 0;
        let totalDemand = 0;

        this.gameState.players.forEach(player => {
            // Calculate supply
            totalSupply += player.resources[resource] || 0;

            // Calculate demand based on various factors
            totalDemand += this.calculateResourceDemand(resource, player);
        });

        // Calculate multiplier based on supply/demand ratio
        const ratio = totalDemand / (totalSupply || 1);
        return Math.max(0.5, Math.min(2, ratio));
    }

    /**
     * Calculate resource demand for a player
     */
    calculateResourceDemand(resource, player) {
        let demand = 10; // Base demand

        // Add demand from buildings that consume this resource
        this.gameState.map.forEach(row => {
            row.forEach(tile => {
                if (tile.building?.owner === player.index) {
                    const building = buildingTypes[tile.building.type];
                    if (building.consumes?.[resource]) {
                        demand += building.consumes[resource];
                    }
                }
            });
        });

        // Add demand from units that need this resource
        if (player.units) {
            player.units.forEach(unit => {
                if (unit.upkeep?.[resource]) {
                    demand += unit.upkeep[resource];
                }
            });
        }

        return demand;
    }

    /**
     * Process all trade routes for a turn
     */
    processTradeRoutes() {
        this.gameState.players.forEach(player => {
            if (!player.tradeRoutes?.length) return;

            player.tradeRoutes.forEach((route, index) => {
                if (this.processTradeRoute(route, player)) {
                    route.remainingTurns--;

                    // Remove expired routes
                    if (route.remainingTurns <= 0) {
                        player.tradeRoutes.splice(index, 1);
                    }
                }
            });
        });

        // Update market prices
        this.updateMarketPrices();
    }

    /**
     * Process a single trade route
     */
    processTradeRoute(route, player) {
        const otherPlayer = this.gameState.players[
            route.direction === 'export' ? route.target - 1 : route.source - 1
        ];

        // Verify trade can still occur
        if (!this.canTrade(player, otherPlayer)) {
            return false;
        }

        if (route.direction === 'export') {
            // Check resource availability
            if (!player.resources[route.resource] || 
                player.resources[route.resource] < route.amount) {
                return false;
            }

            // Transfer resources
            player.resources[route.resource] -= route.amount;
            player.resources.gold += route.price;

            otherPlayer.resources[route.resource] += route.amount;
            otherPlayer.resources.gold -= route.price;
        }

        return true;
    }

    /**
     * Update market prices based on supply and demand
     */
    updateMarketPrices() {
        Object.keys(this.marketPrices).forEach(resource => {
            const multiplier = this.getMarketMultiplier(resource);
            const volatility = 0.1; // 10% maximum price change per turn
            const change = (multiplier - 1) * volatility;

            this.marketPrices[resource] *= (1 + change);
            this.marketPrices[resource] = Math.max(1, this.marketPrices[resource]);
        });
    }

    /**
     * Propose a diplomatic trade deal
     */
    proposeTradeDeal(sourcePlayer, targetPlayer, offer, request) {
        if (!this.canTrade(sourcePlayer, targetPlayer)) {
            return {
                success: false,
                reason: 'Cannot trade with this player'
            };
        }

        // Verify source player has offered resources
        if (!this.hasResources(sourcePlayer, offer)) {
            return {
                success: false,
                reason: 'Insufficient resources to offer'
            };
        }

        // Verify target player has requested resources
        if (!this.hasResources(targetPlayer, request)) {
            return {
                success: false,
                reason: 'Target player cannot fulfill request'
            };
        }

        // Create trade proposal
        const proposal = {
            id: this.generateRouteId(),
            source: sourcePlayer.index,
            target: targetPlayer.index,
            offer: offer,
            request: request,
            status: 'pending'
        };

        // Add to pending trades
        if (!targetPlayer.pendingTradeDeals) {
            targetPlayer.pendingTradeDeals = [];
        }
        targetPlayer.pendingTradeDeals.push(proposal);

        return {
            success: true,
            proposal: proposal
        };
    }

    /**
     * Check if player has required resources
     */
    hasResources(player, resources) {
        return Object.entries(resources).every(([resource, amount]) =>
            player.resources[resource] >= amount
        );
    }

    /**
     * Accept a trade deal
     */
    acceptTradeDeal(dealId, player) {
        const deal = player.pendingTradeDeals?.find(d => d.id === dealId);
        if (!deal) {
            return {
                success: false,
                reason: 'Trade deal not found'
            };
        }

        const sourcePlayer = this.gameState.players[deal.source - 1];
        const targetPlayer = this.gameState.players[deal.target - 1];

        // Verify resources are still available
        if (!this.hasResources(sourcePlayer, deal.offer) || 
            !this.hasResources(targetPlayer, deal.request)) {
            return {
                success: false,
                reason: 'Required resources no longer available'
            };
        }

        // Transfer resources
        this.transferResources(sourcePlayer, targetPlayer, deal.offer);
        this.transferResources(targetPlayer, sourcePlayer, deal.request);

        // Remove from pending deals
        const dealIndex = player.pendingTradeDeals.findIndex(d => d.id === dealId);
        player.pendingTradeDeals.splice(dealIndex, 1);

        return {
            success: true
        };
    }

    /**
     * Transfer resources between players
     */
    transferResources(fromPlayer, toPlayer, resources) {
        Object.entries(resources).forEach(([resource, amount]) => {
            fromPlayer.resources[resource] -= amount;
            if (!toPlayer.resources[resource]) {
                toPlayer.resources[resource] = 0;
            }
            toPlayer.resources[resource] += amount;
        });
    }
}