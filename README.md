#  Wumpus World AI Simulator (Reinforcement Learning)

An interactive Wumpus World game powered by a Reinforcement Learning (Q-learning) agent.
The system supports both manual gameplay and autonomous AI decision-making in a partially observable environment.

---

##  Features

*  Manual Gameplay (Arrow keys + shooting)
*  AI Agent Mode (Q-learning based)
*  Toggle between Human and AI control
*  Intelligent decision-making using Reinforcement Learning
*  Direction-based shooting with reward logic
*  Partial observability (Breeze, Stench, Glitter)
*  Training system with performance stats
*  Persistent learning using saved Q-table
*  Dynamic grid sizes (5x5 to 10x8)

---

##  AI & Learning

* Algorithm: **Q-Learning (Tabular Reinforcement Learning)**
* Exploration Strategy: **Epsilon-Greedy**
* Reward System:

  * +100 → Gold collected
  * -100 → Death (pit/Wumpus)
  * +50 → Kill Wumpus
  * -10 → Missed arrow
  * -1 → Movement cost

The agent learns optimal policies through multiple training episodes and improves its decision-making over time.

---

##  Project Structure

```
wumpus-world/
│
├── backend/        # FastAPI + Q-learning agent
├── frontend/       # HTML, CSS, JS game UI
├── assets/         # Game images and icons
└── README.md
```

---

##  Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Python (FastAPI)
* **AI:** Reinforcement Learning (Q-learning)

---

##  Getting Started

### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn numpy
uvicorn main:app --reload
```

---

### 2. Frontend Setup

```bash
cd frontend
python -m http.server 5500
```

Open:
👉 http://localhost:5500

---

##  Training the Agent

You can train the agent directly from the UI:

1. Enter number of episodes (e.g., 3000)
2. Click **Train Agent**
3. Monitor:

   * Win rate
   * Q-table size
   * Epsilon decay

---

##  How It Works

1. The frontend sends the current state to the backend
2. The RL agent selects the best action
3. The environment updates based on action
4. Rewards are assigned and Q-values updated
5. Over time, the agent learns optimal strategies

---

##  Example Capabilities

* Avoids pits using breeze signals
* Detects Wumpus using stench
* Uses directional shooting intelligently
* Optimizes path to collect gold

---

##  Future Improvements

* Deep Q Network (DQN) implementation
* Multiple Wumpus support
* Better state representation
* Online training visualization
* Multiplayer or competitive mode

---

##  Resume Description

Built an AI-powered Wumpus World simulator using Reinforcement Learning (Q-learning), featuring autonomous agent behavior, dynamic environment scaling, and real-time decision-making in a partially observable grid environment.

---

##  Author

Krish Gupta
B.Tech CSE (AIML)

---
