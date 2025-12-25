class ChessAI {
    async getBestMove(game, level) {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) return null;

        // Level 1: Pure Random
        if (level === 1) return moves[Math.floor(Math.random() * moves.length)].san;

        // Level 2: Aggressive (Prioritize Captures)
        if (level === 2) {
            const captures = moves.filter(m => m.captured);
            return captures.length > 0 ? captures[Math.floor(Math.random() * captures.length)].san : moves[Math.floor(Math.random() * moves.length)].san;
        }

        // Level 3: Defensive/Tactical mix
        // ... (Simplified for speed)

        // Levels 4-9: Depth 2
        if (level < 10) {
            return this.minimaxRoot(game, 2, true);
        }

        // Levels 10-16: Depth 3
        if (level < 17) {
            return this.minimaxRoot(game, 3, true);
        }

        // Level 17: "God Mode" - Depth 4
        return this.minimaxRoot(game, 4, true);
    }

    minimaxRoot(game, depth, isMaximizingPlayer) {
        // Sort moves: Captures ('x') first for better pruning
        const newGameMoves = game.moves().sort((a, b) => (b.includes('x') ? 1 : 0) - (a.includes('x') ? 1 : 0));

        let bestMove = -9999;
        let bestMoveFound;

        for (let i = 0; i < newGameMoves.length; i++) {
            const newGameMove = newGameMoves[i];
            game.move(newGameMove);
            const value = this.minimax(game, depth - 1, -10000, 10000, !isMaximizingPlayer);
            game.undo();
            if (value >= bestMove) {
                bestMove = value;
                bestMoveFound = newGameMove;
            }
        }
        return bestMoveFound;
    }

    minimax(game, depth, alpha, beta, isMaximizingPlayer) {
        if (depth === 0) {
            return -this.evaluateBoard(game.board());
        }

        // Move Ordering: Captures first
        const newGameMoves = game.moves().sort((a, b) => (b.includes('x') ? 1 : 0) - (a.includes('x') ? 1 : 0));

        if (isMaximizingPlayer) {
            let bestMove = -9999;
            for (let i = 0; i < newGameMoves.length; i++) {
                game.move(newGameMoves[i]);
                bestMove = Math.max(bestMove, this.minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
                game.undo();
                alpha = Math.max(alpha, bestMove);
                if (beta <= alpha) {
                    return bestMove;
                }
            }
            return bestMove;
        } else {
            let bestMove = 9999;
            for (let i = 0; i < newGameMoves.length; i++) {
                game.move(newGameMoves[i]);
                bestMove = Math.min(bestMove, this.minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
                game.undo();
                beta = Math.min(beta, bestMove);
                if (beta <= alpha) {
                    return bestMove;
                }
            }
            return bestMove;
        }
    }

    evaluateBoard(board) {
        let totalEvaluation = 0;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                totalEvaluation = totalEvaluation + this.getPieceValue(board[i][j], i, j);
            }
        }
        return totalEvaluation;
    }

    getPieceValue(piece, x, y) {
        if (piece === null) {
            return 0;
        }
        const getAbsoluteValue = (piece, isWhite, x, y) => {
            if (piece.type === 'p') {
                return 10 + (isWhite ? this.pawnEvalWhite[y][x] : this.pawnEvalBlack[y][x]);
            } else if (piece.type === 'r') {
                return 50 + (isWhite ? this.rookEvalWhite[y][x] : this.rookEvalBlack[y][x]);
            } else if (piece.type === 'n') {
                return 30 + (isWhite ? this.knightEval[y][x] : this.knightEval[y][x]); // Knight maps are symmetric usually
            } else if (piece.type === 'b') {
                return 30 + (isWhite ? this.bishopEvalWhite[y][x] : this.bishopEvalBlack[y][x]);
            } else if (piece.type === 'q') {
                return 90 + (isWhite ? this.evalQueen[y][x] : this.evalQueen[y][x]);
            } else if (piece.type === 'k') {
                return 900 + (isWhite ? this.kingEvalWhite[y][x] : this.kingEvalBlack[y][x]);
            }
            return 0;
        };

        const absoluteValue = getAbsoluteValue(piece, piece.color === 'w', x, y);
        return piece.color === 'w' ? absoluteValue : -absoluteValue;
    }

    // Simplified PSTs (Piece-Square Tables) for better positional play
    constructor() {
        this.pawnEvalWhite = [
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
            [1.0, 1.0, 2.0, 3.0, 3.0, 2.0, 1.0, 1.0],
            [0.5, 0.5, 1.0, 2.5, 2.5, 1.0, 0.5, 0.5],
            [0.0, 0.0, 0.0, 2.0, 2.0, 0.0, 0.0, 0.0],
            [0.5, -0.5, -1.0, 0.0, 0.0, -1.0, -0.5, 0.5],
            [0.5, 1.0, 1.0, -2.0, -2.0, 1.0, 1.0, 0.5],
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
        ];

        this.pawnEvalBlack = this.pawnEvalWhite.slice().reverse();

        this.knightEval = [
            [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
            [-4.0, -2.0, 0.0, 0.0, 0.0, 0.0, -2.0, -4.0],
            [-3.0, 0.0, 1.0, 1.5, 1.5, 1.0, 0.0, -3.0],
            [-3.0, 0.5, 1.5, 2.0, 2.0, 1.5, 0.5, -3.0],
            [-3.0, 0.0, 1.5, 2.0, 2.0, 1.5, 0.0, -3.0],
            [-3.0, 0.5, 1.0, 1.5, 1.5, 1.0, 0.5, -3.0],
            [-4.0, -2.0, 0.0, 0.5, 0.5, 0.0, -2.0, -4.0],
            [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
        ];

        this.bishopEvalWhite = [
            [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
            [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
            [-1.0, 0.0, 0.5, 1.0, 1.0, 0.5, 0.0, -1.0],
            [-1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, -1.0],
            [-1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0],
            [-1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0],
            [-1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, -1.0],
            [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
        ];

        this.bishopEvalBlack = this.bishopEvalWhite.slice().reverse();

        this.rookEvalWhite = [
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
            [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
            [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
            [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
            [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
            [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
            [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0]
        ];

        this.rookEvalBlack = this.rookEvalWhite.slice().reverse();

        this.evalQueen = [
            [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
            [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
            [-1.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
            [-0.5, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
            [0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
            [-1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
            [-1.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, -1.0],
            [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
        ];

        this.kingEvalWhite = [
            [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
            [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
            [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
            [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
            [-2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
            [-1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
            [2.0, 2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 2.0],
            [2.0, 3.0, 1.0, 0.0, 0.0, 1.0, 3.0, 2.0]
        ];

        this.kingEvalBlack = this.kingEvalWhite.slice().reverse();
    }
}
