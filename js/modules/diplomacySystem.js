export class DiplomacySystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.relationshipThresholds = {
            war: -75,
            hostile: -50,
            unfriendly: -25,
            neutral: 0,
            friendly: 25,
            allied: 75
        };
    }

    /**
     * Initialize diplomatic relations between all players
     */
    initializeRelations() {
        this.gameState.players.forEach(player => {
            if (!player.relations) {
                player.relations = {};
                
                this.gameState.players.forEach(otherPlayer => {
                    if (player.index !== otherPlayer.index) {
                        player.relations[otherPlayer.index] = {
                            value: 0, // Start neutral
                            status: 'neutral',
                            treaties: []
                        };
                    }
                });
            }
        });
    }

    /**
     * Update diplomatic relations between players
     */
    updateRelations() {
        this.gameState.players.forEach(player => {
            Object.entries(player.relations).forEach(([otherIndex, relation]) => {
                // Natural relation drift towards neutral
                if (relation.value > 0) {
                    relation.value = Math.max(0, relation.value - 0.5);
                } else if (relation.value < 0) {
                    relation.value = Math.min(0, relation.value + 0.5);
                }

                // Update diplomatic status based on relation value
                relation.status = this.getDiplomaticStatus(relation.value);
            });
        });
    }

    /**
     * Get diplomatic status based on relation value
     */
    getDiplomaticStatus(relationValue) {
        if (relationValue <= this.relationshipThresholds.war) return 'war';
        if (relationValue <= this.relationshipThresholds.hostile) return 'hostile';
        if (relationValue <= this.relationshipThresholds.unfriendly) return 'unfriendly';
        if (relationValue < this.relationshipThresholds.friendly) return 'neutral';
        if (relationValue < this.relationshipThresholds.allied) return 'friendly';
        return 'allied';
    }

    /**
     * Propose a diplomatic treaty
     */
    proposeTreaty(sourcePlayer, targetPlayer, treatyType, terms = {}) {
        if (!this.canProposeTreaty(sourcePlayer, targetPlayer, treatyType)) {
            return {
                success: false,
                reason: this.getTreatyBlocker(sourcePlayer, targetPlayer, treatyType)
            };
        }

        const proposal = {
            id: this.generateTreatyId(),
            type: treatyType,
            source: sourcePlayer.index,
            target: targetPlayer.index,
            terms: terms,
            status: 'pending'
        };

        // Add to pending treaties
        if (!targetPlayer.pendingTreaties) {
            targetPlayer.pendingTreaties = [];
        }
        targetPlayer.pendingTreaties.push(proposal);

        return {
            success: true,
            proposal: proposal
        };
    }

    /**
     * Generate unique treaty ID
     */
    generateTreatyId() {
        return `treaty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if a treaty can be proposed
     */
    canProposeTreaty(sourcePlayer, targetPlayer, treatyType) {
        // Can't propose to self
        if (sourcePlayer.index === targetPlayer.index) {
            return false;
        }

        const relation = sourcePlayer.relations[targetPlayer.index];

        // Check treaty-specific requirements
        switch (treatyType) {
            case 'peace':
                return this.areAtWar(sourcePlayer, targetPlayer);
            case 'alliance':
                return relation.value >= this.relationshipThresholds.friendly && 
                       !this.areAllied(sourcePlayer, targetPlayer);
            case 'tradeAgreement':
                return relation.value >= this.relationshipThresholds.neutral && 
                       !this.haveTradeAgreement(sourcePlayer, targetPlayer);
            case 'warDeclaration':
                return !this.areAtWar(sourcePlayer, targetPlayer) && 
                       !this.areAllied(sourcePlayer, targetPlayer);
        }

        return false;
    }

    /**
     * Get reason why a treaty cannot be proposed
     */
    getTreatyBlocker(sourcePlayer, targetPlayer, treatyType) {
        if (sourcePlayer.index === targetPlayer.index) {
            return 'Cannot propose treaty with self';
        }

        const relation = sourcePlayer.relations[targetPlayer.index];

        switch (treatyType) {
            case 'peace':
                if (!this.areAtWar(sourcePlayer, targetPlayer)) {
                    return 'Not at war with target player';
                }
                break;
            case 'alliance':
                if (relation.value < this.relationshipThresholds.friendly) {
                    return 'Relations not friendly enough';
                }
                if (this.areAllied(sourcePlayer, targetPlayer)) {
                    return 'Already allied';
                }
                break;
            case 'tradeAgreement':
                if (relation.value < this.relationshipThresholds.neutral) {
                    return 'Relations not good enough';
                }
                if (this.haveTradeAgreement(sourcePlayer, targetPlayer)) {
                    return 'Trade agreement already exists';
                }
                break;
            case 'warDeclaration':
                if (this.areAtWar(sourcePlayer, targetPlayer)) {
                    return 'Already at war';
                }
                if (this.areAllied(sourcePlayer, targetPlayer)) {
                    return 'Cannot declare war on ally';
                }
                break;
        }

        return 'Unknown reason';
    }

    /**
     * Accept a treaty proposal
     */
    acceptTreaty(treatyId, player) {
        const treaty = player.pendingTreaties?.find(t => t.id === treatyId);
        if (!treaty) {
            return {
                success: false,
                reason: 'Treaty not found'
            };
        }

        const sourcePlayer = this.gameState.players[treaty.source - 1];
        const targetPlayer = this.gameState.players[treaty.target - 1];

        // Apply treaty effects
        this.applyTreatyEffects(treaty, sourcePlayer, targetPlayer);

        // Remove from pending treaties
        const treatyIndex = player.pendingTreaties.findIndex(t => t.id === treatyId);
        player.pendingTreaties.splice(treatyIndex, 1);

        return {
            success: true
        };
    }

    /**
     * Apply effects of an accepted treaty
     */
    applyTreatyEffects(treaty, sourcePlayer, targetPlayer) {
        // Add treaty to both players' active treaties
        this.addActiveTreaty(treaty, sourcePlayer, targetPlayer);

        // Apply treaty-specific effects
        switch (treaty.type) {
            case 'peace':
                this.endWar(sourcePlayer, targetPlayer);
                break;
            case 'alliance':
                this.formAlliance(sourcePlayer, targetPlayer);
                break;
            case 'tradeAgreement':
                this.establishTradeAgreement(sourcePlayer, targetPlayer);
                break;
            case 'warDeclaration':
                this.declareWar(sourcePlayer, targetPlayer);
                break;
        }
    }

    /**
     * Add an active treaty between players
     */
    addActiveTreaty(treaty, player1, player2) {
        [player1, player2].forEach(player => {
            if (!player.activeTreaties) {
                player.activeTreaties = {};
            }
            if (!player.activeTreaties[treaty.type]) {
                player.activeTreaties[treaty.type] = [];
            }
            player.activeTreaties[treaty.type].push(treaty);
        });
    }

    /**
     * End war between two players
     */
    endWar(player1, player2) {
        // Remove war status
        player1.relations[player2.index].status = 'unfriendly';
        player2.relations[player1.index].status = 'unfriendly';

        // Set relations to minimum non-war value
        const minValue = this.relationshipThresholds.war + 1;
        player1.relations[player2.index].value = minValue;
        player2.relations[player1.index].value = minValue;

        // Clear enemy status
        if (player1.enemies) {
            const index = player1.enemies.indexOf(player2.index);
            if (index !== -1) player1.enemies.splice(index, 1);
        }
        if (player2.enemies) {
            const index = player2.enemies.indexOf(player1.index);
            if (index !== -1) player2.enemies.splice(index, 1);
        }
    }

    /**
     * Form alliance between two players
     */
    formAlliance(player1, player2) {
        // Set allied status
        player1.relations[player2.index].status = 'allied';
        player2.relations[player1.index].status = 'allied';

        // Set high relation value
        player1.relations[player2.index].value = this.relationshipThresholds.allied;
        player2.relations[player1.index].value = this.relationshipThresholds.allied;

        // Add to allies list
        if (!player1.allies) player1.allies = [];
        if (!player2.allies) player2.allies = [];
        
        if (!player1.allies.includes(player2.index)) {
            player1.allies.push(player2.index);
        }
        if (!player2.allies.includes(player1.index)) {
            player2.allies.push(player1.index);
        }
    }

    /**
     * Establish trade agreement between players
     */
    establishTradeAgreement(player1, player2) {
        // Improve relations
        this.modifyRelations(player1, player2, 10);

        // Add trade bonuses
        [player1, player2].forEach(player => {
            if (!player.tradeBonuses) player.tradeBonuses = {};
            player.tradeBonuses[`trade_with_${player === player1 ? player2.index : player1.index}`] = {
                tradeCostReduction: 0.1,
                resourceBonus: 0.05
            };
        });
    }

    /**
     * Declare war between players
     */
    declareWar(player1, player2) {
        // Set war status
        player1.relations[player2.index].status = 'war';
        player2.relations[player1.index].status = 'war';

        // Set very negative relations
        player1.relations[player2.index].value = this.relationshipThresholds.war;
        player2.relations[player1.index].value = this.relationshipThresholds.war;

        // Add to enemies list
        if (!player1.enemies) player1.enemies = [];
        if (!player2.enemies) player2.enemies = [];
        
        if (!player1.enemies.includes(player2.index)) {
            player1.enemies.push(player2.index);
        }
        if (!player2.enemies.includes(player1.index)) {
            player2.enemies.push(player1.index);
        }

        // Break existing treaties
        this.breakAllTreaties(player1, player2);

        // Notify allies
        this.notifyAlliesOfWar(player1, player2);
    }

    /**
     * Break all treaties between players
     */
    breakAllTreaties(player1, player2) {
        [player1, player2].forEach(player => {
            if (player.activeTreaties) {
                Object.values(player.activeTreaties).forEach(treaties => {
                    const otherPlayer = player === player1 ? player2 : player1;
                    const index = treaties.findIndex(t => 
                        t.source === otherPlayer.index || t.target === otherPlayer.index
                    );
                    if (index !== -1) {
                        treaties.splice(index, 1);
                    }
                });
            }
        });
    }

    /**
     * Notify allies when war is declared
     */
    notifyAlliesOfWar(aggressor, defender) {
        // Decrease relations with aggressor's allies
        if (defender.allies) {
            defender.allies.forEach(allyIndex => {
                const ally = this.gameState.players[allyIndex - 1];
                this.modifyRelations(ally, aggressor, -25);
            });
        }

        // Give allies option to join war
        this.offerWarParticipation(aggressor, defender);
    }

    /**
     * Offer allies chance to join war
     */
    offerWarParticipation(aggressor, defender) {
        if (defender.allies) {
            defender.allies.forEach(allyIndex => {
                const ally = this.gameState.players[allyIndex - 1];
                if (!ally.pendingWarParticipation) {
                    ally.pendingWarParticipation = [];
                }
                
                ally.pendingWarParticipation.push({
                    id: this.generateTreatyId(),
                    type: 'warParticipation',
                    aggressor: aggressor.index,
                    defender: defender.index,
                    expires: this.gameState.turn + 3
                });
            });
        }
    }

    /**
     * Modify relations between two players
     */
    modifyRelations(player1, player2, amount) {
        player1.relations[player2.index].value += amount;
        player2.relations[player1.index].value += amount;

        // Update status based on new value
        player1.relations[player2.index].status = 
            this.getDiplomaticStatus(player1.relations[player2.index].value);
        player2.relations[player1.index].status = 
            this.getDiplomaticStatus(player2.relations[player1.index].value);
    }

    /**
     * Check if players are at war
     */
    areAtWar(player1, player2) {
        return player1.relations[player2.index].status === 'war' ||
               player2.relations[player1.index].status === 'war';
    }

    /**
     * Check if players are allied
     */
    areAllied(player1, player2) {
        return player1.relations[player2.index].status === 'allied' ||
               player2.relations[player1.index].status === 'allied';
    }

    /**
     * Check if players have a trade agreement
     */
    haveTradeAgreement(player1, player2) {
        return player1.activeTreaties?.tradeAgreement?.some(t => 
            t.source === player2.index || t.target === player2.index
        ) || player2.activeTreaties?.tradeAgreement?.some(t => 
            t.source === player1.index || t.target === player1.index
        );
    }
}