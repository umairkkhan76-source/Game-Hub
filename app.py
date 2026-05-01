from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import sqlite3, hashlib, random, string
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'gamehub_secret_key_2025'
DB = 'gamehub.db'

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT    UNIQUE NOT NULL,
            email    TEXT    UNIQUE,
            password TEXT    NOT NULL,
            avatar   TEXT    DEFAULT '🎮',
            bio      TEXT    DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS admins (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT    UNIQUE NOT NULL,
            password TEXT    NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS scores (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER,
            game       TEXT NOT NULL,
            score      INTEGER NOT NULL,
            saved      INTEGER DEFAULT 0,
            played_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS score_history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER,
            game       TEXT NOT NULL,
            score      INTEGER NOT NULL,
            played_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS reset_tokens (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            token   TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    conn.commit()
    conn.close()

def hash_password(p):
    return hashlib.sha256(p.encode()).hexdigest()

def gen_token(n=32):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=n))

# ── Pages ──────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html', user=session.get('username'))

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        d = request.get_json()
        username = d.get('username','').strip()
        password = d.get('password','')
        conn = get_db()
        row = conn.execute(
            'SELECT * FROM users WHERE (username=? OR email=?) AND password=?',
            (username, username, hash_password(password))
        ).fetchone()
        conn.close()
        if row:
            session['username'] = row['username']
            session['user_id']  = row['id']
            session['avatar']   = row['avatar']
            return jsonify({'success': True, 'username': row['username']})
        return jsonify({'success': False, 'message': 'Invalid username/email or password'})
    return render_template('login.html')

@app.route('/register', methods=['GET','POST'])
def register():
    if request.method == 'POST':
        d = request.get_json()
        username = d.get('username','').strip()
        password = d.get('password','')
        email    = d.get('email','').strip() or None
        avatar   = d.get('avatar', '🎮')
        if len(username) < 3:
            return jsonify({'success': False, 'message': 'Username must be at least 3 characters'})
        if len(password) < 4:
            return jsonify({'success': False, 'message': 'Password must be at least 4 characters'})
        try:
            conn = get_db()
            conn.execute(
                'INSERT INTO users (username, email, password, avatar) VALUES (?,?,?,?)',
                (username, email, hash_password(password), avatar)
            )
            conn.commit()
            row = conn.execute('SELECT id FROM users WHERE username=?', (username,)).fetchone()
            conn.close()
            session['username'] = username
            session['user_id']  = row['id']
            session['avatar']   = avatar
            return jsonify({'success': True, 'username': username})
        except sqlite3.IntegrityError as e:
            msg = 'Email already registered' if 'email' in str(e) else 'Username already taken'
            return jsonify({'success': False, 'message': msg})
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/leaderboard')
def leaderboard():
    return render_template('leaderboard.html', user=session.get('username'))

@app.route('/profile')
def profile():
    if 'username' not in session:
        return redirect(url_for('login'))
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE id=?', (session['user_id'],)).fetchone()
    scores = conn.execute(
        '''SELECT game, score, played_at FROM scores
           WHERE user_id=? ORDER BY played_at DESC''',
        (session['user_id'],)
    ).fetchall()
    history = conn.execute(
        '''SELECT game, score, played_at FROM score_history
           WHERE user_id=? ORDER BY played_at DESC LIMIT 30''',
        (session['user_id'],)
    ).fetchall()
    total_games = conn.execute(
        'SELECT COUNT(*) as c FROM score_history WHERE user_id=?',
        (session['user_id'],)
    ).fetchone()['c']
    conn.close()
    return render_template('profile.html',
        user=session.get('username'),
        profile=dict(user),
        scores=[dict(s) for s in scores],
        history=[dict(h) for h in history],
        total_games=total_games
    )

@app.route('/api/update_profile', methods=['POST'])
def update_profile():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    d = request.get_json()
    bio    = d.get('bio', '')[:200]
    avatar = d.get('avatar', '🎮')
    conn = get_db()
    conn.execute('UPDATE users SET bio=?, avatar=? WHERE id=?',
                 (bio, avatar, session['user_id']))
    conn.commit()
    conn.close()
    session['avatar'] = avatar
    return jsonify({'success': True})

# ── Forgot password (simulated — prints token to terminal) ─────────
@app.route('/forgot-password', methods=['GET','POST'])
def forgot_password():
    if request.method == 'POST':
        d = request.get_json()
        identifier = d.get('identifier','').strip()
        conn = get_db()
        user = conn.execute(
            'SELECT * FROM users WHERE username=? OR email=?',
            (identifier, identifier)
        ).fetchone()
        if not user:
            conn.close()
            return jsonify({'success': False, 'message': 'No account found with that username or email'})
        token = gen_token()
        conn.execute('DELETE FROM reset_tokens WHERE user_id=?', (user['id'],))
        conn.execute('INSERT INTO reset_tokens (user_id, token) VALUES (?,?)',
                     (user['id'], token))
        conn.commit()
        conn.close()
        reset_link = f"http://localhost:5000/reset-password/{token}"
        return jsonify({'success': True,
                        'message': f"Reset link generated. In production this would be emailed. For now check your terminal.",
                        'token': token})
    return render_template('forgot_password.html')

@app.route('/reset-password/<token>', methods=['GET','POST'])
def reset_password(token):
    conn = get_db()
    row = conn.execute('SELECT * FROM reset_tokens WHERE token=?', (token,)).fetchone()
    if not row:
        conn.close()
        return render_template('reset_password.html', error='Invalid or expired reset link', token=token)
    if request.method == 'POST':
        d = request.get_json()
        new_pass = d.get('password','')
        if len(new_pass) < 4:
            conn.close()
            return jsonify({'success': False, 'message': 'Password must be at least 4 characters'})
        conn.execute('UPDATE users SET password=? WHERE id=?',
                     (hash_password(new_pass), row['user_id']))
        conn.execute('DELETE FROM reset_tokens WHERE token=?', (token,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    conn.close()
    return render_template('reset_password.html', token=token)

VALID_GAMES = ['snake','tictactoe','memory','quiz','breakout','flappy',
               'whackamole','chess','sudoku','pong','game2048','rps']

@app.route('/game/<n>')
def game(n):
    if n not in VALID_GAMES:
        return redirect(url_for('index'))
    return render_template('game.html', game=n, user=session.get('username'))

# ── Score API ───────────────────────────────────────────────────────
@app.route('/api/score', methods=['POST'])
def save_score():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    d = request.get_json()
    game_name = d.get('game')
    score     = d.get('score', 0)
    uid       = session['user_id']
    conn      = get_db()

    # Always log to score_history
    conn.execute(
        'INSERT INTO score_history (user_id, game, score) VALUES (?,?,?)',
        (uid, game_name, score)
    )

    # Update best score in scores table
    existing = conn.execute(
        'SELECT id, score FROM scores WHERE user_id=? AND game=?',
        (uid, game_name)
    ).fetchone()
    is_best = False
    if existing:
        if score > existing['score']:
            conn.execute(
                'UPDATE scores SET score=?, saved=1, played_at=CURRENT_TIMESTAMP WHERE id=?',
                (score, existing['id'])
            )
            is_best = True
    else:
        conn.execute(
            'INSERT INTO scores (user_id, game, score, saved) VALUES (?,?,?,1)',
            (uid, game_name, score)
        )
        is_best = True
    conn.commit()
    conn.close()
    msg = f'🏆 New best score: {score}!' if is_best else f'Score recorded! Your best is {existing["score"] if existing else score}.'
    return jsonify({'success': True, 'is_best': is_best, 'message': msg})

# ── Leaderboard API ─────────────────────────────────────────────────
@app.route('/api/leaderboard')
def api_leaderboard():
    gname = request.args.get('game','')
    mode  = request.args.get('mode','best')  # best | history
    conn  = get_db()

    if mode == 'history':
        if gname:
            rows = conn.execute('''
                SELECT u.username, u.avatar, sh.game, sh.score, sh.played_at
                FROM score_history sh JOIN users u ON sh.user_id=u.id
                WHERE sh.game=? ORDER BY sh.score DESC LIMIT 50
            ''', (gname,)).fetchall()
        else:
            rows = conn.execute('''
                SELECT u.username, u.avatar, sh.game, sh.score, sh.played_at
                FROM score_history sh JOIN users u ON sh.user_id=u.id
                ORDER BY sh.played_at DESC LIMIT 50
            ''').fetchall()
    else:
        if gname:
            rows = conn.execute('''
                SELECT u.username, u.avatar, s.game, s.score, s.played_at
                FROM scores s JOIN users u ON s.user_id=u.id
                WHERE s.game=? ORDER BY s.score DESC LIMIT 50
            ''', (gname,)).fetchall()
        else:
            rows = conn.execute('''
                SELECT u.username, u.avatar, s.game, s.score, s.played_at
                FROM scores s JOIN users u ON s.user_id=u.id
                ORDER BY s.score DESC LIMIT 50
            ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/me')
def me():
    if 'username' not in session:
        return jsonify({'logged_in': False})
    return jsonify({
        'logged_in': True,
        'username': session['username'],
        'avatar': session.get('avatar','🎮')
    })

@app.route('/api/my_stats')
def my_stats():
    if 'user_id' not in session:
        return jsonify({'success': False})
    conn = get_db()
    best_scores = conn.execute(
        'SELECT game, score FROM scores WHERE user_id=? ORDER BY score DESC',
        (session['user_id'],)
    ).fetchall()
    total_plays = conn.execute(
        'SELECT COUNT(*) as c FROM score_history WHERE user_id=?',
        (session['user_id'],)
    ).fetchone()['c']
    conn.close()
    return jsonify({
        'success': True,
        'best_scores': [dict(r) for r in best_scores],
        'total_plays': total_plays
    })
# ── Admin Routes ────────────────────────────────────────────────────
def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('is_admin'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated

@app.route('/admin/register', methods=['GET','POST'])
def admin_register():
    if request.method == 'POST':
        d = request.get_json()
        username = d.get('username','').strip()
        password = d.get('password','')
        if len(username) < 3:
            return jsonify({'success': False, 'message': 'Username too short'})
        if len(password) < 4:
            return jsonify({'success': False, 'message': 'Password too short'})
        try:
            conn = get_db()
            conn.execute('INSERT INTO admins (username, password) VALUES (?,?)',
                         (username, hash_password(password)))
            conn.commit()
            conn.close()
            return jsonify({'success': True})
        except sqlite3.IntegrityError:
            return jsonify({'success': False, 'message': 'Username already taken'})
    return render_template('admin_register.html')

@app.route('/admin/login', methods=['GET','POST'])
def admin_login():
    if request.method == 'POST':
        d = request.get_json()
        username = d.get('username','').strip()
        password = d.get('password','')
        conn = get_db()
        row = conn.execute(
            'SELECT * FROM admins WHERE username=? AND password=?',
            (username, hash_password(password))
        ).fetchone()
        conn.close()
        if row:
            session['is_admin'] = True
            session['admin_username'] = row['username']
            return jsonify({'success': True})
        return jsonify({'success': False, 'message': 'Invalid credentials'})
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('is_admin', None)
    session.pop('admin_username', None)
    return redirect(url_for('admin_login'))

@app.route('/admin')
@admin_required
def admin_dashboard():
    conn = get_db()
    users = conn.execute('''
        SELECT u.id, u.username, u.email, u.avatar, u.created_at,
               COUNT(DISTINCT sh.id) as total_games,
               MAX(sh.played_at) as last_played
        FROM users u
        LEFT JOIN score_history sh ON u.id = sh.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    ''').fetchall()
    conn.close()
    return render_template('admin_dashboard.html',
        admin=session.get('admin_username'),
        users=[dict(u) for u in users]
    )

@app.route('/admin/user/<int:uid>')
@admin_required
def admin_user_detail(uid):
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone()
    if not user:
        conn.close()
        return redirect(url_for('admin_dashboard'))
    scores = conn.execute(
        'SELECT game, score, played_at FROM scores WHERE user_id=? ORDER BY score DESC',
        (uid,)
    ).fetchall()
    history = conn.execute(
        'SELECT game, score, played_at FROM score_history WHERE user_id=? ORDER BY played_at DESC LIMIT 50',
        (uid,)
    ).fetchall()
    conn.close()
    return render_template('admin_user_detail.html',
        admin=session.get('admin_username'),
        user=dict(user),
        scores=[dict(s) for s in scores],
        history=[dict(h) for h in history]
    )

@app.route('/admin/delete_user/<int:uid>', methods=['POST'])
@admin_required
def admin_delete_user(uid):
    conn = get_db()
    conn.execute('DELETE FROM score_history WHERE user_id=?', (uid,))
    conn.execute('DELETE FROM scores WHERE user_id=?', (uid,))
    conn.execute('DELETE FROM reset_tokens WHERE user_id=?', (uid,))
    conn.execute('DELETE FROM users WHERE id=?', (uid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# Ensure DB is created on import (for production WSGI servers like Gunicorn)
init_db()

if __name__ == '__main__':
    print("\n[Game Hub] is running!")
    print("-> Open http://localhost:5000 in your browser\n")
    app.run(debug=True)