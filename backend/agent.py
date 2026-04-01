"""
Q-Learning Agent for Wumpus World
Implements tabular Q-learning with epsilon-greedy exploration
"""

import json
import random
import os
from typing import Dict, List, Tuple, Optional, Any
from collections import defaultdict
import numpy as np

from game import WumpusWorld, Action, create_game


class QLearningAgent:
    """
    Q-Learning Agent using tabular method
    Designed for future upgrade to DQN
    """
    
    def __init__(
        self,
        learning_rate: float = 0.1,
        discount_factor: float = 0.95,
        epsilon: float = 1.0,
        epsilon_min: float = 0.01,
        epsilon_decay: float = 0.995,
        q_table_path: str = "q_table.json"
    ):
        """
        Initialize Q-Learning agent
        
        Args:
            learning_rate: Alpha - learning rate
            discount_factor: Gamma - discount factor for future rewards
            epsilon: Initial exploration rate
            epsilon_min: Minimum exploration rate
            epsilon_decay: Decay rate for epsilon
            q_table_path: Path to save/load Q-table
        """
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.epsilon = epsilon
        self.epsilon_min = epsilon_min
        self.epsilon_decay = epsilon_decay
        self.q_table_path = q_table_path
        
        # Q-table: state -> action -> value
        self.q_table: Dict[str, Dict[str, float]] = defaultdict(
            lambda: {action.value: 0.0 for action in Action}
        )
        
        # Training statistics
        self.episodes_trained = 0
        self.total_rewards: List[float] = []
        self.wins: int = 0
        self.losses: int = 0
        
        # Load existing Q-table if available
        self.load_q_table()
    
    def get_state_key(self, game: WumpusWorld) -> str:
        """Get hashable state key from game state"""
        return game.get_state_key()
    
    def get_q_values(self, state_key: str) -> Dict[str, float]:
        """Get Q-values for a state"""
        if state_key not in self.q_table:
            self.q_table[state_key] = {action.value: 0.0 for action in Action}
        return self.q_table[state_key]
    
    def choose_action(self, game: WumpusWorld, training: bool = False) -> Action:
        """
        Choose action using epsilon-greedy policy
        
        Args:
            game: Current game state
            training: Whether we're training (affects exploration)
            
        Returns:
            Selected action
        """
        state_key = self.get_state_key(game)
        q_values = self.get_q_values(state_key)
        
        # Add heuristics for better exploration
        action_scores = self._apply_heuristics(game, q_values)
        
        # Epsilon-greedy exploration (only during training)
        if training and random.random() < self.epsilon:
            # Weighted random based on heuristics during exploration
            actions = list(Action)
            weights = [max(0.1, action_scores.get(a.value, 0) + 10) for a in actions]
            total = sum(weights)
            weights = [w / total for w in weights]
            return random.choices(actions, weights=weights)[0]
        
        # Exploitation: choose best action
        best_action = max(action_scores.keys(), key=lambda a: action_scores[a])
        return Action(best_action)
    
    def _apply_heuristics(
        self, 
        game: WumpusWorld, 
        q_values: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Apply domain-specific heuristics to guide learning
        
        Args:
            game: Current game state
            q_values: Current Q-values for state
            
        Returns:
            Modified action scores
        """
        state = game.get_state_for_agent()
        percepts = state["percepts"]
        scores = q_values.copy()
        
        # Strong bonus for grabbing gold when standing on it
        if percepts["glitter"]:
            scores[Action.GRAB.value] += 50
        
        # Penalty for shooting with no stench
        if not percepts["stench"]:
            for action in Action.get_shoot_actions():
                scores[action.value] -= 20
        
        # Bonus for shooting when there's stench and we have arrows
        if percepts["stench"] and state["arrows"] > 0:
            for action in Action.get_shoot_actions():
                scores[action.value] += 10
        
        # Penalty for moving into breeze without knowing safe cells
        if percepts["breeze"]:
            for action in Action.get_move_actions():
                scores[action.value] -= 5
        
        # Encourage exploration of unvisited cells
        x, y = state["player_pos"]
        move_directions = {
            Action.MOVE_UP.value: (0, -1),
            Action.MOVE_DOWN.value: (0, 1),
            Action.MOVE_LEFT.value: (-1, 0),
            Action.MOVE_RIGHT.value: (1, 0)
        }
        
        for action_name, (dx, dy) in move_directions.items():
            new_pos = (x + dx, y + dy)
            if new_pos not in state["visited"]:
                # Only encourage if no immediate danger signs
                if not (percepts["breeze"] or percepts["stench"]):
                    scores[action_name] += 3
        
        return scores
    
    def update(
        self, 
        state_key: str, 
        action: Action, 
        reward: float, 
        next_state_key: str, 
        done: bool
    ):
        """
        Update Q-value using Q-learning formula
        
        Q(s,a) = Q(s,a) + α * (r + γ * max(Q(s',a')) - Q(s,a))
        
        Args:
            state_key: Current state key
            action: Action taken
            reward: Reward received
            next_state_key: Next state key
            done: Whether episode ended
        """
        current_q = self.q_table[state_key][action.value]
        
        if done:
            target = reward
        else:
            next_q_values = self.get_q_values(next_state_key)
            max_next_q = max(next_q_values.values())
            target = reward + self.discount_factor * max_next_q
        
        # Q-learning update
        new_q = current_q + self.learning_rate * (target - current_q)
        self.q_table[state_key][action.value] = new_q
    
    def decay_epsilon(self):
        """Decay exploration rate"""
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
    
    def train_episode(self, game: WumpusWorld, max_steps: int = 200) -> Dict[str, Any]:
        """
        Train for one episode
        
        Args:
            game: Game environment
            max_steps: Maximum steps per episode
            
        Returns:
            Episode statistics
        """
        game.reset()
        total_reward = 0
        steps = 0
        
        while not game.game_over and steps < max_steps:
            state_key = self.get_state_key(game)
            action = self.choose_action(game, training=True)
            
            _, reward, done, _ = game.step(action)
            
            next_state_key = self.get_state_key(game)
            self.update(state_key, action, reward, next_state_key, done)
            
            total_reward += reward
            steps += 1
        
        # Update statistics
        self.episodes_trained += 1
        self.total_rewards.append(total_reward)
        
        if game.won:
            self.wins += 1
        elif game.game_over:
            self.losses += 1
        
        # Decay epsilon
        self.decay_epsilon()
        
        return {
            "episode": self.episodes_trained,
            "total_reward": total_reward,
            "steps": steps,
            "won": game.won,
            "epsilon": self.epsilon,
            "gold_collected": game.gold_collected,
            "wumpus_killed": game.wumpus_killed
        }
    
    def train(
        self, 
        episodes: int = 1000, 
        width: int = 5, 
        height: int = 5,
        callback = None
    ) -> Dict[str, Any]:
        """
        Train agent for multiple episodes
        
        Args:
            episodes: Number of episodes to train
            width: Grid width
            height: Grid height
            callback: Optional callback function for progress
            
        Returns:
            Training statistics
        """
        game = create_game(width=width, height=height)
        episode_stats = []
        
        for i in range(episodes):
            stats = self.train_episode(game)
            episode_stats.append(stats)
            
            if callback and i % 100 == 0:
                callback(i, stats)
        
        # Save Q-table after training
        self.save_q_table()
        
        # Calculate statistics
        recent_rewards = self.total_rewards[-100:] if len(self.total_rewards) >= 100 else self.total_rewards
        
        return {
            "episodes_trained": self.episodes_trained,
            "total_wins": self.wins,
            "total_losses": self.losses,
            "win_rate": self.wins / max(1, self.episodes_trained),
            "average_reward": sum(recent_rewards) / max(1, len(recent_rewards)),
            "final_epsilon": self.epsilon,
            "q_table_size": len(self.q_table),
            "recent_episodes": episode_stats[-10:]
        }
    
    def get_best_action(self, game: WumpusWorld) -> Tuple[Action, Dict[str, float]]:
        """
        Get best action for current state (no exploration)
        
        Args:
            game: Current game state
            
        Returns:
            Tuple of (best action, Q-values)
        """
        state_key = self.get_state_key(game)
        q_values = self.get_q_values(state_key)
        
        # Apply heuristics for better decisions
        action_scores = self._apply_heuristics(game, q_values)
        
        best_action_name = max(action_scores.keys(), key=lambda a: action_scores[a])
        return Action(best_action_name), action_scores
    
    def save_q_table(self):
        """Save Q-table to file"""
        try:
            data = {
                "q_table": dict(self.q_table),
                "epsilon": self.epsilon,
                "episodes_trained": self.episodes_trained,
                "wins": self.wins,
                "losses": self.losses
            }
            with open(self.q_table_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving Q-table: {e}")
    
    def load_q_table(self):
        """Load Q-table from file"""
        try:
            if os.path.exists(self.q_table_path):
                with open(self.q_table_path, 'r') as f:
                    data = json.load(f)
                
                # Convert back to defaultdict
                self.q_table = defaultdict(
                    lambda: {action.value: 0.0 for action in Action},
                    data.get("q_table", {})
                )
                self.epsilon = data.get("epsilon", self.epsilon)
                self.episodes_trained = data.get("episodes_trained", 0)
                self.wins = data.get("wins", 0)
                self.losses = data.get("losses", 0)
                
                print(f"Loaded Q-table with {len(self.q_table)} states")
        except Exception as e:
            print(f"Error loading Q-table: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get agent statistics"""
        recent_rewards = self.total_rewards[-100:] if len(self.total_rewards) >= 100 else self.total_rewards
        
        return {
            "episodes_trained": self.episodes_trained,
            "total_wins": self.wins,
            "total_losses": self.losses,
            "win_rate": self.wins / max(1, self.episodes_trained),
            "average_reward": sum(recent_rewards) / max(1, len(recent_rewards)) if recent_rewards else 0,
            "epsilon": self.epsilon,
            "q_table_size": len(self.q_table)
        }
    
    def reset_training(self):
        """Reset all training data"""
        self.q_table = defaultdict(
            lambda: {action.value: 0.0 for action in Action}
        )
        self.epsilon = 1.0
        self.episodes_trained = 0
        self.total_rewards = []
        self.wins = 0
        self.losses = 0
        
        # Remove saved Q-table
        if os.path.exists(self.q_table_path):
            os.remove(self.q_table_path)


# Global agent instance
_agent_instance: Optional[QLearningAgent] = None


def get_agent() -> QLearningAgent:
    """Get or create global agent instance"""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = QLearningAgent()
    return _agent_instance


def reset_agent():
    """Reset global agent instance"""
    global _agent_instance
    if _agent_instance is not None:
        _agent_instance.reset_training()
    _agent_instance = QLearningAgent()
    return _agent_instance
