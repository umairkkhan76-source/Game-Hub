# 🎮 Game Hub

A full-featured browser-based gaming platform built with **Python + Streamlit**, featuring 12 classic games, user accounts, leaderboards, and persistent sessions.

![GameHub](https://img.shields.io/badge/Python-3.10+-blue?logo=python) ![Streamlit](https://img.shields.io/badge/Streamlit-1.x-red?logo=streamlit) ![SQLite](https://img.shields.io/badge/Database-SQLite-green?logo=sqlite)

---

## ✨ Features

- **12 Classic Games** — Snake, Tic Tac Toe, Memory Cards, Quiz Trivia, Breakout, Whack-a-Mole, Chess, Sudoku, 2048, Rock Paper Scissors, Pong, Flappy Bird
- **User Accounts** — Register, login, edit profile, choose avatar
- **Persistent Sessions** — Stay logged in across page refreshes (cookie-based session tokens)
- **Leaderboards** — Track and compare high scores across all games
- **Dark / Light Theme** — Toggle with one click
- **Mobile Responsive** — Full hamburger menu and 2-column card grid on phones

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/itzgoldenheart777/Game-Hub-.git
cd Game-Hub-

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
streamlit run streamlit_app.py
```

App opens at **http://localhost:8501**

---

## 📁 Project Structure

```
Game-Hub/
├── streamlit_app.py          # Main app router & UI
├── requirements.txt          # Python dependencies
├── .streamlit/
│   └── config.toml           # Streamlit config (theme, toolbar)
├── static/
│   ├── css/
│   │   ├── style.css         # Global design system
│   │   └── game.css          # In-game UI styles
│   └── js/
│       └── games/            # Individual game JS files
│           ├── snake.js
│           ├── tictactoe.js
│           ├── memory.js
│           ├── quiz.js
│           ├── breakout.js
│           ├── whackamole.js
│           ├── chess.js
│           ├── sudoku.js
│           ├── game2048.js
│           ├── rps.js
│           ├── pong.js
│           └── flappy.js
└── templates/
    └── index.html            # Static HTML template (legacy)
```

---

## 🎮 Games

| Game | Type | Description |
|---|---|---|
| Snake | Classic | Eat food, grow longer, avoid walls |
| Tic Tac Toe | 2 Player | Classic 3×3 strategy game |
| Memory Cards | Puzzle | Match all pairs with fewest moves |
| Quiz Trivia | Knowledge | Multi-topic trivia questions |
| Breakout | Arcade | Break bricks with a bouncing ball |
| Whack-a-Mole | Action | Hit the moles before they hide |
| Chess | Strategy | Full chess engine with legal moves |
| Sudoku | Puzzle | Classic 9×9 number logic puzzle |
| 2048 | Puzzle | Slide tiles to reach 2048 |
| Rock Paper Scissors | Luck | Best of 5 vs the computer |
| Pong | Arcade | First to 7 — vs AI or 2-player |
| Flappy Bird | Action | Dodge the pipes, beat your high score |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS (custom design system), JavaScript (vanilla) |
| Backend | Python + Streamlit |
| Database | SQLite (via Python `sqlite3`) |
| Auth | SHA-256 password hashing + DB-backed session tokens |
| Session | Browser cookies + DB `sessions` table |
| Fonts | Orbitron, Poppins (Google Fonts) |

---

## 🔐 Session System

Sessions are stored in the SQLite `sessions` table and linked to a browser cookie (`gh_tok`). Tokens are generated with `secrets.token_urlsafe(32)` and expire from the cookie after 30 days or when the user logs out (whichever comes first).

---

## 📄 License

MIT License — free to use, modify, and distribute.