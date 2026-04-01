"""
Wumpus World Game Environment
Handles all game logic, state management, and rules
"""

import random
from typing import List, Tuple, Dict, Set, Optional, Any
from enum import Enum
from dataclasses import dataclass, field
import copy


class Action(str, Enum):
    """All possible actions in the game"""
    MOVE_UP = "MOVE_UP"
    MOVE_DOWN = "MOVE_DOWN"
    MOVE_LEFT = "MOVE_LEFT"
    MOVE_RIGHT = "MOVE_RIGHT"
    SHOOT_UP = "SHOOT_UP"
    SHOOT_DOWN = "SHOOT_DOWN"
    SHOOT_LEFT = "SHOOT_LEFT"
    SHOOT_RIGHT = "SHOOT_RIGHT"
    GRAB = "GRAB"
    
    @classmethod
    def get_all_actions(cls) -> List['Action']:
        return list(cls)
    
    @classmethod
    def get_move_actions(cls) -> List['Action']:
        return [cls.MOVE_UP, cls.MOVE_DOWN, cls.MOVE_LEFT, cls.MOVE_RIGHT]
    
    @classmethod
    def get_shoot_actions(cls) -> List['Action']:
        return [cls.SHOOT_UP, cls.SHOOT_DOWN, cls.SHOOT_LEFT, cls.SHOOT_RIGHT]


class Direction(str, Enum):
    """Player facing direction"""
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"


@dataclass
class Percepts:
    """Current percepts at player position"""
    stench: bool = False
    breeze: bool = False
    glitter: bool = False
    bump: bool = False
    scream: bool = False
    
    def to_dict(self) -> Dict[str, bool]:
        return {
            "stench": self.stench,
            "breeze": self.breeze,
            "glitter": self.glitter,
            "bump": self.bump,
            "scream": self.scream
        }


@dataclass
class CellInfo:
    """Information about a single cell"""
    x: int
    y: int
    visited: bool = False
    has_wumpus: bool = False
    has_pit: bool = False
    has_gold: bool = False
    has_dead_wumpus: bool = False
    has_player: bool = False
    stench: bool = False
    breeze: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "x": self.x,
            "y": self.y,
            "visited": self.visited,
            "has_wumpus": self.has_wumpus,
            "has_pit": self.has_pit,
            "has_gold": self.has_gold,
            "has_dead_wumpus": self.has_dead_wumpus,
            "has_player": self.has_player,
            "stench": self.stench,
            "breeze": self.breeze
        }


class WumpusWorld:
    """
    Main game environment for Wumpus World
    Handles all game state and logic
    """
    
    def __init__(self, width: int = 5, height: int = 5, seed: Optional[int] = None):
        """
        Initialize the Wumpus World environment
        
        Args:
            width: Grid width (4-10)
            height: Grid height (4-8)
            seed: Random seed for reproducibility
        """
        self.width = min(max(width, 4), 10)
        self.height = min(max(height, 4), 8)
        self.seed = seed
        
        # Game state
        self.player_pos: Tuple[int, int] = (0, 0)
        self.player_direction: Direction = Direction.RIGHT
        self.wumpus_positions: Set[Tuple[int, int]] = set()
        self.pit_positions: Set[Tuple[int, int]] = set()
        self.gold_positions: Set[Tuple[int, int]] = set()
        self.dead_wumpus: Set[Tuple[int, int]] = set()
        self.visited: Set[Tuple[int, int]] = set()
        
        # Game stats
        self.arrows: int = 0
        self.max_arrows: int = 0
        self.score: int = 0
        self.gold_collected: int = 0
        self.total_gold: int = 0
        self.wumpus_killed: int = 0
        self.total_wumpus: int = 0
        self.moves: int = 0
        
        # Game state flags
        self.game_over: bool = False
        self.won: bool = False
        self.last_action_result: str = ""
        self.last_scream: bool = False
        
        self.reset()
    
    def reset(self, new_seed: Optional[int] = None) -> Dict[str, Any]:
        """
        Reset the game to initial state
        
        Args:
            new_seed: Optional new random seed
            
        Returns:
            Initial game state dictionary
        """
        if new_seed is not None:
            self.seed = new_seed
        
        if self.seed is not None:
            random.seed(self.seed)
        
        # Reset player position (bottom-left corner)
        self.player_pos = (0, self.height - 1)
        self.player_direction = Direction.RIGHT
        
        # Calculate number of elements based on grid size
        total_cells = self.width * self.height
        self.total_wumpus = max(1, total_cells // 15)
        num_pits = max(2, total_cells // 8)
        self.total_gold = max(1, total_cells // 12)
        self.max_arrows = max(2, self.total_wumpus + 1)
        self.arrows = self.max_arrows
        
        # Define safe zone around starting position
        start_x, start_y = self.player_pos
        safe_zone = {
            (start_x, start_y),
            (start_x + 1, start_y),
            (start_x, start_y - 1),
            (start_x + 1, start_y - 1)
        }
        
        # Get available cells for element placement
        available = [
            (x, y) for x in range(self.width) 
            for y in range(self.height) 
            if (x, y) not in safe_zone
        ]
        random.shuffle(available)
        
        # Clear previous state
        self.wumpus_positions = set()
        self.pit_positions = set()
        self.gold_positions = set()
        self.dead_wumpus = set()
        
        # Place elements
        idx = 0
        for _ in range(self.total_wumpus):
            if idx < len(available):
                self.wumpus_positions.add(available[idx])
                idx += 1
        
        for _ in range(num_pits):
            if idx < len(available):
                self.pit_positions.add(available[idx])
                idx += 1
        
        for _ in range(self.total_gold):
            if idx < len(available):
                self.gold_positions.add(available[idx])
                idx += 1
        
        # Initialize visited set with starting position
        self.visited = {self.player_pos}
        
        # Reset stats
        self.score = 0
        self.gold_collected = 0
        self.wumpus_killed = 0
        self.moves = 0
        
        # Reset game state flags
        self.game_over = False
        self.won = False
        self.last_action_result = "Game started!"
        self.last_scream = False
        
        return self.get_full_state()
    
    def get_percepts(self) -> Percepts:
        """Get current percepts at player position"""
        x, y = self.player_pos
        adjacent = self._get_adjacent_cells(x, y)
        
        percepts = Percepts()
        percepts.stench = any(pos in self.wumpus_positions for pos in adjacent)
        percepts.breeze = any(pos in self.pit_positions for pos in adjacent)
        percepts.glitter = self.player_pos in self.gold_positions
        percepts.scream = self.last_scream
        
        return percepts
    
    def _get_adjacent_cells(self, x: int, y: int) -> List[Tuple[int, int]]:
        """Get all adjacent cells (up, down, left, right)"""
        return [(x-1, y), (x+1, y), (x, y-1), (x, y+1)]
    
    def _is_valid_position(self, x: int, y: int) -> bool:
        """Check if position is within grid bounds"""
        return 0 <= x < self.width and 0 <= y < self.height
    
    def step(self, action: Action) -> Tuple[Dict[str, Any], int, bool, Dict[str, Any]]:
        """
        Execute an action in the environment
        
        Args:
            action: Action to execute
            
        Returns:
            Tuple of (state, reward, done, info)
        """
        if self.game_over:
            return self.get_full_state(), 0, True, {"message": "Game already over"}
        
        self.last_scream = False
        reward = 0
        info = {"message": "", "action": action.value}
        
        # Execute action based on type
        if action in Action.get_move_actions():
            reward, info["message"] = self._execute_move(action)
        elif action in Action.get_shoot_actions():
            reward, info["message"] = self._execute_shoot(action)
        elif action == Action.GRAB:
            reward, info["message"] = self._execute_grab()
        
        self.moves += 1
        self.score += reward
        
        # Check death conditions
        death_reward, death_message = self._check_death()
        if death_message:
            reward += death_reward
            self.score += death_reward
            info["message"] = death_message
        
        # Check win condition
        if not self.game_over and self._check_win():
            info["message"] = "Congratulations! You collected all the gold!"
        
        self.last_action_result = info["message"]
        
        return self.get_full_state(), reward, self.game_over, info
    
    def _execute_move(self, action: Action) -> Tuple[int, str]:
        """Execute a movement action"""
        x, y = self.player_pos
        new_x, new_y = x, y
        
        direction_map = {
            Action.MOVE_UP: (0, -1, Direction.UP, "up"),
            Action.MOVE_DOWN: (0, 1, Direction.DOWN, "down"),
            Action.MOVE_LEFT: (-1, 0, Direction.LEFT, "left"),
            Action.MOVE_RIGHT: (1, 0, Direction.RIGHT, "right")
        }
        
        dx, dy, direction, dir_name = direction_map[action]
        new_x, new_y = x + dx, y + dy
        self.player_direction = direction
        
        if self._is_valid_position(new_x, new_y):
            self.player_pos = (new_x, new_y)
            self.visited.add(self.player_pos)
            return -1, f"Moved {dir_name}"
        else:
            return -5, f"Bumped into wall (tried to move {dir_name})"
    
    def _execute_shoot(self, action: Action) -> Tuple[int, str]:
        """Execute a shooting action"""
        if self.arrows <= 0:
            return -5, "No arrows left!"
        
        self.arrows -= 1
        x, y = self.player_pos
        
        direction_map = {
            Action.SHOOT_UP: (0, -1, Direction.UP, "up"),
            Action.SHOOT_DOWN: (0, 1, Direction.DOWN, "down"),
            Action.SHOOT_LEFT: (-1, 0, Direction.LEFT, "left"),
            Action.SHOOT_RIGHT: (1, 0, Direction.RIGHT, "right")
        }
        
        dx, dy, direction, dir_name = direction_map[action]
        self.player_direction = direction
        
        # Arrow travels until hitting wall or Wumpus
        curr_x, curr_y = x + dx, y + dy
        
        while self._is_valid_position(curr_x, curr_y):
            if (curr_x, curr_y) in self.wumpus_positions:
                # Hit a Wumpus!
                self.wumpus_positions.remove((curr_x, curr_y))
                self.dead_wumpus.add((curr_x, curr_y))
                self.visited.add((curr_x, curr_y))
                self.wumpus_killed += 1
                self.last_scream = True
                return 50 - 1, f"Shot {dir_name} - Wumpus killed! You hear a scream!"
            curr_x += dx
            curr_y += dy
        
        return -10 - 1, f"Shot {dir_name} - Arrow missed!"
    
    def _execute_grab(self) -> Tuple[int, str]:
        """Execute grab action"""
        if self.player_pos in self.gold_positions:
            self.gold_positions.remove(self.player_pos)
            self.gold_collected += 1
            return 100, "Grabbed gold! +100 points!"
        return -1, "Nothing to grab here"
    
    def _check_death(self) -> Tuple[int, str]:
        """Check if player died"""
        if self.player_pos in self.wumpus_positions:
            self.game_over = True
            self.won = False
            return -100, "Eaten by Wumpus! Game Over!"
        
        if self.player_pos in self.pit_positions:
            self.game_over = True
            self.won = False
            return -100, "Fell into a pit! Game Over!"
        
        return 0, ""
    
    def _check_win(self) -> bool:
        """Check if player won"""
        if self.gold_collected >= self.total_gold and self.total_gold > 0:
            self.game_over = True
            self.won = True
            return True
        return False
    
    def get_cell_info(self, x: int, y: int) -> CellInfo:
        """Get information about a specific cell"""
        pos = (x, y)
        adjacent = self._get_adjacent_cells(x, y)
        
        return CellInfo(
            x=x,
            y=y,
            visited=pos in self.visited,
            has_wumpus=pos in self.wumpus_positions,
            has_pit=pos in self.pit_positions,
            has_gold=pos in self.gold_positions,
            has_dead_wumpus=pos in self.dead_wumpus,
            has_player=pos == self.player_pos,
            stench=any(p in self.wumpus_positions for p in adjacent),
            breeze=any(p in self.pit_positions for p in adjacent)
        )
    
    def get_grid_info(self) -> List[List[Dict[str, Any]]]:
        """Get full grid information for rendering"""
        grid = []
        for y in range(self.height):
            row = []
            for x in range(self.width):
                row.append(self.get_cell_info(x, y).to_dict())
            grid.append(row)
        return grid
    
    def get_full_state(self) -> Dict[str, Any]:
        """Get complete game state for frontend"""
        percepts = self.get_percepts()
        
        return {
            "width": self.width,
            "height": self.height,
            "player_pos": list(self.player_pos),
            "player_direction": self.player_direction.value,
            "arrows": self.arrows,
            "max_arrows": self.max_arrows,
            "score": self.score,
            "gold_collected": self.gold_collected,
            "total_gold": self.total_gold,
            "wumpus_killed": self.wumpus_killed,
            "total_wumpus": self.total_wumpus,
            "moves": self.moves,
            "game_over": self.game_over,
            "won": self.won,
            "percepts": percepts.to_dict(),
            "grid": self.get_grid_info(),
            "message": self.last_action_result
        }
    
    def get_state_for_agent(self) -> Dict[str, Any]:
        """Get state representation for Q-learning agent"""
        percepts = self.get_percepts()
        
        # Create a hashable state representation
        visited_tuple = tuple(sorted(self.visited))
        
        return {
            "player_pos": self.player_pos,
            "player_direction": self.player_direction.value,
            "percepts": percepts.to_dict(),
            "arrows": self.arrows,
            "visited": visited_tuple,
            "gold_collected": self.gold_collected,
            "has_gold_here": self.player_pos in self.gold_positions
        }
    
    def get_state_key(self) -> str:
        """Get a hashable state key for Q-table"""
        state = self.get_state_for_agent()
        percepts = state["percepts"]
        
        # Create compact state representation
        key_parts = [
            f"pos:{state['player_pos']}",
            f"dir:{state['player_direction']}",
            f"stench:{percepts['stench']}",
            f"breeze:{percepts['breeze']}",
            f"glitter:{percepts['glitter']}",
            f"arrows:{state['arrows']}",
            f"gold:{state['gold_collected']}"
        ]
        
        return "|".join(key_parts)


def create_game(width: int = 5, height: int = 5, seed: Optional[int] = None) -> WumpusWorld:
    """Factory function to create a new game instance"""
    return WumpusWorld(width=width, height=height, seed=seed)
