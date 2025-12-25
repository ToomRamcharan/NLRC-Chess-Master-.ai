// Imports removed for local global scope compatibility
// import { ChessUI } from './ui.js';
// import { ChessAI } from './ai.js';

// Wait for chess.js to load since it's a non-module script
const waitForChess = () => {
    return new Promise(resolve => {
        if (window.Chess) return resolve();
        const interval = setInterval(() => {
            if (window.Chess) {
                clearInterval(interval);
                resolve();
            }
        }, 50);
    });
};

class GameApp {
    constructor() {
        this.game = null;
        this.ui = null;
        this.ai = null;
        this.currentMode = 'friend'; // 'friend', 'ai', 'puzzle'
        this.aiLevel = 1;
        this.isAiThinking = false;

        // Sample Puzzles (FEN + Solution Move)
        this.puzzles = [
            {
                fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
                move: { from: 'h5', to: 'f7' },
                title: "Scholar's Mate",
                desc: "White to move and checkmate in 1!"
            },
            {
                fen: "r2qkbnr/pp1npppp/8/2ppP3/6b1/5N2/PPPPQPPP/RNB1KB1R w KQkq - 0 1", /* made up */
                // Let's stick to one solid puzzle for 'Daily Puzzle' to start
                title: "Tactical Shot",
                desc: "Find the best move!"
            }
        ];
        this.currentPuzzle = null;
    }

    async init() {
        console.log("Initializing NLRC Chess Master...");
        await waitForChess();
        if (!window.Chess) {
            console.error("Critical Error: Chess.js library failed to load.");
            alert("Error: Chess engine could not load. Please check your internet connection.");
            return;
        }

        this.game = new window.Chess();
        this.ui = new ChessUI(document.getElementById('chess-board'), {
            onMove: (from, to) => this.onUserMove(from, to),
            getLegalMoves: (square) => this.game.moves({ square, verbose: true })
        });

        this.ai = new ChessAI();
        this.initControls();
        this.updateStatus();
        this.ui.render(this.game.fen());
        console.log("NLRC Chess Master initialized.");
    }

    initControls() {
        console.log("Initializing Controls...");

        // 1. Play Bots
        const botCard = document.getElementById('card-play-bot');
        if (botCard) {
            botCard.addEventListener('click', () => {
                this.setMode('ai');
                this.highlightCard(botCard);
            });
        }

        // 2. Play Friend
        const friendCard = document.getElementById('card-play-friend');
        if (friendCard) {
            friendCard.addEventListener('click', () => {
                this.setMode('friend');
                this.highlightCard(friendCard);
            });
        }

        // 3. Puzzles
        const puzzleCard = document.getElementById('card-puzzles');
        if (puzzleCard) {
            puzzleCard.addEventListener('click', () => {
                this.startPuzzle();
                this.highlightCard(puzzleCard);
            });
        }


        // AI Level Slider
        const slider = document.getElementById('ai-level-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                this.aiLevel = parseInt(e.target.value);
                console.log("Slider changed to:", this.aiLevel);
                this.updateAiLevelDisplay();
            });
        } else {
            console.warn("Slider element not found!");
        }

        // Game Actions
        const btnReset = document.getElementById('btn-reset');
        if (btnReset) {
            btnReset.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetGame();
            });
        }

        const btnUndo = document.getElementById('btn-undo');
        if (btnUndo) {
            btnUndo.addEventListener('click', (e) => {
                e.preventDefault(); // crucial
                console.log("Undo clicked");
                this.undoMove();
            });
        }

        const btnFlip = document.getElementById('btn-flip');
        if (btnFlip) {
            btnFlip.addEventListener('click', (e) => {
                e.preventDefault(); // crucial
                console.log("Flip clicked");
                this.ui.flipBoard();
                this.ui.render(this.game.fen());
            });
        }

        const playBtn = document.getElementById('btn-play');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setMode('friend');
                this.highlightCard(playBtn);
            });
        }

        const puzzleBtn = document.getElementById('btn-puzzle');
        if (puzzleBtn) {
            puzzleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startPuzzle();
            });
        }

        const learnBtn = document.getElementById('btn-learn');
        if (learnBtn) {
            learnBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showTutorial();
            });
        }

        console.log("Controls Initialized.");
        this.updateStatus("App Ready. Controls Active.");
    }


    highlightCard(activeCard) {
        document.querySelectorAll('.menu-card').forEach(c => c.style.borderColor = 'transparent');
        // activeCard.style.borderColor = 'var(--primary-accent)'; // Or add class
        // Let's just rely on visual feedback or add a class if we want to stick.
    }

    setMode(mode) {
        this.currentMode = mode;
        const aiPanel = document.getElementById('ai-settings-panel');
        // const puzzleBanner...

        if (mode === 'friend') {
            aiPanel.classList.add('hidden');
        } else if (mode === 'ai') {
            aiPanel.classList.remove('hidden');
        }
        this.resetGame();
    }

    updateAiLevelDisplay() {
        const title = document.getElementById('level-name');
        const desc = document.getElementById('level-desc');
        const levels = {
            1: { name: "Single Mind", desc: "Random & Basic checking" },
            2: { name: "Double Mind", desc: "Captures & Defense" },
            3: { name: "Triple Mind", desc: "Basic Tactics" },
            4: { name: "Quad Mind", desc: "Depth 2 Search" },
            5: { name: "Hive Mind (5)", desc: "Depth 2 + Positioning" },
            10: { name: "Deep Thought (10)", desc: "Depth 3 Search" },
            17: { name: "17 Minds (God Mode)", desc: "Full Depth + Aggressive" }
        };
        // Fallback or interpolation for other levels
        let info = levels[this.aiLevel];
        if (!info) {
            if (this.aiLevel < 5) info = { name: `${this.aiLevel} Minds`, desc: "Increasing tactical awareness" };
            else if (this.aiLevel < 10) info = { name: `Hive Mind (${this.aiLevel})`, desc: "Advanced positioning" };
            else info = { name: `Neuro-Net (${this.aiLevel})`, desc: "Grandmaster emulation" };
        }
        title.innerText = info.name;
        if (desc) desc.innerText = info.desc;
    }

    startPuzzle() {
        this.currentMode = 'puzzle';

        // Use Global Puzzle DB if available, else fallback
        const source = window.CHESS_PUZZLES || this.puzzles;

        // Pick random puzzle that isn't the current one (if possible)
        let nextPuzzle;
        do {
            nextPuzzle = source[Math.floor(Math.random() * source.length)];
        } while (source.length > 1 && nextPuzzle === this.currentPuzzle);

        this.currentPuzzle = nextPuzzle;

        // Load Puzzle
        // Note: property name in puzzles.js is 'currentFen', in old list 'fen'. Handle both.
        const fen = this.currentPuzzle.currentFen || this.currentPuzzle.fen;
        this.game.load(fen);
        this.ui.render(this.game.fen());

        // Show Animated Puzzle Banner
        const statusEl = document.getElementById('status-text');
        statusEl.innerHTML = `
            <div class="puzzle-banner slide-in">
                <span class="puzzle-icon">🧩</span>
                <div class="puzzle-info">
                    <span class="puzzle-title">${this.currentPuzzle.title}</span>
                    <span class="puzzle-desc">${this.currentPuzzle.desc || "Find the best move!"}</span>
                </div>
            </div>
        `;

        const tagline = document.querySelector('.tagline');
        if (tagline) {
            tagline.innerText = `Puzzle: ${this.currentPuzzle.title}`;
            tagline.classList.add('pulse-text');
        }

        SoundManager.playNotify();
    }

    showTutorial() {
        const modal = document.getElementById('game-over-modal');
        const title = document.getElementById('modal-title');
        const reason = document.getElementById('modal-reason');

        // Hide game results
        document.querySelector('.result-display').style.display = 'none';

        title.innerText = "Chess Mastery Guide";

        // Rich Content for Tutorial
        reason.innerHTML = `
            <div class="tutorial-content">
                
                <!-- 1. Basics -->
                <div class="doc-section">
                    <div class="doc-header">1️⃣ Basics: The Chessboard & Pieces</div>
                    <div class="doc-sub-header">📌 The Board</div>
                    <ul class="doc-list">
                        <li>8×8 squares = 64 squares</li>
                        <li><strong>Always place white square on the right</strong></li>
                        <li>Rows = ranks | Columns = files</li>
                    </ul>

                    <div class="doc-sub-header">♟️ Pieces & How They Move</div>
                    <table class="strategy-table">
                        <thead><tr><th>Piece</th><th>Movement</th></tr></thead>
                        <tbody>
                            <tr><td>Pawn</td><td>Forward 1 (2 on 1st move), captures diagonal</td></tr>
                            <tr><td>Rook</td><td>Straight lines (rows & columns)</td></tr>
                            <tr><td>Knight</td><td>L-shape (2+1), can jump pieces</td></tr>
                            <tr><td>Bishop</td><td>Diagonal only</td></tr>
                            <tr><td>Queen</td><td>Rook + Bishop (Any straight line)</td></tr>
                            <tr><td>King</td><td>1 square in any direction</td></tr>
                        </tbody>
                    </table>
                    <p class="doc-text" style="margin-top:1rem"><strong>👉 Goal: Checkmate the opponent’s king.</strong></p>
                </div>

                <!-- 2. Special Rules -->
                <div class="doc-section">
                    <div class="doc-header">2️⃣ Special Rules You MUST Know</div>
                    
                    <div class="highlight-box">
                        <strong>🔐 Castling:</strong> King + Rook move together.
                        <br><em>Conditions:</em> Neither moved, path clear, King not in check.
                    </div>

                    <div class="highlight-box">
                        <strong>🎯 En Passant:</strong> Pawn captures another pawn immediately after it moves 2 squares (as if it moved 1).
                    </div>

                    <div class="highlight-box">
                        <strong>👑 Promotion:</strong> Pawn reaches end → becomes Queen/Rook/Bishop/Knight.
                    </div>
                </div>

                <!-- 3. Beginner Strategy -->
                <div class="doc-section">
                    <div class="doc-header">3️⃣ Beginner Strategy (0–800)</div>
                    <div class="doc-sub-header">✅ Opening Principles</div>
                    <ul class="doc-list">
                        <li>Control the center (e4, d4)</li>
                        <li>Develop minor pieces (Knights & Bishops)</li>
                        <li>Castle early</li>
                        <li>Don’t bring Queen out too early</li>
                    </ul>
                    <div class="doc-sub-header">⭐ Simple Opening: Italian Game</div>
                    <p class="doc-text">1. e4 e5 <br> 2. Nf3 Nc6 <br> 3. Bc4</p>
                </div>

                <!-- 4. Tactics -->
                <div class="doc-section">
                    <div class="doc-header">4️⃣ Tactics: The Heart of Chess (800–1400)</div>
                    <p class="doc-text"><strong>🔥 Must-Know Tactics:</strong></p>
                    <ul class="doc-list">
                        <li><strong>Fork:</strong> One piece attacks two.</li>
                        <li><strong>Pin:</strong> Piece can’t move (screens King/Queen).</li>
                        <li><strong>Skewer:</strong> Stronger piece is behind attacked piece.</li>
                        <li><strong>Discovered Attack:</strong> Moving a piece reveals an attack from behind.</li>
                    </ul>
                    <p class="doc-text"><em>🧠 Rule: If you don’t see tactics, you’ll never reach pro. Solve 10–20 puzzles/day.</em></p>
                </div>

                <!-- 5. Middlegame -->
                <div class="doc-section">
                    <div class="doc-header">5️⃣ Middlegame Thinking (1400–1800)</div>
                    <p class="doc-text"><strong>🎯 Ask every move:</strong></p>
                    <ul class="doc-list">
                        <li>What is my opponent threatening?</li>
                        <li>What is my worst piece?</li>
                        <li>Where is the King weak?</li>
                    </ul>
                </div>

                <!-- 6. Endgame -->
                <div class="doc-section">
                    <div class="doc-header">6️⃣ Endgame Mastery (1800+)</div>
                    <p class="doc-text"><strong>🏁 Essential Endgames:</strong></p>
                    <ul class="doc-list">
                        <li>King & Pawn vs King (Opposition)</li>
                        <li>Rook + Pawn endgames</li>
                        <li>Checkmating with King + Queen / Rook</li>
                    </ul>
                    <p class="doc-text"><em>📌 Pro Tip: Endgames decide more games than openings.</em></p>
                </div>

                <!-- 7. Pro Thinking -->
                <div class="doc-section">
                    <div class="doc-header">7️⃣ Thinking Like a Pro</div>
                    <ul class="doc-list">
                        <li><strong>Calculation:</strong> Candidate moves → Forcing lines → Evaluate.</li>
                        <li><strong>Positional:</strong> Weak squares, Pawn structure, Space advantage.</li>
                    </ul>
                </div>

                <!-- 8. Study Plan -->
                <div class="doc-section">
                    <div class="doc-header">8️⃣ Study Plan</div>
                    <p class="doc-text"><strong>📅 Daily (30–60 min):</strong> 15m Puzzles + 15m Play (Rapid) + 10m Review.</p>
                    <p class="doc-text"><strong>📅 Weekly:</strong> Analyze 3 full games, 1 Endgame, 1 Opening.</p>
                </div>

                <!-- 9. Golden Rules -->
                <div class="doc-section">
                    <div class="doc-header">9️⃣ Golden Rules</div>
                    <ul class="doc-list">
                        <li>✔ Don’t memorize—understand</li>
                        <li>✔ Tactics > Openings</li>
                        <li>✔ Slow thinking beats fast guessing</li>
                        <li>✔ Consistency beats talent</li>
                    </ul>
                </div>

            </div>
        `;

        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);

        const btn = document.getElementById('btn-new-game-modal');
        btn.innerText = "Close Guide";
        btn.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
                document.querySelector('.result-display').style.display = 'flex'; // Restore
                btn.innerText = "New Game";

                // Reset tagline if it was changed
                const tagline = document.querySelector('.tagline');
                if (tagline) {
                    tagline.innerText = "Play vs Computer or Local Friend";
                    tagline.classList.remove('pulse-text');
                }
            }, 300);
        };
    }

    resetGame() {
        this.game.reset();
        this.ui.render(this.game.fen());
        this.updateStatus();
        this.isAiThinking = false;
    }

    undoMove() {
        if (this.currentMode === 'ai' && this.isAiThinking) return;

        this.game.undo();
        // If vs AI, undo twice to go back to user turn
        if (this.currentMode === 'ai') {
            this.game.undo();
        }
        this.ui.render(this.game.fen());
        this.updateStatus();
    }

    onUserMove(from, to) {
        if (this.currentMode === 'puzzle') {
            // Puzzle Validation
            const correct = this.currentPuzzle.move;
            if (from === correct.from && to === correct.to) {
                this.game.move({ from, to, promotion: 'q' });
                this.ui.render(this.game.fen());
                SoundManager.playMove();

                // Success State
                this.updateStatus("✅ CORRECT! Moving to next puzzle...");
                SoundManager.playNotify();

                // Auto-Advance to next puzzle
                setTimeout(() => {
                    this.startPuzzle();
                }, 1500);

                return true;
            } else {
                // Wrong move
                this.updateStatus("❌ Incorrect move. Try again.");
                return false;
            }
        }

        if (this.game.game_over()) return false;
        if (this.currentMode === 'ai' && this.game.turn() === 'b') return false; // Wait for AI

        try {
            const move = this.game.move({ from, to, promotion: 'q' }); // Auto promote to queen for simplicity
            if (move) {
                this.ui.render(this.game.fen()); // Re-render to show updated state

                // Play Sound
                if (move.captured) {
                    SoundManager.playCapture();
                } else {
                    SoundManager.playMove();
                }

                this.updateStatus();

                if (this.currentMode === 'ai' && !this.game.game_over()) {
                    this.triggerAiMove();
                }
                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    }

    async triggerAiMove() {
        this.isAiThinking = true;
        this.updateStatus("AI is thinking...");

        try {
            // Delay based on mind level to simulate "thinking"
            const delays = { 1: 500, 2: 1000, 3: 2000, 4: 2500 };
            const delay = delays[this.aiLevel] || 1000;
            await new Promise(r => setTimeout(r, delay));

            const bestMove = await this.ai.getBestMove(this.game, this.aiLevel);
            if (bestMove) {
                const move = this.game.move(bestMove); // Need move object to check capture
                this.ui.render(this.game.fen());

                if (move) {
                    if (move.captured) SoundManager.playCapture();
                    else SoundManager.playMove();
                }
                this.updateStatus();
            }
        } catch (error) {
            console.error("AI Error:", error);
            this.updateStatus("Bot error. Your turn.");
        } finally {
            this.isAiThinking = false;
        }
    }

    updateStatus(customMsg = null) {
        const statusEl = document.getElementById('status-text');

        // Update Captured Pieces
        this.updateCapturedPieces();

        if (customMsg) {
            statusEl.innerText = customMsg;
            return;
        }

        if (this.game.game_over()) {
            let title = "Game Over";
            let reason = "Draw";
            let winner = null;

            if (this.game.in_checkmate()) {
                winner = this.game.turn() === 'w' ? 'b' : 'w';
                title = winner === 'w' ? "White Won!" : "Black Won!";
                reason = "by checkmate";
            } else if (this.game.in_draw()) {
                title = "Draw";
                reason = "by draw";
            } else if (this.game.in_stalemate()) {
                title = "Draw";
                reason = "by stalemate";
            } else if (this.game.in_threefold_repetition()) {
                title = "Draw";
                reason = "by repetition";
            } else if (this.game.insufficient_material()) {
                title = "Draw";
                reason = "by insufficient material";
            }

            statusEl.innerText = `${title} ${reason}`;
            this.showGameOverModal(title, reason, winner);
            SoundManager.playNotify();

        } else if (this.game.in_check()) {
            statusEl.innerText = `${this.game.turn() === 'w' ? 'White' : 'Black'} is in Check!`;
        } else {
            statusEl.innerText = `${this.game.turn() === 'w' ? 'White' : 'Black'} to move`;
        }
    }

    updateCapturedPieces() {
        const history = this.game.history({ verbose: true });

        const capturedPieces = { w: [], b: [] }; // w: pieces captured BY white (black pieces)
        history.forEach(move => {
            if (move.captured) {
                if (move.color === 'w') capturedPieces.w.push(move.captured); // White captured something
                else capturedPieces.b.push(move.captured); // Black captured something
            }
        });

        // Sort: Q, R, B, N, P
        const weights = { q: 9, r: 5, b: 3, n: 3, p: 1 };
        const sortFn = (a, b) => weights[b] - weights[a];
        capturedPieces.w.sort(sortFn);
        capturedPieces.b.sort(sortFn);

        // Material Score
        const wMat = capturedPieces.w.reduce((acc, p) => acc + weights[p], 0);
        const bMat = capturedPieces.b.reduce((acc, p) => acc + weights[p], 0);
        const diff = wMat - bMat;

        this.renderCapturedHTML('captured-white', capturedPieces.w, diff > 0 ? `+${diff}` : '');
        this.renderCapturedHTML('captured-black', capturedPieces.b, diff < 0 ? `+${Math.abs(diff)}` : '');
    }

    renderCapturedHTML(elementId, pieces, score) {
        const el = document.getElementById(elementId);
        if (!el) return;

        let html = pieces.map(p => {
            // captured-white means pieces captured BY white -> these are BLACK pieces.
            // captured-black means pieces captured BY black -> these are WHITE pieces.
            const color = elementId === 'captured-white' ? 'b' : 'w';
            const url = this.ui.getPieceUrl(color === 'w' ? p.toUpperCase() : p);
            return `<div class="captured-piece" style="background-image: url('${url}')"></div>`;
        }).join('');

        if (score) {
            html += `<span class="material-score">${score}</span>`;
        }

        // Wrap in row
        el.innerHTML = `<div class="captured-row">${html}</div>`;
    }

    showGameOverModal(title, reason, winner) {
        const modal = document.getElementById('game-over-modal');
        const titleEl = document.getElementById('modal-title');
        const reasonEl = document.getElementById('modal-reason');
        const whiteRes = document.getElementById('result-white');
        const blackRes = document.getElementById('result-black');
        const whiteScore = document.getElementById('score-white');
        const blackScore = document.getElementById('score-black');

        titleEl.innerText = title;
        reasonEl.innerText = reason;

        // Reset classes
        whiteRes.classList.remove('winner');
        blackRes.classList.remove('winner');

        if (winner === 'w') {
            whiteRes.classList.add('winner');
            whiteScore.innerText = "1";
            blackScore.innerText = "0";
        } else if (winner === 'b') {
            blackRes.classList.add('winner');
            whiteScore.innerText = "0";
            blackScore.innerText = "1";
        } else {
            // Draw
            whiteScore.innerText = "½";
            blackScore.innerText = "½";
        }

        modal.classList.remove('hidden');
        // Small delay to allow CSS transition if display:none removal needs tick?
        // Using class "hidden" to likely toggle display:none. 
        // We added .modal.show for opacity. 
        // Need to ensure display block first then opacity.
        // Assuming .hidden puts display: none.

        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        // Button Listener
        document.getElementById('btn-new-game-modal').onclick = () => {
            this.resetGame();
            modal.classList.remove('show');
            setTimeout(() => modal.classList.add('hidden'), 300);
        };
        document.getElementById('btn-analyze').onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.classList.add('hidden'), 300);
            // Just close to look at board
        };
    }
}

// Sound Manager using Web Audio API (Reliable & No Network Needed)
// ... (rest of SoundManager code is unchanged, we just need to ensure App init includes modal styles if needed)
// Actually we need to make sure we don't overwrite SoundManager definition if we are replacing lines before it?
// The range I selected (EndLine 182) seems to cover updateStatus through closing brace of class.
// My replacement ends at closing brace of class. 
// SoundManager is AFTER the class. So I should stop before SoundManager.

// Wait, looking at file content:
// updateStatus is lines 160-177.
// Class ends at 178.
// SoundManager follows.
// My EndLine 182 includes SoundManager start?? No, 178 is close class. 182 is empty lines.
// So I will replace updateStatus and add showGameOverModal inside the class.


// Sound Manager using Web Audio API (Reliable & No Network Needed)
const SoundManager = {
    ctx: null,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playMove() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Thump sound (Sine wave, low pitch, short fade)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    },

    playCapture() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Snap sound (Triangle for edge, higher pitch)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    },

    playNotify() {
        // Simple ding
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);

    }
};

// Initialize app but wait for interaction to init Sound Context usually
// Initialize app when DOM is ready
window.addEventListener('load', () => {
    console.log("Window Loaded. Initializing App...");
    window.app = new GameApp();
    window.app.init();
});

// Add global click listener to resume AudioContext if needed (browser policy)
document.addEventListener('click', () => {
    if (SoundManager.ctx && SoundManager.ctx.state === 'suspended') {
        SoundManager.ctx.resume();
    }
}, { once: true });
