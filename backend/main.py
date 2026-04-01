"""
FastAPI Backend for Wumpus World
Handles game state and Q-learning agent
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import uvicorn

from game import WumpusWorld, Action, create_game
from agent import QLearningAgent, get_agent, reset_agent


# FastAPI app
app = FastAPI(
    title="Wumpus World API",
    description="API for Wumpus World game with Q-learning agent",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global game instance
game_instance: Optional[WumpusWorld] = None


# Request/Response models
class GameConfig(BaseModel):
    width: int = Field(default=5, ge=4, le=10)
    height: int = Field(default=5, ge=4, le=8)
    seed: Optional[int] = None


class ActionRequest(BaseModel):
    action: str


class TrainConfig(BaseModel):
    episodes: int = Field(default=1000, ge=1, le=50000)
    width: int = Field(default=5, ge=4, le=10)
    height: int = Field(default=5, ge=4, le=8)


class AgentConfigUpdate(BaseModel):
    learning_rate: Optional[float] = None
    discount_factor: Optional[float] = None
    epsilon: Optional[float] = None
    epsilon_decay: Optional[float] = None


# Helper functions
def get_game() -> WumpusWorld:
    """Get or create game instance"""
    global game_instance
    if game_instance is None:
        game_instance = create_game()
    return game_instance


# API Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Wumpus World API",
        "version": "1.0.0",
        "endpoints": [
            "/reset",
            "/state",
            "/action",
            "/step",
            "/train",
            "/agent/stats",
            "/agent/reset"
        ]
    }


@app.post("/reset")
async def reset_game(config: Optional[GameConfig] = None):
    """
    Reset game with optional configuration
    
    Returns initial game state
    """
    global game_instance
    
    if config is None:
        config = GameConfig()
    
    game_instance = create_game(
        width=config.width,
        height=config.height,
        seed=config.seed
    )
    
    return {
        "success": True,
        "state": game_instance.get_full_state()
    }


@app.get("/state")
async def get_state():
    """Get current game state"""
    game = get_game()
    return {
        "success": True,
        "state": game.get_full_state()
    }


@app.post("/action")
async def execute_action(request: ActionRequest):
    """
    Execute a player action
    
    Actions: MOVE_UP, MOVE_DOWN, MOVE_LEFT, MOVE_RIGHT,
             SHOOT_UP, SHOOT_DOWN, SHOOT_LEFT, SHOOT_RIGHT, GRAB
    """
    game = get_game()
    
    try:
        action = Action(request.action.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action: {request.action}. Valid actions: {[a.value for a in Action]}"
        )
    
    state, reward, done, info = game.step(action)
    
    return {
        "success": True,
        "state": state,
        "reward": reward,
        "done": done,
        "info": info
    }


@app.post("/step")
async def agent_step():
    """
    Get next action from AI agent and execute it
    
    Used for agent mode gameplay
    """
    game = get_game()
    agent = get_agent()
    
    if game.game_over:
        return {
            "success": False,
            "message": "Game is over. Please reset.",
            "state": game.get_full_state()
        }
    
    # Get best action from agent
    action, q_values = agent.get_best_action(game)
    
    # Execute action
    state, reward, done, info = game.step(action)
    
    return {
        "success": True,
        "action": action.value,
        "q_values": q_values,
        "state": state,
        "reward": reward,
        "done": done,
        "info": info
    }


@app.get("/step")
async def get_agent_recommendation():
    """
    Get agent's recommended action without executing
    """
    game = get_game()
    agent = get_agent()
    
    action, q_values = agent.get_best_action(game)
    
    return {
        "success": True,
        "recommended_action": action.value,
        "q_values": q_values,
        "state": game.get_full_state()
    }


@app.post("/train")
async def train_agent(config: Optional[TrainConfig] = None):
    """
    Train the Q-learning agent
    
    This runs training episodes in the background
    """
    if config is None:
        config = TrainConfig()
    
    agent = get_agent()
    
    # Train agent
    stats = agent.train(
        episodes=config.episodes,
        width=config.width,
        height=config.height
    )
    
    return {
        "success": True,
        "message": f"Training completed for {config.episodes} episodes",
        "stats": stats
    }


@app.get("/agent/stats")
async def get_agent_stats():
    """Get Q-learning agent statistics"""
    agent = get_agent()
    return {
        "success": True,
        "stats": agent.get_stats()
    }


@app.post("/agent/reset")
async def reset_agent_training():
    """Reset agent training (clears Q-table)"""
    agent = reset_agent()
    return {
        "success": True,
        "message": "Agent training reset",
        "stats": agent.get_stats()
    }


@app.put("/agent/config")
async def update_agent_config(config: AgentConfigUpdate):
    """Update agent hyperparameters"""
    agent = get_agent()
    
    if config.learning_rate is not None:
        agent.learning_rate = config.learning_rate
    if config.discount_factor is not None:
        agent.discount_factor = config.discount_factor
    if config.epsilon is not None:
        agent.epsilon = config.epsilon
    if config.epsilon_decay is not None:
        agent.epsilon_decay = config.epsilon_decay
    
    return {
        "success": True,
        "message": "Agent configuration updated",
        "config": {
            "learning_rate": agent.learning_rate,
            "discount_factor": agent.discount_factor,
            "epsilon": agent.epsilon,
            "epsilon_decay": agent.epsilon_decay
        }
    }


@app.get("/actions")
async def get_valid_actions():
    """Get list of all valid actions"""
    return {
        "actions": [action.value for action in Action],
        "move_actions": [action.value for action in Action.get_move_actions()],
        "shoot_actions": [action.value for action in Action.get_shoot_actions()],
        "other_actions": ["GRAB"]
    }


# Run server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
