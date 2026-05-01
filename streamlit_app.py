import streamlit as st
import os
import sqlite3, hashlib
import urllib.parse
import secrets

st.set_page_config(page_title="Game Hub", layout="wide", page_icon="🎮", initial_sidebar_state="collapsed")

# Hide Streamlit defaults and apply base styles
st.markdown("""
<style>
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    footer {visibility: hidden;}
    .block-container { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
    iframe { border: none; width: 100vw; height: 100vh; }
    
    /* Native Streamlit UI overrides to match GameHub theme */
    div.stButton > button {
        background-color: #00ff87;
        color: #0a0a0f;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        font-family: 'Orbitron', monospace;
    }
    div.stTextInput > div > div > input {
        background-color: #1a1a24;
        color: #e8e8f0;
        border: 1px solid #2a2a3a;
    }
</style>
""", unsafe_allow_html=True)


# Database helpers
DB = 'gamehub.db'
def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    # Migrations — Ensure tables exist and run updates independently
    migrations = [
        '''CREATE TABLE IF NOT EXISTS users (
               id INTEGER PRIMARY KEY AUTOINCREMENT, 
               username TEXT UNIQUE NOT NULL, 
               email TEXT, 
               password TEXT NOT NULL, 
               avatar TEXT, 
               bio TEXT DEFAULT ""
           )''',
        '''CREATE TABLE IF NOT EXISTS scores (
               id INTEGER PRIMARY KEY AUTOINCREMENT, 
               user_id INTEGER, 
               game TEXT, 
               score INTEGER, 
               played_at DATETIME DEFAULT CURRENT_TIMESTAMP
           )''',
        '''CREATE TABLE IF NOT EXISTS sessions (
               token TEXT PRIMARY KEY,
               user_id INTEGER NOT NULL,
               created_at DATETIME DEFAULT CURRENT_TIMESTAMP
           )''',
        'ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ""'
    ]
    for sql in migrations:
        try:
            conn.execute(sql)
            conn.commit()
        except Exception:
            pass
    return conn

def hash_password(p):
    return hashlib.sha256(p.encode()).hexdigest()

def create_session(user_id: int) -> str:
    """Create a DB-backed session token and return it."""
    token = secrets.token_urlsafe(32)
    conn = get_db()
    conn.execute('INSERT INTO sessions (token, user_id) VALUES (?, ?)', (token, user_id))
    conn.commit(); conn.close()
    return token

def verify_session(token: str):
    """Return user row if token is valid, else None."""
    if not token or len(token) < 16:
        return None
    conn = get_db()
    row = conn.execute(
        'SELECT u.id, u.username, u.avatar FROM sessions s '
        'JOIN users u ON s.user_id = u.id WHERE s.token = ?', (token,)
    ).fetchone()
    conn.close()
    return row

def delete_session(token: str):
    conn = get_db()
    conn.execute('DELETE FROM sessions WHERE token = ?', (token,))
    conn.commit(); conn.close()

# Initialize session state variables
if "username"    not in st.session_state: st.session_state.username    = None
if "user_id"     not in st.session_state: st.session_state.user_id     = None
if "avatar"      not in st.session_state: st.session_state.avatar      = "🎮"
if "theme"       not in st.session_state: st.session_state.theme       = "dark"
if "profile_msg" not in st.session_state: st.session_state.profile_msg = ""
if "sess_token"  not in st.session_state: st.session_state.sess_token  = ""
if "do_logout"   not in st.session_state: st.session_state.do_logout   = False

# Helper function to generate URLs with session tokens attached
def nav_url(params=""):
    tok = st.session_state.get("sess_token", "")
    if tok:
        return f"?{params}&_tok={tok}" if params else f"?_tok={tok}"
    return f"?{params}" if params else "?"

# Handle Theme Toggle
if "toggle_theme" in st.query_params:
    st.session_state.theme = "light" if st.session_state.theme == "dark" else "dark"
    del st.query_params["toggle_theme"]

# Cookie-based session restore
if "_tok" in st.query_params and not st.session_state.username:
    tok  = st.query_params.get("_tok", "")
    user = verify_session(tok)
    if user:
        st.session_state.username   = user['username']
        st.session_state.user_id    = user['id']
        st.session_state.avatar     = user['avatar']
        st.session_state.sess_token = tok
        if "_tok" in st.query_params: del st.query_params["_tok"]
        st.rerun()
    else:
        if "_tok" in st.query_params: del st.query_params["_tok"]
        st.session_state.do_logout = True
        st.rerun()

# Handle Login/Registration
if "login_submit" in st.query_params:
    u = st.query_params.get("u", "")
    p = st.query_params.get("p", "")
    conn = get_db()
    user = conn.execute(
        'SELECT id, username, avatar FROM users WHERE (username=? OR email=?) AND password=?',
        (u, u, hash_password(p))
    ).fetchone()
    conn.close()
    if user:
        tok = create_session(user['id'])
        st.session_state.username   = user['username']
        st.session_state.user_id    = user['id']
        st.session_state.avatar     = user['avatar']
        st.session_state.sess_token = tok
        st.query_params.clear()
        st.rerun()
    else:
        st.error("❌ Invalid credentials!")
        st.query_params.clear()

if "register_submit" in st.query_params:
    u  = st.query_params.get("u", "")
    e  = st.query_params.get("e", "")
    p  = st.query_params.get("p", "")
    av = st.query_params.get("av", "🎮")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)',
            (u, e, hash_password(p), av)
        )
        uid = cur.lastrowid
        conn.commit()
        tok = create_session(uid)
        st.session_state.user_id    = uid
        st.session_state.username   = u
        st.session_state.avatar     = av
        st.session_state.sess_token = tok
        st.query_params.clear()
        st.rerun()
    except sqlite3.IntegrityError:
        st.error("❌ Username or email already exists!")
        st.query_params.clear()
    finally:
        conn.close()

query_params = st.query_params.to_dict()
page    = query_params.get("page",   "")
game_id = query_params.get("game",   "")
action  = query_params.get("action", "")

# Handle silent background score saving
if action == "save_score_bg":
    g_name  = query_params.get("game",  "")
    g_score = query_params.get("score", "0")
    u_id    = query_params.get("uid",   "")
    if g_name and g_score.isdigit() and u_id.isdigit():
        conn = get_db()
        # Insert score as an integer
        conn.execute('INSERT INTO scores (user_id, game, score) VALUES (?, ?, ?)',
                     (int(u_id), g_name, int(g_score)))
        conn.commit(); conn.close()
    st.stop()

# Handle logout
if action == "logout":
    if st.session_state.sess_token:
        delete_session(st.session_state.sess_token)
    st.session_state.username   = None
    st.session_state.user_id    = None
    st.session_state.avatar     = "🎮"
    st.session_state.sess_token = ""
    st.session_state.do_logout  = True
    st.query_params.clear()
    st.rerun()

# Handle profile update
if action == "update_profile" and st.session_state.user_id:
    new_name = query_params.get("name", "").strip()
    new_bio  = query_params.get("bio",  "").strip()
    new_av   = query_params.get("av",   "").strip()
    new_pw   = query_params.get("pw",   "").strip()
    conn = get_db()
    try:
        if new_name and new_name != st.session_state.username:
            conn.execute('UPDATE users SET username=? WHERE id=?', (new_name, st.session_state.user_id))
            st.session_state.username = new_name
        if new_bio:
            conn.execute('UPDATE users SET bio=? WHERE id=?', (new_bio, st.session_state.user_id))
        if new_av:
            conn.execute('UPDATE users SET avatar=? WHERE id=?', (new_av, st.session_state.user_id))
            st.session_state.avatar = new_av
        if new_pw and len(new_pw) >= 4:
            conn.execute('UPDATE users SET password=? WHERE id=?', (hash_password(new_pw), st.session_state.user_id))
        conn.commit()
        st.session_state.profile_msg = "✅ Profile updated successfully!"
    except sqlite3.IntegrityError:
        st.session_state.profile_msg = "❌ Username already taken."
    finally:
        conn.close()
    
    st.query_params.clear()
    tok = st.session_state.get("sess_token", "")
    st.query_params["page"] = "profile"
    if tok:
        st.query_params["_tok"] = tok
    st.rerun()

# Load CSS safely
try:
    with open("static/css/style.css", "r", encoding="utf-8") as f: main_css = f.read()
except FileNotFoundError:
    main_css = ""

try:
    with open("static/css/game.css", "r", encoding="utf-8") as f: game_css = f.read()
except FileNotFoundError:
    game_css = ""

# Aggressive Light Mode Override
theme_override = """
/* FORCE LIGHT MODE VARIABLES */
:root {
  --bg:         #f8fafc !important;
  --bg2:        #ffffff !important;
  --card:       #ffffff !important;
  --card-solid: #ffffff !important;
  --border:     #e2e8f0 !important;
  --border2:    #cbd5e1 !important;
  --text:       #0f172a !important;
  --text-bright:#000000 !important;
  --muted:      #64748b !important;
  --accent:     #059669 !important; /* Slightly darker green for contrast */
  --accent2:    #0284c7 !important;
  --glow:       0 0 15px rgba(5,150,105,0.15) !important;
  --glow-lg:    0 0 30px rgba(5,150,105,0.1) !important;
  --btn-bg:     #10b981 !important;
  --btn-text:   #ffffff !important;
  --shadow:     0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) !important;
  --shadow-card:0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05) !important;
  --input-bg:   #f1f5f9 !important;
  --nav-bg:     rgba(255,255,255,0.98) !important;
}

/* Force Body and Main Container Colors */
body, .stApp, .block-container, [data-testid="stAppViewContainer"] {
    background-color: var(--bg) !important;
    color: var(--text) !important;
}

/* Force Game Cards to be Light */
.game-card, .feature-card, .auth-card {
    background-color: var(--card) !important;
    border: 1px solid var(--border) !important;
    box-shadow: var(--shadow-card) !important;
}
.game-card h3, .feature-card h3, .auth-card h2 {
    color: var(--text-bright) !important;
}
.game-card p, .feature-card p, .auth-sub, .auth-card label {
    color: var(--muted) !important;
}

/* Force Form Inputs to be Light */
input, textarea {
    background-color: var(--input-bg) !important;
    color: var(--text) !important;
    border: 1px solid var(--border) !important;
}
input::placeholder, textarea::placeholder {
    color: #94a3b8 !important;
}

/* Force Section Titles to be Dark */
.section-title, .hero-title, .hero-sub, .hero-welcome {
    color: var(--text-bright) !important;
}
.hero-welcome strong {
    color: var(--accent) !important;
}

/* Ensure Links are visible */
a {
    color: var(--accent) !important;
}
.game-card { text-decoration: none !important; }

/* Force Navbar Light */
.navbar {
    background-color: var(--nav-bg) !important;
    border-bottom: 1px solid var(--border) !important;
}
.navbar .logo, .navbar .nav-links a {
    color: var(--text) !important;
}

/* Fix Game Background Area in Light Mode */
.games-section {
    background-color: var(--bg) !important;
}

""" if st.session_state.theme == "light" else ""

streamlit_overrides = """
#MainMenu{visibility:hidden;}header{visibility:hidden;}footer{visibility:hidden;}
.block-container{padding:0!important;margin:0!important;max-width:100%!important;}
[data-testid="stAppViewContainer"]{padding:0!important;}
[data-testid="stVerticalBlock"]{gap:0!important;padding:0!important;}
[data-testid="stMarkdownContainer"]{padding:0!important;margin:0!important;}
[data-testid="stMain"]{padding:0!important;}
[data-testid="stMainBlockContainer"]{padding:0!important;max-width:100%!important;}
section[data-testid="stSidebar"]{display:none!important;}
body{overflow-x:hidden!important;margin:0!important;padding:0!important;}
.stApp{overflow-x:hidden!important;}
/* Hide Streamlit 3-dot menu and toolbar */
[data-testid="stMainMenuButton"]{display:none!important;}
[data-testid="stToolbar"]{display:none!important;}
[data-testid="stDecoration"]{display:none!important;}
[data-testid="stStatusWidget"]{display:none!important;}
.viewerBadge_link__qRIco{display:none!important;}

/* Global Mobile Fixes */
@media(max-width:800px){
  [data-testid="stAppViewContainer"], [data-testid="stMain"], [data-testid="stMainBlockContainer"], .block-container{padding:0!important;margin:0!important;}
  .mobile-stack { grid-template-columns: 1fr !important; }
}

/* Avatar Picker Styles */
.av-radio { position: absolute !important; opacity: 0 !important; width: 0 !important; height: 0 !important; margin: 0 !important; }
.av-box { display: flex !important; align-items: center !important; justify-content: center !important; width: 45px !important; height: 45px !important; font-size: 1.5rem !important; background: var(--input-bg) !important; border: 2px solid var(--border) !important; border-radius: 12px !important; transition: all 0.2s ease !important; cursor: pointer !important; }
.av-radio:checked + .av-box { border-color: var(--accent) !important; background: rgba(0, 168, 122, 0.1) !important; box-shadow: 0 0 10px rgba(0, 168, 122, 0.2) !important; }
.av-box:hover { border-color: var(--accent) !important; opacity: 0.8 !important; }
"""

st.markdown(f"<style>{main_css}\n{game_css}\n{theme_override}\n{streamlit_overrides}</style>", unsafe_allow_html=True)

# ── Session Persistence via localStorage + Cookie ─────────────────────────────
_tok      = st.session_state.sess_token
_dologout = st.session_state.do_logout

if _dologout:
    st.session_state.do_logout = False
    st.markdown("""
<script>
(function(){
  try { localStorage.removeItem('gh_tok'); } catch(e){}
  document.cookie = 'gh_tok=; path=/; max-age=0; SameSite=Lax';
})();
</script>""", unsafe_allow_html=True)
elif _tok:
    _tok_safe = _tok.replace("'", "").replace('"', '')
    st.markdown(f"""
<script>
(function(){{
  var t = "{_tok_safe}";
  try {{ localStorage.setItem('gh_tok', t); }} catch(e){{}}
  var exp = new Date(Date.now() + 30*24*60*60*1000).toUTCString();
  document.cookie = 'gh_tok=' + t + '; path=/; expires=' + exp + '; SameSite=Lax';
}})();
</script>""", unsafe_allow_html=True)
else:
    st.markdown("""
<script>
(function(){
    var p = new URLSearchParams(window.location.search);
    var skip = p.has('_tok')||p.has('login_submit')||p.has('register_submit')||p.has('action');
    if (skip) return;

    var tok = null;
    try { tok = localStorage.getItem('gh_tok'); } catch(e){}
    if (!tok) {
      var m = document.cookie.match('(?:^|;)\\s*gh_tok=([^;]*)');
      if (m) tok = decodeURIComponent(m[1]);
    }

    if (tok && tok.length > 16) {
      p.set('_tok', tok);
      var url = window.location.origin + window.location.pathname + '?' + p.toString();
      
      var loader = document.createElement('div');
      loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,10,15,0.9);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#00ff87;font-family:Orbitron,sans-serif;';
      loader.innerHTML = '<div style="border:4px solid rgba(0,255,135,0.1);border-top:4px solid #00ff87;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin-bottom:1rem;"></div><style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style><div>SYNCING SESSION...</div>';
      document.body.appendChild(loader);
      
      setTimeout(function() { window.location.href = url; }, 100);
    }
})();
</script>""", unsafe_allow_html=True)

# ── Nav vars ──────────────────────────────────────────────────────────────────
if st.session_state.username:
    user_nav_links = (
        f'<a href="{nav_url("page=profile")}" class="nav-user" target="_self">{st.session_state.avatar} {st.session_state.username}</a>'
        f'<a href="{nav_url("action=logout")}" class="btn-nav" target="_self">Logout</a>'
    )
else:
    user_nav_links = (
        f'<a href="{nav_url("page=login")}"    class="btn-nav"            target="_self">Login</a>'
        f'<a href="{nav_url("page=register")}" class="btn-nav btn-primary" target="_self">Register</a>'
    )

theme_icon = "🌙" if st.session_state.theme == "dark" else "☀️"
theme_toggle = f'<a href="{nav_url("toggle_theme=1")}" target="_self" class="theme-toggle">{theme_icon}</a>'

home_a = 'style="color:var(--accent)!important;"' if not page and not game_id else ''
lb_a   = 'style="color:var(--accent)!important;"' if page == "leaderboard" else ''

st.markdown(f"""
<style>
.mob-menu {{ display: none; }} 
@media (max-width: 768px) {{
  .navbar    {{ flex-wrap: wrap; padding: 0.75rem 1rem; gap: 0; }}
  .hide-mobile {{ display: none !important; }}
  .mob-menu  {{ display: block; margin-left: auto; }}
  .mob-menu summary {{
    list-style: none; cursor: pointer; font-size: 1.9rem; color: var(--text-bright);
    width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
    border-radius: 8px; user-select: none; -webkit-user-select: none;
  }}
  .mob-menu summary::-webkit-details-marker {{ display: none; }}
  .mob-menu[open] summary {{ color: var(--accent); }}
  .mob-panel {{
    display: flex; flex-direction: column; width: 100vw; margin-left: calc(-1rem); 
    padding: 0.75rem 1rem 1rem; gap: 4px; background: var(--nav-bg);
    border-top: 1px solid var(--border-color); box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }}
  .mob-panel a {{
    color: var(--text-bright) !important; font-weight: 600; font-size: 1rem;
    padding: 10px 8px; border-radius: 8px; display: flex; align-items: center; gap: 10px;
    text-decoration: none; transition: background 0.15s;
  }}
  .mob-panel a:hover {{ background: rgba(0,0,0,0.05); }}
  .mob-panel hr {{ border: none; border-top: 1px solid var(--border-color); margin: 6px 0; }}
  .mob-panel .mob-theme {{
    display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 0;
  }}
  .mob-panel .mob-theme span {{ color: var(--text); font-size: .9rem; }}
}}
</style>
<nav class="navbar" id="gh-navbar">
  <a href="{nav_url()}" class="logo" target="_self">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="20" height="12" rx="3" ry="3" fill="var(--accent)"/><path d="M8 12h3M9.5 10.5v3M15 11h.01M17 13h.01" stroke="#0b0e14" stroke-width="2" stroke-linecap="round"/></svg>
    <span style="color:var(--text-bright);">GAME<span style="color:var(--accent);">HUB</span></span>
  </a>
  <div class="nav-links hide-mobile" id="logged-in-check">
    <a href="{nav_url()}" target="_self" {home_a}>Home</a>
    <a href="{nav_url('page=leaderboard')}" target="_self" {lb_a}>Leaderboard</a>
    {user_nav_links}
    {theme_toggle}
  </div>
  <details class="mob-menu">
    <summary title="Menu">&#9776;</summary>
    <div class="mob-panel">
      <a href="{nav_url()}" target="_self">&#127968; Home</a>
      <a href="{nav_url('page=leaderboard')}" target="_self">&#127942; Leaderboard</a>
      <hr>
      {user_nav_links}
      <div class="mob-theme">
        <span>Theme</span>
        {theme_toggle}
      </div>
    </div>
  </details>
</nav>
""", unsafe_allow_html=True)


# Router
if page == "leaderboard":
    filter_game = query_params.get("filter_game", "all")
    filter_type = query_params.get("filter_type", "best")
    
    conn = get_db()
    # CRITICAL FIX: Casting score to INTEGER inside SQL to prevent "9" sorting higher than "100"
    try:
        if filter_type == "best":
            if filter_game == "all":
                scores = conn.execute('''
                    SELECT u.username, u.avatar, s.game, MAX(CAST(s.score AS INTEGER)) as score, MAX(s.played_at) as played_at 
                    FROM scores s JOIN users u ON s.user_id = u.id GROUP BY u.id, s.game ORDER BY score DESC LIMIT 50
                ''').fetchall()
            else:
                scores = conn.execute('''
                    SELECT u.username, u.avatar, s.game, MAX(CAST(s.score AS INTEGER)) as score, MAX(s.played_at) as played_at 
                    FROM scores s JOIN users u ON s.user_id = u.id WHERE s.game = ? GROUP BY u.id ORDER BY score DESC LIMIT 50
                ''', (filter_game,)).fetchall()
        else:
            if filter_game == "all":
                scores = conn.execute('''
                    SELECT u.username, u.avatar, s.game, CAST(s.score AS INTEGER) as score, s.played_at 
                    FROM scores s JOIN users u ON s.user_id = u.id ORDER BY score DESC, s.played_at DESC LIMIT 50
                ''').fetchall()
            else:
                scores = conn.execute('''
                    SELECT u.username, u.avatar, s.game, CAST(s.score AS INTEGER) as score, s.played_at 
                    FROM scores s JOIN users u ON s.user_id = u.id WHERE s.game = ? ORDER BY score DESC, s.played_at DESC LIMIT 50
                ''', (filter_game,)).fetchall()
    except:
        scores = []
    conn.close()
    
    trs = ""
    for idx, row in enumerate(scores):
        rank = ["🥇","🥈","🥉"][idx] if idx < 3 else f"#{idx+1}"
        date_str = str(row['played_at']).split()[0] if row['played_at'] else ""
        trs += f"<tr style='border-bottom:1px solid var(--border);'><td style='padding:15px 10px;color:var(--text);'>{rank}</td><td style='padding:15px 10px; white-space:nowrap;color:var(--text);'>{row['avatar']} {row['username']}</td><td style='padding:15px 10px; color:var(--muted); text-transform:capitalize;'>{row['game']}</td><td style='padding:15px 10px; color:var(--accent); font-family:Orbitron; font-weight:bold;'>{row['score']}</td><td style='padding:15px 10px; color:var(--muted); font-size:0.9rem; white-space:nowrap;'>{date_str}</td></tr>"
    
    if not trs:
        trs = "<tr><td colspan='5' style='text-align:center; padding:2rem; color:var(--muted);'>No scores recorded yet! Go play a game.</td></tr>"

    games_filters = [
        ("all", "All Games"), ("snake", "🐍 Snake"), ("tictactoe", "⭕ Tic Tac Toe"),
        ("memory", "🃏 Memory"), ("quiz", "🧠 Quiz"), ("breakout", "🧱 Breakout"),
        ("whackamole", "🔨 Whack-a-Mole"), ("game2048", "🟦 2048"), ("pong", "🏓 Pong"),
        ("flappy", "🐦 Flappy")
    ]

    def mk_btn(label, href, active=False):
        s = "border-color:var(--accent);color:var(--accent)!important;background:rgba(0,168,122,0.1);" if active else "border-color:var(--border);"
        return f'<a href="{href}" target="_self" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px solid;font-size:0.85rem;font-weight:600;color:var(--text);transition:0.2s;{s}">{label}</a>'

    best_active   = filter_type == "best"
    history_active = filter_type == "history"

    game_btns = "".join(
        mk_btn(name, nav_url(f"page=leaderboard&filter_game={gid}&filter_type={filter_type}"), filter_game == gid)
        for gid, name in games_filters
    )

    lb_html = f"""
<div style="max-width:900px;margin:2rem auto;padding:1rem;">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:10px;">
<h2 style="font-family:Orbitron;margin:0;letter-spacing:2px;font-size:1.8rem;color:var(--text-bright);"><span style="color:gold;">🏆</span> LEADERBOARD</h2>
<div style="display:flex;gap:10px;flex-wrap:wrap;">
{mk_btn("Best Scores", nav_url(f"page=leaderboard&filter_game={filter_game}&filter_type=best"), best_active)}
{mk_btn("All History", nav_url(f"page=leaderboard&filter_game={filter_game}&filter_type=history"), history_active)}
</div>
</div>
<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:2rem;">{game_btns}</div>
<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;box-shadow:var(--shadow);">
<div style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;">
<table style="width:100%;min-width:500px;border-collapse:collapse;text-align:left;">
<thead style="background:var(--bg2);">
<tr style="border-bottom:1px solid var(--border);color:var(--muted);font-size:.9rem;text-transform:uppercase;letter-spacing:1px;">
<th style="padding:15px 10px;">#</th>
<th style="padding:15px 10px;">Player</th>
<th style="padding:15px 10px;">Game</th>
<th style="padding:15px 10px;">Score</th>
<th style="padding:15px 10px;">Date</th>
</tr>
</thead>
<tbody>{trs}</tbody>
</table>
</div>
</div>
</div>
"""
    st.markdown(lb_html, unsafe_allow_html=True)

elif page == "login":
    st.markdown(f"""
<div class="auth-wrapper">
<div class="auth-card" style="background:var(--card);border:1px solid var(--border);">
<div class="auth-logo">🎮</div>
<h2 style="color:var(--text-bright);">Welcome Back</h2>
<p class="auth-sub" style="color:var(--muted);">Login to save scores &amp; climb the leaderboard</p>
<form action="" method="GET">
<input type="hidden" name="login_submit" value="1">
<div class="form-group">
<label style="color:var(--muted);"><span>👤</span> Username or Email</label>
<input type="text" name="u" placeholder="Enter username or email" required autocomplete="username">
</div>
<div class="form-group">
<label style="color:var(--muted);"><span>🔒</span> Password</label>
<div class="input-wrap">
<input type="password" name="p" placeholder="Enter password" required autocomplete="current-password">
<span style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer;">👁️</span>
</div>
<a href="#" class="forgot-link" style="font-size:0.85rem; color:var(--muted); text-decoration:none; display:block; margin-top:8px; text-align:right;">Forgot password?</a>
</div>
<button type="submit" class="auth-btn" style="background:var(--accent);">LOGIN</button>
</form>
<div class="auth-divider" style="color:var(--muted);">or</div>
<p class="auth-link" style="color:var(--muted);">New to Game Hub? <a href="{nav_url('page=register')}" target="_self" style="color:var(--accent);">Create account →</a></p>
</div>
</div>
    """, unsafe_allow_html=True)

elif page == "register":
    avatars = ['🎮','🕹️','👾','🤖','🦊','🐉','⚡','🔥','💎','🎯','🏆','🌟']
    avatar_html = "".join([f'<label style="position:relative;"><input type="radio" name="av" value="{av}" {"checked" if loop==0 else ""} class="av-radio"><div class="av-box">{av}</div></label>' for loop, av in enumerate(avatars)])
    
    st.markdown(f"""
<div class="auth-wrapper">
<div class="auth-card" style="background:var(--card);border:1px solid var(--border);">
<div class="auth-logo">🕹️</div>
<h2 style="color:var(--text-bright);">Create Account</h2>
<p class="auth-sub" style="color:var(--muted);">Join Game Hub — track scores &amp; beat others</p>
<form action="" method="GET">
<input type="hidden" name="register_submit" value="1">
<div class="form-group">
<label style="color:var(--muted);"><span>👤</span> Username</label>
<input type="text" name="u" placeholder="Min 3 characters" required>
</div>
<div class="form-group">
<label style="color:var(--muted);"><span>📧</span> Email <small style="color:var(--muted)">(optional)</small></label>
<input type="email" name="e" placeholder="your@email.com">
</div>
<div class="form-group">
<label style="color:var(--muted);"><span>🔒</span> Password</label>
<div class="input-wrap">
<input type="password" name="p" placeholder="Min 4 characters" required>
<span style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer;">👁️</span>
</div>
</div>
<div class="form-group">
<label style="color:var(--muted);"><span>🎭</span> Choose Your Avatar</label>
<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:8px; background:var(--input-bg); padding:15px; border-radius:8px;">
{avatar_html}
</div>
</div>
<button type="submit" class="auth-btn" style="background:var(--accent);">CREATE ACCOUNT</button>
</form>
<div class="auth-divider" style="color:var(--muted);">or</div>
<p class="auth-link" style="color:var(--muted);">Already have an account? <a href="{nav_url('page=login')}" target="_self" style="color:var(--accent);">Login →</a></p>
</div>
</div>
    """, unsafe_allow_html=True)

elif game_id:
    # --- Ensure Session Exists Before Loading Game ---
    if not st.session_state.username:
        st.markdown(f"""
        <div style="max-width:800px; margin:10rem auto; text-align:center; font-family:Orbitron, sans-serif;">
          <h2 style="letter-spacing:4px; color:var(--text); font-size:1.5rem;">ACCESS DENIED</h2>
          <p style="color:var(--muted); margin-top:1rem; font-family:Rajdhani; font-size:1.1rem; margin-bottom:2rem;">Please log in to play games and save scores.</p>
          <div style="display:flex; gap:15px; justify-content:center;">
            <a href="{nav_url('page=login')}" target="_self" style="color:var(--accent); text-decoration:none; font-family:Orbitron; font-size:0.8rem; border:1px solid var(--accent); padding:10px 20px; border-radius:8px; opacity:0.8; transition:all 0.2s;">LOGIN</a>
            <a href="{nav_url()}" target="_self" style="color:var(--muted); text-decoration:none; font-family:Orbitron; font-size:0.8rem; border:1px solid var(--border); padding:10px 20px; border-radius:8px; opacity:0.8;">GO HOME</a>
          </div>
        </div>
        """, unsafe_allow_html=True)
        st.stop()

    game_titles = {
        "snake": "Snake", "tictactoe": "Tic Tac Toe", "memory": "Memory Cards",
        "quiz": "Quiz Trivia", "breakout": "Breakout", "whackamole": "Whack-a-Mole",
        "chess": "Chess", "sudoku": "Sudoku", "game2048": "2048",
        "rps": "Rock Paper Scissors", "pong": "Pong", "flappy": "Flappy Bird"
    }
    title = game_titles.get(game_id, game_id.capitalize())
    try:
        with open(f"static/js/games/{game_id}.js", "r", encoding="utf-8") as f: game_js = f.read()
    except FileNotFoundError:
        game_js = "document.getElementById('game-container').innerHTML = 'Game JS file not found!';"

    st.markdown(f"""
<style>
iframe {{ height: calc(100vh - 65px) !important; width: 100vw !important; }}
body {{ overflow: hidden !important; }}
</style>
<div style="display:flex; align-items:center; justify-content:space-between; padding:15px 20px; background:var(--nav-bg); border-bottom:1px solid var(--border);">
<a href="{nav_url()}" target="_self" style="font-size:1.5rem; color:var(--text); text-decoration:none;">❮</a>
<h2 style="font-family:'Rajdhani',sans-serif; font-weight:600; font-size:1.3rem; margin:0; color:var(--text-bright);">{title}</h2>
<div style="color:var(--text); font-size:1.5rem;">☰</div>
</div>
    """, unsafe_allow_html=True)

    js_is_logged_in = 'true' if st.session_state.username else 'false'
    js_user_id = str(st.session_state.user_id) if st.session_state.user_id else ''

    content = f"""
    <!DOCTYPE html>
    <html data-theme="{st.session_state.theme}">
    <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
    {main_css}
    {game_css}
    body {{ background-color: { '#111118' if st.session_state.theme == 'dark' else '#ffffff' }; color: { '#ffffff' if st.session_state.theme == 'dark' else '#000000' }; overflow: hidden; margin: 0; padding: 10px; height: 100vh; display: flex; flex-direction: column; }}
    #game-container {{ flex: 1; display: flex; flex-direction: column; overflow: hidden; }}
    </style>
    </head>
    <body>
    <h2 id="game-title" style="display:none;"></h2>
    <span class="score-display hide-mobile" style="display:none;">Score: <span id="score-val">0</span></span>
    <div id="game-container"></div>
    <script>
    const GAME_NAME = "{game_id}";
    const IS_LOGGED_IN = {js_is_logged_in};
    const USER_ID = "{js_user_id}";

    function updateScore(score) {{
        const scoreElem = document.getElementById('score-val');
        if (scoreElem) scoreElem.textContent = score;
    }}
    
    function submitScore(score) {{
        console.log("Attempting to submit score:", score, "User logged in:", IS_LOGGED_IN);
        if (IS_LOGGED_IN && USER_ID) {{
            const bg = document.createElement('iframe');
            bg.style.display = 'none';
            bg.src = window.parent.location.pathname + "?action=save_score_bg&game=" + GAME_NAME + "&score=" + score + "&uid=" + USER_ID;
            document.body.appendChild(bg);
            console.log("Score saved silently:", score);
            
            setTimeout(() => {{
                if (document.body.contains(bg)) document.body.removeChild(bg);
            }}, 3000);
        }} else {{
             console.warn("Could not save score. Not logged in or User ID missing.");
        }}
    }}
    
    {game_js}
    
    </script>
    </body>
    </html>
    """
    st.components.v1.html(content, height=800, scrolling=False)

elif page == "profile":
    if not st.session_state.username:
        st.markdown(f"""
<div style="max-width:800px; margin:10rem auto; text-align:center; font-family:Orbitron, sans-serif;">
<h2 style="letter-spacing:4px; color:var(--text-bright); font-size:1.5rem;">ACCESS DENIED</h2>
<p style="color:var(--muted); margin-top:1rem; font-family:Rajdhani; font-size:1.1rem; margin-bottom:2rem;">Please log in to view your profile.</p>
<div style="display:flex; gap:15px; justify-content:center;">
<a href="{nav_url('page=login')}" target="_self" style="color:var(--accent); text-decoration:none; font-family:Orbitron; font-size:0.8rem; border:1px solid var(--accent); padding:10px 20px; border-radius:8px; opacity:0.8; transition:all 0.2s;">LOGIN</a>
<a href="{nav_url()}" target="_self" style="color:var(--muted); text-decoration:none; font-family:Orbitron; font-size:0.8rem; border:1px solid var(--border); padding:10px 20px; border-radius:8px; opacity:0.8;">GO HOME</a>
</div>
</div>
""", unsafe_allow_html=True)
        st.stop()

    conn = get_db()
    user_row = conn.execute('SELECT username,email,avatar,bio FROM users WHERE id=?', (st.session_state.user_id,)).fetchone()
    scores_rows = conn.execute(
        'SELECT game, CAST(score AS INTEGER) as score, played_at FROM scores WHERE user_id=? ORDER BY score DESC, played_at DESC LIMIT 20',
        (st.session_state.user_id,)
    ).fetchall()
    conn.close()

    cur_bio   = user_row['bio']   or ""
    cur_email = user_row['email'] or ""
    tok       = st.session_state.get("sess_token", "")

    avatars = ['🎮','🕹️','👾','🤖','🦊','🐉','⚡','🔥','💎','🎯','🏆','🌟']
    av_btns = "".join(
        f'<label style="position:relative;"><input type="radio" name="av" value="{av}" {"checked" if av == st.session_state.avatar else ""} class="av-radio"><div class="av-box">{av}</div></label>'
        for av in avatars
    )

    score_rows_html = "".join(
        f"<tr><td style='padding:15px 10px; font-weight:600; text-transform:capitalize; color:var(--text);'>{r['game']}</td><td style='padding:15px 10px; color:var(--accent); font-family:Orbitron,monospace; font-weight:700;'>{r['score']}</td><td style='padding:15px 10px; color:var(--muted); font-size:.85rem;'>{str(r['played_at']).split()[0] if r['played_at'] else '-'}</td></tr>"
        for r in scores_rows
    ) or "<tr><td colspan='3' style='padding:3rem; text-align:center; color:var(--muted);'>No games played yet.</td></tr>"

    msg_html = ""
    if st.session_state.profile_msg:
        color = "var(--accent)" if "✅" in st.session_state.profile_msg else "#ef4444"
        msg_html = f'<div style="background:rgba(16, 185, 129, 0.1);border:1px solid {color};color:{color};padding:.8rem 1rem;border-radius:10px;margin-bottom:1.2rem;font-size:.9rem;">{st.session_state.profile_msg}</div>'
        st.session_state.profile_msg = ""

    safe_username = str(st.session_state.username).replace('"', '&quot;')
    leaderboard_url = nav_url('page=leaderboard')
    logout_url = nav_url('action=logout')
    
    profile_html = f"""
<div style="max-width:1000px; margin:2rem auto; padding:1.5rem 1rem;">
<div style="background:var(--card); border:1px solid var(--border); border-radius:20px; padding:2rem; margin-bottom:2rem; display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap; box-shadow:var(--shadow-card);">
<span style="font-size:4rem;">{st.session_state.avatar}</span>
<div style="flex:1; min-width:200px;">
<div style="font-family:Orbitron,monospace; font-size:1.5rem; font-weight:900; color:var(--accent);">{st.session_state.username}</div>
<div style="color:var(--muted); font-size:.9rem; margin-top:.3rem;">{cur_email or "No email set"}</div>
<div style="color:var(--text); font-size:.95rem; margin-top:.5rem;">{cur_bio or "<em style='color:var(--muted)'>No bio yet</em>"}</div>
</div>
<a href="{logout_url}" target="_self" style="padding:.6rem 1.4rem; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#ef4444; border-radius:10px; text-decoration:none; font-weight:600; font-size:.9rem; white-space:nowrap;">🚪 Logout</a>
</div>
<div class="mobile-stack" style="display:grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap:2rem; align-items:start;">
<div style="background:var(--card); border:1px solid var(--border); border-radius:20px; padding:2.5rem; box-shadow:var(--shadow-card);">
<h2 style="font-family:Orbitron,monospace; font-size:1.1rem; letter-spacing:2px; margin-bottom:2rem; color:var(--text-bright);">✏️ EDIT PROFILE</h2>
{msg_html}
<form method="GET" action="" style="display:flex; flex-direction:column; gap:1.8rem;">
<input type="hidden" name="action" value="update_profile">
<input type="hidden" name="_tok" value="{tok}">
<div>
<label style="color:var(--muted); font-size:0.75rem; text-transform:uppercase; letter-spacing:2px; display:block; margin-bottom:0.8rem; font-weight:600;">Username</label>
<input type="text" name="name" value="{safe_username}" style="width:100%; background:var(--input-bg); border:1px solid var(--border); border-radius:12px; padding:1rem; color:var(--text); font-size:1rem; outline:none; transition:0.3s;">
</div>
<div>
<label style="color:var(--muted); font-size:0.75rem; text-transform:uppercase; letter-spacing:2px; display:block; margin-bottom:0.8rem; font-weight:600;">Bio</label>
<textarea name="bio" placeholder="Tell people about yourself..." style="width:100%; background:var(--input-bg); border:1px solid var(--border); border-radius:12px; padding:1rem; color:var(--text); font-size:1rem; height:100px; resize:none; outline:none; transition:0.3s;">{cur_bio}</textarea>
</div>
<div>
<label style="color:var(--muted); font-size:0.75rem; text-transform:uppercase; letter-spacing:2px; display:block; margin-bottom:0.8rem; font-weight:600;">New Password</label>
<input type="password" name="pw" placeholder="Leave blank to keep current" style="width:100%; background:var(--input-bg); border:1px solid var(--border); border-radius:12px; padding:1rem; color:var(--text); font-size:1rem; outline:none;">
</div>
<div>
<label style="color:var(--muted); font-size:0.75rem; text-transform:uppercase; letter-spacing:2px; display:block; margin-bottom:1.2rem; font-weight:600;">Choose Avatar</label>
<div style="display:flex; flex-wrap:wrap; gap:12px;">{av_btns}</div>
</div>
<button type="submit" class="auth-btn" style="margin-top:1.5rem; width:100%; background:var(--accent); color:var(--btn-text); font-weight:bold; cursor:pointer; font-family:Orbitron; padding:1.2rem; border-radius:12px; border:none; font-size:1rem; letter-spacing:2px; box-shadow:var(--glow);">SAVE CHANGES</button>
</form>
</div>
<div style="background:var(--card); border:1px solid var(--border); border-radius:20px; padding:0; box-shadow:var(--shadow-card); height:fit-content; overflow:hidden;">
<h3 style="font-family:Orbitron; font-size:0.85rem; letter-spacing:3px; margin:2.5rem 2.5rem 1.5rem; color:var(--accent); display:flex; align-items:center; gap:10px;"><span style="font-size:1.2rem;">🏆</span> HISTORY</h3>
<div style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:0 1rem;">
<table style="width:100%; border-collapse:collapse; font-size:0.95rem; min-width:300px;">
<thead>
<tr style="text-align:left; color:var(--muted); font-size:0.75rem; border-bottom:1px solid var(--border); text-transform:uppercase; letter-spacing:1px;">
<th style="padding:10px 15px;">GAME</th>
<th style="padding:10px 15px;">SCORE</th>
<th style="padding:10px 15px;">DATE</th>
</tr>
</thead>
<tbody>{score_rows_html}</tbody>
</table>
</div>
<a href="{leaderboard_url}" target="_self" style="display:block; text-align:center; margin:2rem 0 2.5rem; color:var(--accent); text-decoration:none; font-size:0.8rem; font-family:Orbitron; letter-spacing:1px; font-weight:bold;">GLOBAL RANKINGS →</a>
</div>
</div>
</div>
"""
    st.markdown(profile_html, unsafe_allow_html=True)

else:
    # Render Full Homepage — SVG-based game cards
    GAMES = [
        ("snake",     "Snake",              "Eat food, grow longer, don't hit walls!", "Classic",  "#00ff87",
         '<path d="M3 11v4a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4v-4a4 4 0 0 0-4-4H7a4 4 0 0 1-4-4V3"/><circle cx="17" cy="11" r="1" fill="#00ff87" stroke="none"/>'),
        ("tictactoe", "Tic Tac Toe",        "The timeless 3×3 strategy game",          "2 Player", "#ff6b6b",
         '<circle cx="7" cy="7" r="4"/><path d="M13 13l8 8M21 13l-8 8"/>'),
        ("memory",   "Memory Cards",        "Match all pairs with fewest moves",        "Puzzle",   "#4ecdc4",
         '<rect x="3" y="3" width="12" height="14" rx="2"/><rect x="9" y="7" width="12" height="14" rx="2"/>'),
        ("quiz",     "Quiz Trivia",         "Test your knowledge across topics",        "Knowledge","#ffe66d",
         '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/>'),
        ("breakout", "Breakout",            "Break all bricks with your ball",          "Arcade",   "#ff9f43",
         '<rect x="3" y="4" width="8" height="4"/><rect x="13" y="4" width="8" height="4"/><rect x="8" y="10" width="8" height="4"/><rect x="9" y="20" width="6" height="2" rx="1"/><circle cx="12" cy="16" r="1.5"/>'),
        ("whackamole","Whack-a-Mole",       "Whack those moles before they hide!",      "Action",   "#a29bfe",
         '<ellipse cx="12" cy="14" rx="7" ry="5"/><path d="M9 9c0-3 6-3 6 0"/><line x1="12" y1="4" x2="12" y2="7"/>'),
        ("chess",    "Chess",               "The ultimate strategy board game",         "Strategy", "#fd79a8",
         '<path d="M12 2v2M8 4h8M9 4v4l2 2v4H9l-2 6h10l-2-6h-2v-4l2-2V4"/>'),
        ("sudoku",   "Sudoku",              "Fill the 9×9 grid with logic",            "Puzzle",   "#55efc4",
         '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'),
        ("game2048", "2048",                "Slide tiles to reach 2048!",              "Puzzle",   "#ffeaa7",
         '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 9h4v6H8zM14 9v6M14 12h3"/>'),
        ("rps",      "Rock Paper Scissors", "Beat the computer in best of 5!",         "Luck",     "#74b9ff",
         '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>'),
        ("pong",     "Pong",               "First to 7 wins — vs AI or 2 player!",    "Arcade",   "#fd79a8",
         '<rect x="4" y="6" width="2" height="8" rx="1"/><rect x="18" y="10" width="2" height="8" rx="1"/><rect x="11" y="11" width="2" height="2"/>'),
        ("flappy",   "Flappy Bird",         "Dodge the pipes — how far can you go?",   "Action",   "#55efc4",
         '<path d="M19 22v-6M19 8V2M16 16h6M16 8h6"/><path d="M4 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0z"/><path d="M10 12h2"/>'),
    ]

    cards_html = ""
    for gid, title, desc, tag, color, svg_paths in GAMES:
        cards_html += (
            f'<a href="{nav_url(f"game={gid}")}" target="_self" class="game-card" style="--c:{color}">'
            f'<div class="game-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">{svg_paths}</svg></div>'
            f'<h3>{title}</h3><p>{desc}</p>'
            f'<span class="game-tag">{tag}</span>'
            f'</a>'
        )

    if st.session_state.username:
        hero_btns = f'<p class="hero-welcome">Welcome back, <strong>{st.session_state.username}</strong>! Ready to play? 🎮</p>'
    else:
        hero_btns = (
            '<div class="hero-btns">'
            f'<a href="{nav_url("page=register")}" target="_self" class="cta-btn" style="background:var(--btn-bg);color:var(--btn-text);">Get Started</a>'
            f'<a href="{nav_url("page=login")}" target="_self" class="cta-btn cta-outline" style="color:var(--text-bright);border-color:var(--border);">Login</a>'
            '</div>'
        )

    st.markdown(f"""
<section class="hero">
<div class="hero-content">
<h1 class="hero-title" style="color:var(--text-bright);">GAME<span style="color:var(--accent);">HUB</span></h1>
<p class="hero-sub" style="color:var(--muted);">12 Classic Games &middot; Leaderboards &middot; Compete with Friends</p>
{hero_btns}
</div>
</section>
<section class="games-section">
<h2 class="section-title" style="color:var(--text-bright);">Choose Your Game</h2>
<div class="games-grid">{cards_html}</div>
</section>
<section style="max-width:1000px;margin:0 auto;">
<div class="features">
<div class="feature-card" style="background:var(--card);border:1px solid var(--border);">
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 21h8M12 17v4M7 4h10M5 4v7a7 7 0 0 0 14 0V4H5z"/></svg>
<h3 style="color:var(--text-bright);">Leaderboards</h3>
<p style="color:var(--muted);">Compete for the top spot in every game</p>
</div>
<div class="feature-card" style="background:var(--card);border:1px solid var(--border);">
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
<h3 style="color:var(--text-bright);">User Accounts</h3>
<p style="color:var(--muted);">Register and track your high scores</p>
</div>
<div class="feature-card" style="background:var(--card);border:1px solid var(--border);">
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/></svg>
<h3 style="color:var(--text-bright);">12 Games</h3>
<p style="color:var(--muted);">Classic games playable right in your browser</p>
</div>
</div>
</section>
""", unsafe_allow_html=True)