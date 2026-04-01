/**
 * Main Application Entry Point
 * Initializes and connects all modules
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log(' Wumpus World Simulator initializing...');
    
    // Initialize modules
    Renderer.init();
    await Game.init();
    
    // Bind UI events
    bindUIEvents();
    
    // Initial state
    await Game.startGame(5, 5);
    
    console.log(' Wumpus World Simulator ready!');
});

/**
 * Bind all UI event listeners
 */
function bindUIEvents() {
    // Start button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            const width = parseInt(document.getElementById('grid-width')?.value) || 5;
            const height = parseInt(document.getElementById('grid-height')?.value) || 5;
            await Game.startGame(width, height);
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            await Game.resetGame();
        });
    }
    
    // Restart button (game over screen)
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', async () => {
            await Game.resetGame();
        });
    }
    
    // Agent mode toggle
    const agentToggle = document.getElementById('agent-mode-toggle');
    if (agentToggle) {
        agentToggle.addEventListener('change', (e) => {
            Game.setAgentMode(e.target.checked);
        });
    }
    
    // Agent step button
    const agentStepBtn = document.getElementById('agent-step-btn');
    if (agentStepBtn) {
        agentStepBtn.addEventListener('click', async () => {
            await Game.agentStep();
        });
    }
    
    // Agent auto-play button
    const agentAutoBtn = document.getElementById('agent-auto-btn');
    if (agentAutoBtn) {
        agentAutoBtn.addEventListener('click', () => {
            Game.toggleAutoPlay();
        });
    }
    
    // Agent speed control
    const agentSpeed = document.getElementById('agent-speed');
    const speedValue = document.getElementById('speed-value');
    if (agentSpeed && speedValue) {
        agentSpeed.addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            speedValue.textContent = `${speed}ms`;
            Game.setAutoPlaySpeed(speed);
        });
    }
    
    // Train button
    const trainBtn = document.getElementById('train-btn');
    if (trainBtn) {
        trainBtn.addEventListener('click', async () => {
            const episodes = parseInt(document.getElementById('train-episodes-input')?.value) || 1000;
            await Game.trainAgent(episodes);
        });
    }
    
    // Reset training button
    const resetTrainingBtn = document.getElementById('reset-training-btn');
    if (resetTrainingBtn) {
        resetTrainingBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset all agent training?')) {
                await Game.resetTraining();
            }
        });
    }
    
    // Grid size inputs
    const gridWidth = document.getElementById('grid-width');
    const gridHeight = document.getElementById('grid-height');
    
    if (gridWidth) {
        gridWidth.addEventListener('change', (e) => {
            e.target.value = Math.min(Math.max(parseInt(e.target.value) || 5, 4), 10);
        });
    }
    
    if (gridHeight) {
        gridHeight.addEventListener('change', (e) => {
            e.target.value = Math.min(Math.max(parseInt(e.target.value) || 5, 4), 8);
        });
    }
    
    // Prevent form submission
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') {
                e.preventDefault();
            }
        });
    });
    
    // Game state update callback
    Game.onStateUpdate = (state) => {
        // Additional updates if needed
    };
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
    Renderer.updateMessage(message, 'danger');
}

/**
 * Show success message to user
 * @param {string} message - Success message
 */
function showSuccess(message) {
    Renderer.updateMessage(message, 'success');
}
