class ChessUI {
    constructor(boardElement, callbacks) {
        this.boardEl = boardElement;
        this.callbacks = callbacks;
        this.isFlipped = false;
        this.draggedPiece = null;
        this.dragSource = null;
        this.legalMoves = [];
    }

    // Convert FEN to 2D array + render
    render(fen) {
        if (!fen) return; // Guard
        console.log("Rendering Board with FEN:", fen);

        this.boardEl.innerHTML = '';
        const rows = fen.split(' ')[0].split('/');

        // Adjust for Board Flip
        const displayRows = this.isFlipped ? [...rows].reverse() : rows;

        displayRows.forEach((rowStr, rowIndex) => {
            const rowNumber = this.isFlipped ? rowIndex : 7 - rowIndex; // actual rank 0-7

            let colIndex = 0;
            // Expand FEN numbers (e.g. "3" -> three empty squares)
            for (let i = 0; i < rowStr.length; i++) {
                const char = rowStr[i];
                if (!isNaN(char)) {
                    const emptyCount = parseInt(char);
                    for (let j = 0; j < emptyCount; j++) {
                        this.createSquare(rowNumber, this.isFlipped ? 7 - colIndex : colIndex, null);
                        colIndex++;
                    }
                } else {
                    this.createSquare(rowNumber, this.isFlipped ? 7 - colIndex : colIndex, char);
                    colIndex++;
                }
            }
        });
    }

    createSquare(row, col, pieceChar) {
        const square = document.createElement('div');
        const isDark = (row + col) % 2 === 0; // Standard chess board parity check? logic check:
        // (0,0) is A1 (dark in some schemas, but usually A1 is black... wait, A1 is dark? No, A1 is black in real board? No, A1 is Black, H1 is White.
        // Let's use simple logic: if (row+col)%2 !== 0 => white, else black.
        // Actually, rank 0 (1st rank) + file 0 (a) = 0 => Black. Correct.

        // Wait, standard: a1 (0,0) is black. b1 (0,1) is white.
        // So (row+col)%2 === 0 => Black, !== 0 => White.
        // CSS classes: .white, .black
        square.className = `square ${(row + col) % 2 !== 0 ? 'white' : 'black'}`;

        // Data attributes for move logic (0-7, 0-7)
        // Need to map to algebraic 'a1'..
        const file = String.fromCharCode(97 + col); // 0->a
        const rank = row + 1; // 0->1
        const squareId = `${file}${rank}`;
        square.dataset.square = squareId;

        // Add Piece if exists
        if (pieceChar) {
            const piece = document.createElement('div');
            piece.className = 'piece';
            piece.style.backgroundImage = `url('${this.getPieceUrl(pieceChar)}')`;
            piece.draggable = true;

            piece.addEventListener('dragstart', (e) => this.handleDragStart(e, squareId));
            piece.addEventListener('dragend', (e) => this.handleDragEnd(e));
            // Forward click on piece to square handler
            piece.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent double firing if square also has listener? 
                // Actually, if we propagate, square listener fires. 
                // But let's be explicit and call handleSquareClick directly to avoid bubble issues.
                this.handleSquareClick(squareId);
            });

            square.appendChild(piece);
        }

        // Drop Events on Square
        square.addEventListener('dragover', (e) => e.preventDefault());
        square.addEventListener('drop', (e) => this.handleDrop(e, squareId));
        square.addEventListener('click', () => this.handleSquareClick(squareId));

        // Coordinates
        // Ranks (1-8) on the first column (visually left)
        // If !isFlipped, colIndex 0 has ranks. rank '8' at top (row 0), '1' at bottom (row 7)
        // If isFlipped, colIndex 0 is file H? No.
        // Let's rely on visual placement. 
        // Left-most column: col === 0 (if not flipped, file 'a')
        // Actually grid is 0..7. 
        // If isFlipped: col 0 is file h. col 7 is file a.
        // Bottom row: row 7 (if not flipped, rank 1).

        const isLeftCol = col === 0;
        const isBottomRow = row === 7;

        if (isLeftCol) {
            const rankLabel = document.createElement('span');
            rankLabel.className = 'coordinate coord-rank';
            rankLabel.innerText = this.isFlipped ? row + 1 : 8 - row; // visual row 0 is rank 8
            square.appendChild(rankLabel);
        }

        if (isBottomRow) {
            const fileLabel = document.createElement('span');
            fileLabel.className = 'coordinate coord-file';
            // visual col 0 -> 'a' (normal), 'h' (flipped)
            const fileChar = this.isFlipped ? String.fromCharCode(104 - col) : String.fromCharCode(97 + col);
            fileLabel.innerText = fileChar;
            square.appendChild(fileLabel);
        }

        this.boardEl.appendChild(square);
    }

    getPieceUrl(char) {
        const color = char === char.toUpperCase() ? 'w' : 'b';
        const type = char.toLowerCase();
        // Using Wikimedia commons standard names
        // wP -> plt45.svg, wN -> nlt45.svg, etc ? No, wikipedia uses:
        // p = pawn, n = knight, b = bishop, r = rook, q = queen, k = king
        // White: Chess_plt45.svg, Chess_nlt45.svg
        // Black: Chess_pdt45.svg, Chess_ngt45.svg ??
        // Let's use a cleaner set URL pattern if possible.
        // https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg

        const names = {
            p: 'p', n: 'n', b: 'b', r: 'r', q: 'q', k: 'k'
        };
        const colorCode = color === 'w' ? 'l' : 'd'; // light / dark
        const pieceCode = names[type];

        // Map to exact URLs to be safe
        const baseUrl = 'https://upload.wikimedia.org/wikipedia/commons';
        const map = {
            'w-p': `${baseUrl}/4/45/Chess_plt45.svg`,
            'w-n': `${baseUrl}/7/70/Chess_nlt45.svg`,
            'w-b': `${baseUrl}/b/b1/Chess_blt45.svg`,
            'w-r': `${baseUrl}/7/72/Chess_rlt45.svg`,
            'w-q': `${baseUrl}/1/15/Chess_qlt45.svg`,
            'w-k': `${baseUrl}/4/42/Chess_klt45.svg`,
            'b-p': `${baseUrl}/c/c7/Chess_pdt45.svg`,
            'b-n': `${baseUrl}/e/ef/Chess_ndt45.svg`,
            'b-b': `${baseUrl}/9/98/Chess_bdt45.svg`,
            'b-r': `${baseUrl}/f/ff/Chess_rdt45.svg`,
            'b-q': `${baseUrl}/4/47/Chess_qdt45.svg`,
            'b-k': `${baseUrl}/f/f0/Chess_kdt45.svg`,
        };
        return map[`${color}-${type}`];
    }

    handleDragStart(e, square) {
        this.dragSource = square;
        e.dataTransfer.setData('text/plain', square);
        e.dataTransfer.effectAllowed = 'move';

        // Highlight legal moves
        const moves = this.callbacks.getLegalMoves(square);
        this.showLegalMoves(moves);
    }

    handleDragEnd(e) {
        this.clearHighlights();
        this.dragSource = null;
    }

    handleDrop(e, targetSquare) {
        e.preventDefault();
        const from = this.dragSource;
        if (from && from !== targetSquare) {
            this.callbacks.onMove(from, targetSquare);
        }
    }

    // For click-based moving (accessibility/mobile backup)
    handleSquareClick(square) {
        // If clicking the same square, deselect
        if (this.dragSource === square) {
            this.clearHighlights();
            this.dragSource = null;
            return;
        }

        // If a piece is already selected, try to move to the new square
        if (this.dragSource) {
            const success = this.callbacks.onMove(this.dragSource, square);
            if (success) {
                // Move successful
                this.clearHighlights();
                this.dragSource = null;
                return;
            } else {
                // Move failed (invalid move or clicking another piece)
                // If clicking another own piece, switch selection
                // We check if the new square has a piece (visually) to switch selection
                const squareEl = this.boardEl.querySelector(`[data-square="${square}"]`);
                if (squareEl && squareEl.querySelector('.piece')) {
                    this.clearHighlights();
                    this.dragSource = square;
                    squareEl.classList.add('selected');
                    const moves = this.callbacks.getLegalMoves(square);
                    this.showLegalMoves(moves);
                    return;
                }

                // Otherwise just deselect
                this.clearHighlights();
                this.dragSource = null;
            }
        } else {
            // First click: Select Logic
            const squareEl = this.boardEl.querySelector(`[data-square="${square}"]`);
            // Only select if there is a piece
            if (squareEl && squareEl.querySelector('.piece')) {
                this.dragSource = square;
                squareEl.classList.add('selected');
                const moves = this.callbacks.getLegalMoves(square);
                this.showLegalMoves(moves);
            }
        }
    }

    showLegalMoves(moves) {
        moves.forEach(move => {
            // move.to is the target square e.g. 'e4'
            const el = this.boardEl.querySelector(`[data-square="${move.to}"]`);
            if (el) {
                el.classList.add('highlight');
                if (move.captured) { // chess.js 'captured' flag
                    el.classList.add('capture'); // Distinct style
                }
            }
        });
    }

    clearHighlights() {
        const highlights = this.boardEl.querySelectorAll('.highlight, .selected');
        highlights.forEach(el => {
            el.classList.remove('highlight');
            el.classList.remove('selected');
            el.classList.remove('capture');
        });
    }

    flipBoard() {
        this.isFlipped = !this.isFlipped;
        // Need to re-render board externally or store Fen locally?
        // Since render takes Fen, we need main to call render again.
        // Actually simpler: Main calls render. But we can trigger a callback request?
        // Or just rely on the next render call.
        // Optimally, Main should handle it. But to make the button inside UI work immediately:
        // We'll dispatch a custom event or just let the button in Main call this, and then Main re-renders current state.
        // Main.js calls ui.flipBoard() -> toggles flag -> Main calls ui.render(...)
        // Let's assume Main will call render immediately after calling flipBoard?
        // No, current main implementation just calls ui.flipBoard().
        // So I should trigger a re-render using the LAST know FEN? 
        // Or better, ui.flipBoard() just sets flag, and returns true?
        // Let's make main.js logic: btn.click -> ui.flipBoard(); ui.render(game.fen());
    }
}
