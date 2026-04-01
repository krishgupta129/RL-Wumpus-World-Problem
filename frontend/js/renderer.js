/**
 * Renderer Module
 * Handles all visual rendering of the game
 */

const Renderer = {
    // DOM Elements
    elements: {
        gameBoard: null,
        gameOverOverlay: null,
        gameOverTitle: null,
        gameOverMessage: null,
        finalScore: null,
        gameMessage: null,
        scoreValue: null,
        arrowsValue: null,
        goldValue: null,
        movesValue: null,
        wumpusKilledValue: null,
        perceptStench: null,
        perceptBreeze: null,
        perceptGlitter: null,
    },
    
    // Game dimensions
    gridWidth: 5,
    gridHeight: 5,
    
    // Cell size (will be calculated dynamically)
    cellSize: 70,
    
    /**
     * Initialize the renderer
     */
    init() {
        this.cacheElements();
        this.calculateCellSize();
        window.addEventListener('resize', () => this.calculateCellSize());
    },
    
    /**
     * Cache DOM elements for faster access
     */
    cacheElements() {
        this.elements.gameBoard = document.getElementById('game-board');
        this.elements.gameOverOverlay = document.getElementById('game-over-overlay');
        this.elements.gameOverTitle = document.getElementById('game-over-title');
        this.elements.gameOverMessage = document.getElementById('game-over-message');
        this.elements.finalScore = document.getElementById('final-score');
        this.elements.gameMessage = document.getElementById('game-message');
        this.elements.scoreValue = document.getElementById('score-value');
        this.elements.arrowsValue = document.getElementById('arrows-value');
        this.elements.goldValue = document.getElementById('gold-value');
        this.elements.movesValue = document.getElementById('moves-value');
        this.elements.wumpusKilledValue = document.getElementById('wumpus-killed-value');
        this.elements.perceptStench = document.getElementById('percept-stench');
        this.elements.perceptBreeze = document.getElementById('percept-breeze');
        this.elements.perceptGlitter = document.getElementById('percept-glitter');
    },
    
    /**
     * Calculate optimal cell size based on container
     */
    calculateCellSize() {
        const container = document.querySelector('.game-board-container');
        if (!container) return;
        
        const containerWidth = container.clientWidth - 64; // Padding
        const containerHeight = container.clientHeight - 64;
        
        const maxCellWidth = Math.floor(containerWidth / this.gridWidth);
        const maxCellHeight = Math.floor(containerHeight / this.gridHeight);
        
        this.cellSize = Math.min(maxCellWidth, maxCellHeight, 80);
        this.cellSize = Math.max(this.cellSize, 40); // Minimum size
        
        this.updateCellSizes();
    },
    
    /**
     * Update CSS cell sizes
     */
    updateCellSizes() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.width = `${this.cellSize}px`;
            cell.style.height = `${this.cellSize}px`;
        });
    },
    
    /**
     * Create the game board grid
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     */
    createBoard(width, height) {
        this.gridWidth = width;
        this.gridHeight = height;
        this.calculateCellSize();
        
        const board = this.elements.gameBoard;
        board.innerHTML = '';
        board.style.gridTemplateColumns = `repeat(${width}, ${this.cellSize}px)`;
        board.style.gridTemplateRows = `repeat(${height}, ${this.cellSize}px)`;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell undiscovered';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.id = `cell-${x}-${y}`;
                cell.style.width = `${this.cellSize}px`;
                cell.style.height = `${this.cellSize}px`;
                
                // Add content container
                const content = document.createElement('div');
                content.className = 'cell-content';
                cell.appendChild(content);
                
                board.appendChild(cell);
            }
        }
    },
    
    /**
     * Render the full game state
     * @param {Object} state - Game state from backend
     */
    renderState(state) {
        if (!state) return;
        
        const { grid, player_pos, player_direction, percepts } = state;
        
        // Render each cell
        grid.forEach((row, y) => {
            row.forEach((cellData, x) => {
                this.renderCell(x, y, cellData, player_pos, player_direction);
            });
        });
        
        // Update UI elements
        this.updateStats(state);
        this.updatePercepts(percepts);
        this.updateMessage(state.message);
        
        // Handle game over
        if (state.game_over) {
            this.showGameOver(state.won, state.score, state.message);
        }
    },
    
    /**
     * Render a single cell
     * @param {number} x - Cell X position
     * @param {number} y - Cell Y position
     * @param {Object} cellData - Cell information
     * @param {Array} playerPos - Player position [x, y]
     * @param {string} playerDirection - Player facing direction
     */
    renderCell(x, y, cellData, playerPos, playerDirection) {
        const cell = document.getElementById(`cell-${x}-${y}`);
        if (!cell) return;
        
        const content = cell.querySelector('.cell-content');
        content.innerHTML = '';
        
        // Set discovered/undiscovered state
        cell.className = `cell ${cellData.visited ? 'discovered' : 'undiscovered'}`;
        
        // Only show contents of visited cells (except player)
        const isPlayerHere = playerPos[0] === x && playerPos[1] === y;
        
        if (cellData.visited) {
            // Render hazards and items
            if (cellData.has_pit) {
                this.addCellObject(content, 'pit');
            }
            
            if (cellData.has_wumpus) {
                this.addCellObject(content, 'wumpus');
            }
            
            if (cellData.has_dead_wumpus && !cellData.has_wumpus) {
                this.addCellObject(content, 'dead-wumpus');
            }
            
            if (cellData.has_gold) {
                this.addCellObject(content, 'gold');
            }
            
            // Render percepts
            this.renderCellPercepts(content, cellData);
        }
        
        // Always render player if here
        if (isPlayerHere) {
            this.addPlayerSprite(content, playerDirection);
        }
    },
    
    /**
     * Add an object to a cell
     * @param {HTMLElement} container - Cell content container
     * @param {string} type - Object type
     */
    addCellObject(container, type) {
        const obj = document.createElement('div');
        obj.className = `cell-object ${type}`;
        container.appendChild(obj);
    },
    
    /**
     * Add player sprite to cell
     * @param {HTMLElement} container - Cell content container
     * @param {string} direction - Facing direction
     */
    addPlayerSprite(container, direction) {
        const player = document.createElement('div');
        player.className = `cell-object player facing-${direction}`;
        container.appendChild(player);
    },
    
    /**
     * Render percept labels on cell
     * @param {HTMLElement} container - Cell content container
     * @param {Object} cellData - Cell information
     */
    renderCellPercepts(container, cellData) {
        const percepts = [];
        
        if (cellData.stench) {
            percepts.push({ type: 'stench', text: 'Stench' });
        }
        
        if (cellData.breeze) {
            percepts.push({ type: 'breeze', text: 'Breeze' });
        }
        
        if (percepts.length > 0) {
            const perceptsContainer = document.createElement('div');
            perceptsContainer.className = 'cell-percepts-container';
            
            percepts.forEach(p => {
                const label = document.createElement('span');
                label.className = `cell-percept ${p.type}`;
                label.textContent = p.text;
                perceptsContainer.appendChild(label);
            });
            
            container.appendChild(perceptsContainer);
        }
    },
    
    /**
     * Update game statistics display
     * @param {Object} state - Game state
     */
    updateStats(state) {
        if (this.elements.scoreValue) {
            this.elements.scoreValue.textContent = state.score;
            this.elements.scoreValue.className = `stat-value ${state.score >= 0 ? 'positive' : 'negative'}`;
        }
        
        if (this.elements.arrowsValue) {
            this.elements.arrowsValue.textContent = `${state.arrows}/${state.max_arrows}`;
        }
        
        if (this.elements.goldValue) {
            this.elements.goldValue.textContent = `${state.gold_collected}/${state.total_gold}`;
        }
        
        if (this.elements.movesValue) {
            this.elements.movesValue.textContent = state.moves;
        }
        
        if (this.elements.wumpusKilledValue) {
            this.elements.wumpusKilledValue.textContent = `${state.wumpus_killed}/${state.total_wumpus}`;
        }
    },
    
    /**
     * Update percept indicators
     * @param {Object} percepts - Current percepts
     */
    updatePercepts(percepts) {
        if (!percepts) return;
        
        if (this.elements.perceptStench) {
            this.elements.perceptStench.className = `percept-item ${percepts.stench ? 'active' : 'inactive'}`;
        }
        
        if (this.elements.perceptBreeze) {
            this.elements.perceptBreeze.className = `percept-item ${percepts.breeze ? 'active' : 'inactive'}`;
        }
        
        if (this.elements.perceptGlitter) {
            this.elements.perceptGlitter.className = `percept-item ${percepts.glitter ? 'active' : 'inactive'}`;
        }
    },
    
    /**
     * Update game message
     * @param {string} message - Message to display
     * @param {string} type - Message type (info, warning, danger, success)
     */
    updateMessage(message, type = 'info') {
        if (this.elements.gameMessage) {
            this.elements.gameMessage.textContent = message || '';
        }
        
        const display = document.querySelector('.message-display');
        if (display) {
            display.className = `message-display ${type}`;
        }
    },
    
    /**
     * Show game over screen
     * @param {boolean} won - Whether player won
     * @param {number} score - Final score
     * @param {string} message - Game over message
     */
    showGameOver(won, score, message) {
        if (this.elements.gameOverOverlay) {
            this.elements.gameOverOverlay.classList.remove('hidden');
        }
        
        if (this.elements.gameOverTitle) {
            this.elements.gameOverTitle.textContent = won ? 'Victory!' : 'Game Over';
            this.elements.gameOverTitle.className = won ? 'won' : 'lost';
        }
        
        if (this.elements.gameOverMessage) {
            this.elements.gameOverMessage.textContent = message;
        }
        
        if (this.elements.finalScore) {
            this.elements.finalScore.textContent = `Final Score: ${score}`;
        }
    },
    
    /**
     * Hide game over screen
     */
    hideGameOver() {
        if (this.elements.gameOverOverlay) {
            this.elements.gameOverOverlay.classList.add('hidden');
        }
    },
    
    /**
     * Update training statistics
     * @param {Object} stats - Agent statistics
     */
    updateTrainingStats(stats) {
        const episodesEl = document.getElementById('train-episodes');
        const winrateEl = document.getElementById('train-winrate');
        const epsilonEl = document.getElementById('train-epsilon');
        const qtableEl = document.getElementById('train-qtable');
        
        if (episodesEl) episodesEl.textContent = stats.episodes_trained || 0;
        if (winrateEl) winrateEl.textContent = `${((stats.win_rate || 0) * 100).toFixed(1)}%`;
        if (epsilonEl) epsilonEl.textContent = (stats.epsilon || 1).toFixed(3);
        if (qtableEl) qtableEl.textContent = stats.q_table_size || 0;
    },
    
    /**
     * Show training progress
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} text - Progress text
     */
    showTrainingProgress(progress, text) {
        const progressContainer = document.getElementById('training-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
        }
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
    },
    
    /**
     * Hide training progress
     */
    hideTrainingProgress() {
        const progressContainer = document.getElementById('training-progress');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    },
    
    /**
     * Animate arrow shooting
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     * @param {string} direction - Shooting direction
     * @param {boolean} hit - Whether arrow hit something
     */
    animateArrow(startX, startY, direction, hit) {
        const startCell = document.getElementById(`cell-${startX}-${startY}`);
        if (!startCell) return;
        
        const rect = startCell.getBoundingClientRect();
        const arrow = document.createElement('div');
        arrow.className = 'arrow-animation';
        arrow.style.left = `${rect.left + rect.width / 2}px`;
        arrow.style.top = `${rect.top + rect.height / 2}px`;
        arrow.style.position = 'fixed';
        
        document.body.appendChild(arrow);
        
        const directionDeltas = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 },
        };
        
        const delta = directionDeltas[direction] || { x: 0, y: 0 };
        const distance = this.cellSize * 3;
        
        arrow.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { 
                transform: `translate(calc(-50% + ${delta.x * distance}px), calc(-50% + ${delta.y * distance}px)) scale(0.5)`,
                opacity: 0 
            }
        ], {
            duration: 300,
            easing: 'ease-out'
        }).onfinish = () => {
            arrow.remove();
        };
    },
    
    /**
     * Animate player movement
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     */
    animatePlayerMove(x, y) {
        const cell = document.getElementById(`cell-${x}-${y}`);
        if (!cell) return;
        
        const player = cell.querySelector('.player');
        if (player) {
            player.classList.add('player-moving');
            setTimeout(() => {
                player.classList.remove('player-moving');
            }, 200);
        }
    },
    
    /**
     * Highlight cell (for agent visualization)
     * @param {number} x - Cell X position
     * @param {number} y - Cell Y position
     * @param {boolean} highlight - Whether to highlight
     */
    highlightCell(x, y, highlight) {
        const cell = document.getElementById(`cell-${x}-${y}`);
        if (cell) {
            if (highlight) {
                cell.classList.add('agent-target');
            } else {
                cell.classList.remove('agent-target');
            }
        }
    },
    
    /**
     * Clear all cell highlights
     */
    clearHighlights() {
        document.querySelectorAll('.cell.agent-target').forEach(cell => {
            cell.classList.remove('agent-target');
        });
    }
};

// Export for use in other modules
window.Renderer = Renderer;
