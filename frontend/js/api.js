/**
 * API Communication Module
 * Handles all communication with the FastAPI backend
 */

const API = {
    BASE_URL: 'http://localhost:8000',
    
    /**
     * Make an API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    },
    
    /**
     * Reset game with new configuration
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     * @param {number|null} seed - Random seed
     * @returns {Promise<Object>} Initial game state
     */
    async resetGame(width = 5, height = 5, seed = null) {
        const body = { width, height };
        if (seed !== null) body.seed = seed;
        
        return await this.request('/reset', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    },
    
    /**
     * Get current game state
     * @returns {Promise<Object>} Current game state
     */
    async getState() {
        return await this.request('/state');
    },
    
    /**
     * Execute a player action
     * @param {string} action - Action to execute
     * @returns {Promise<Object>} Result with new state
     */
    async executeAction(action) {
        return await this.request('/action', {
            method: 'POST',
            body: JSON.stringify({ action }),
        });
    },
    
    /**
     * Get and execute AI agent's next action
     * @returns {Promise<Object>} Agent action result
     */
    async agentStep() {
        return await this.request('/step', {
            method: 'POST',
        });
    },
    
    /**
     * Get AI agent's recommended action without executing
     * @returns {Promise<Object>} Recommended action
     */
    async getAgentRecommendation() {
        return await this.request('/step');
    },
    
    /**
     * Train the AI agent
     * @param {number} episodes - Number of training episodes
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     * @returns {Promise<Object>} Training results
     */
    async trainAgent(episodes = 1000, width = 5, height = 5) {
        return await this.request('/train', {
            method: 'POST',
            body: JSON.stringify({ episodes, width, height }),
        });
    },
    
    /**
     * Get agent statistics
     * @returns {Promise<Object>} Agent stats
     */
    async getAgentStats() {
        return await this.request('/agent/stats');
    },
    
    /**
     * Reset agent training
     * @returns {Promise<Object>} Reset result
     */
    async resetAgentTraining() {
        return await this.request('/agent/reset', {
            method: 'POST',
        });
    },
    
    /**
     * Update agent configuration
     * @param {Object} config - Configuration updates
     * @returns {Promise<Object>} Update result
     */
    async updateAgentConfig(config) {
        return await this.request('/agent/config', {
            method: 'PUT',
            body: JSON.stringify(config),
        });
    },
    
    /**
     * Get list of valid actions
     * @returns {Promise<Object>} Valid actions
     */
    async getValidActions() {
        return await this.request('/actions');
    },
};

// Export for use in other modules
window.API = API;
