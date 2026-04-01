/**
 * Game Logic Module
 * Handles game state management and player actions
 */

const Game = {
    // Current game state
    state: null,
    
    // Game mode
    isAgentMode: false,
    isAutoPlaying: false,
    autoPlayInterval: null,
    autoPlaySpeed: 500,
    
    // Input state for shooting
    isShootMode: false,
    
    // Callbacks
    onStateUpdate: null,
    
    /**
     * Initialize the game
     */
    async init() {
        this.bindKeyboardEvents();
        await this.loadAgentStats();
    },
    
    /**
     * Start a new game
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     */
    async startGame(width = 5, height = 5) {
        try {
            const response = await API.resetGame(width, height);
            
            if (response.success) {
                this.state = response.state;
                Renderer.createBoard(width, height);
                Renderer.renderState(this.state);
                Renderer.hideGameOver();
                this.stopAutoPlay();
                
                if (this.onStateUpdate) {
                    this.onStateUpdate(this.state);
                }
                
                return true;
            }
        } catch (error) {
            console.error('Failed to start game:', error);
            Renderer.updateMessage('Failed to connect to server. Make sure backend is running.', 'danger');
        }
        
        return false;
    },
    
    /**
     * Reset the current game
     */
    async resetGame() {
        const width = this.state?.width || 5;
        const height = this.state?.height || 5;
        return await this.startGame(width, height);
    },
    
    /**
     * Execute a player action
     * @param {string} action - Action to execute
     */
    async executeAction(action) {
        if (!this.state || this.state.game_over) return;
        
        try {
            const response = await API.executeAction(action);
            
            if (response.success) {
                this.state = response.state;
                
                // Animate if shooting
                if (action.startsWith('SHOOT_')) {
                    const direction = action.replace('SHOOT_', '').toLowerCase();
                    const hit = response.info?.message?.includes('killed');
                    Renderer.animateArrow(
                        this.state.player_pos[0],
                        this.state.player_pos[1],
                        direction,
                        hit
                    );
                }
                
                // Animate movement
                if (action.startsWith('MOVE_')) {
                    Renderer.animatePlayerMove(
                        this.state.player_pos[0],
                        this.state.player_pos[1]
                    );
                }
                
                Renderer.renderState(this.state);
                
                if (this.onStateUpdate) {
                    this.onStateUpdate(this.state);
                }
                
                return response;
            }
        } catch (error) {
            console.error('Failed to execute action:', error);
        }
        
        return null;
    },
    
    /**
     * Execute AI agent's next step
     */
    async agentStep() {
        if (!this.state || this.state.game_over) {
            this.stopAutoPlay();
            return null;
        }
        
        try {
            const response = await API.agentStep();
            
            if (response.success) {
                this.state = response.state;
                
                // Visual feedback for agent action
                Renderer.clearHighlights();
                
                // Animate based on action
                const action = response.action;
                if (action.startsWith('SHOOT_')) {
                    const direction = action.replace('SHOOT_', '').toLowerCase();
                    const hit = response.info?.message?.includes('killed');
                    Renderer.animateArrow(
                        this.state.player_pos[0],
                        this.state.player_pos[1],
                        direction,
                        hit
                    );
                }
                
                if (action.startsWith('MOVE_')) {
                    Renderer.animatePlayerMove(
                        this.state.player_pos[0],
                        this.state.player_pos[1]
                    );
                }
                
                Renderer.renderState(this.state);
                
                // Update message with agent's action
                const actionDisplay = action.replace(/_/g, ' ');
                Renderer.updateMessage(`Agent: ${actionDisplay} | ${this.state.message}`, 
                    this.state.game_over ? (this.state.won ? 'success' : 'danger') : 'info');
                
                if (this.onStateUpdate) {
                    this.onStateUpdate(this.state);
                }
                
                // Stop auto-play if game over
                if (this.state.game_over) {
                    this.stopAutoPlay();
                }
                
                return response;
            }
        } catch (error) {
            console.error('Failed to execute agent step:', error);
            this.stopAutoPlay();
        }
        
        return null;
    },
    
    /**
     * Start auto-playing with agent
     */
    startAutoPlay() {
        if (this.autoPlayInterval) return;
        
        this.isAutoPlaying = true;
        this.autoPlayInterval = setInterval(() => {
            this.agentStep();
        }, this.autoPlaySpeed);
        
        // Update button state
        const btn = document.getElementById('agent-auto-btn');
        if (btn) {
            btn.innerHTML = '<span class="btn-icon">⏹</span> Stop';
        }
    },
    
    /**
     * Stop auto-playing
     */
    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
        
        this.isAutoPlaying = false;
        
        // Update button state
        const btn = document.getElementById('agent-auto-btn');
        if (btn) {
            btn.innerHTML = '<span class="btn-icon">🤖</span> Auto Play';
        }
    },
    
    /**
     * Toggle auto-play
     */
    toggleAutoPlay() {
        if (this.isAutoPlaying) {
            this.stopAutoPlay();
        } else {
            this.startAutoPlay();
        }
    },
    
    /**
     * Set auto-play speed
     * @param {number} speed - Speed in milliseconds
     */
    setAutoPlaySpeed(speed) {
        this.autoPlaySpeed = speed;
        
        // Restart auto-play with new speed if running
        if (this.isAutoPlaying) {
            this.stopAutoPlay();
            this.startAutoPlay();
        }
    },
    
    /**
     * Set game mode
     * @param {boolean} agentMode - Whether to use agent mode
     */
    setAgentMode(agentMode) {
        this.isAgentMode = agentMode;
        this.stopAutoPlay();
        
        // Show/hide agent controls
        const agentControls = document.getElementById('agent-controls');
        if (agentControls) {
            agentControls.classList.toggle('hidden', !agentMode);
        }
        
        // Update keyboard hint
        const message = agentMode 
            ? 'Agent mode enabled. Use Step or Auto Play buttons.'
            : 'Manual mode. Use arrow keys to move.';
        Renderer.updateMessage(message);
    },
    
    /**
     * Train the AI agent
     * @param {number} episodes - Number of episodes
     */
    async trainAgent(episodes = 1000) {
        try {
            const width = this.state?.width || 5;
            const height = this.state?.height || 5;
            
            Renderer.showTrainingProgress(0, 'Starting training...');
            
            // Disable training button
            const trainBtn = document.getElementById('train-btn');
            if (trainBtn) trainBtn.disabled = true;
            
            const response = await API.trainAgent(episodes, width, height);
            
            if (response.success) {
                Renderer.showTrainingProgress(100, 'Training complete!');
                Renderer.updateTrainingStats(response.stats);
                
                setTimeout(() => {
                    Renderer.hideTrainingProgress();
                }, 2000);
                
                Renderer.updateMessage(
                    `Training complete! Win rate: ${(response.stats.win_rate * 100).toFixed(1)}%`,
                    'success'
                );
            }
            
            // Re-enable training button
            if (trainBtn) trainBtn.disabled = false;
            
            return response;
        } catch (error) {
            console.error('Training failed:', error);
            Renderer.hideTrainingProgress();
            Renderer.updateMessage('Training failed. Check console for details.', 'danger');
            
            const trainBtn = document.getElementById('train-btn');
            if (trainBtn) trainBtn.disabled = false;
        }
        
        return null;
    },
    
    /**
     * Load agent statistics
     */
    async loadAgentStats() {
        try {
            const response = await API.getAgentStats();
            if (response.success) {
                Renderer.updateTrainingStats(response.stats);
            }
        } catch (error) {
            console.error('Failed to load agent stats:', error);
        }
    },
    
    /**
     * Reset agent training
     */
    async resetTraining() {
        try {
            const response = await API.resetAgentTraining();
            if (response.success) {
                Renderer.updateTrainingStats(response.stats);
                Renderer.updateMessage('Agent training reset.', 'info');
            }
        } catch (error) {
            console.error('Failed to reset training:', error);
        }
    },
    
    /**
     * Bind keyboard events
     */
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    },
    
    /**
     * Handle keydown event
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        // Ignore if in agent mode or game over
        if (this.isAgentMode || !this.state || this.state.game_over) return;
        
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT') return;
        
        // Space key for shoot mode
        if (e.code === 'Space') {
            e.preventDefault();
            this.isShootMode = true;
            Renderer.updateMessage('Shoot mode! Press arrow key to fire.', 'warning');
            return;
        }
        
        // Enter key for grab
        if (e.code === 'Enter') {
            e.preventDefault();
            this.executeAction('GRAB');
            return;
        }
        
        // Arrow keys
        let action = null;
        
        switch (e.code) {
            case 'ArrowUp':
                action = this.isShootMode ? 'SHOOT_UP' : 'MOVE_UP';
                break;
            case 'ArrowDown':
                action = this.isShootMode ? 'SHOOT_DOWN' : 'MOVE_DOWN';
                break;
            case 'ArrowLeft':
                action = this.isShootMode ? 'SHOOT_LEFT' : 'MOVE_LEFT';
                break;
            case 'ArrowRight':
                action = this.isShootMode ? 'SHOOT_RIGHT' : 'MOVE_RIGHT';
                break;
        }
        
        if (action) {
            e.preventDefault();
            this.executeAction(action);
            
            // Reset shoot mode after shooting
            if (this.isShootMode) {
                this.isShootMode = false;
            }
        }
    },
    
    /**
     * Handle keyup event
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyUp(e) {
        // Reset shoot mode on space release
        if (e.code === 'Space') {
            this.isShootMode = false;
            if (!this.state?.game_over) {
                Renderer.updateMessage(this.state?.message || 'Ready');
            }
        }
    },
    
    /**
     * Get current game state
     * @returns {Object} Current state
     */
    getState() {
        return this.state;
    }
};

// Export for use in other modules
window.Game = Game;
