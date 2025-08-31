class CatchPhraseGame {
    constructor() {
        this.socket = io();
        this.currentScreen = 'homeScreen';
        this.gameState = null;
        this.playerId = null;
        this.playerName = '';
        this.roomId = '';
        
        this.initializeEventListeners();
        this.setupSocketListeners();
    }

    initializeEventListeners() {
        // Home screen events
        document.getElementById('createRoomBtn').addEventListener('click', () => this.createRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.showJoinForm());
        document.getElementById('joinRoomSubmitBtn').addEventListener('click', () => this.joinRoom());
        document.getElementById('cancelJoinBtn').addEventListener('click', () => this.hideJoinForm());

        // Waiting room events
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('leaveRoomBtn').addEventListener('click', () => this.leaveRoom());

        // Difficulty buttons
        document.querySelectorAll('.btn-difficulty').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeDifficulty(e.target.dataset.difficulty));
        });

        // Game screen events
        document.getElementById('correctBtn').addEventListener('click', () => this.correctGuess());
        document.getElementById('skipBtn').addEventListener('click', () => this.skipWord());

        // Game over screen events
        document.getElementById('playAgainBtn').addEventListener('click', () => this.playAgain());
        document.getElementById('homeBtn').addEventListener('click', () => this.goHome());

        // Enter key support
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createRoom();
        });
        
        document.getElementById('roomCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
    }

    setupSocketListeners() {
        this.socket.on('roomCreated', (data) => {
            this.roomId = data.roomId;
            this.gameState = data.gameState;
            this.showScreen('waitingScreen');
            this.updateWaitingRoom();
            this.showMessage('Room created! Share the code with your friend.', 'success');
        });

        this.socket.on('roomJoined', (data) => {
            this.gameState = data.gameState;
            this.showScreen('waitingScreen');
            this.updateWaitingRoom();
            this.showMessage('Joined room successfully!', 'success');
        });

        this.socket.on('gameUpdate', (gameState) => {
            this.gameState = gameState;
            this.updateGameDisplay();
        });

        this.socket.on('error', (data) => {
            this.showMessage(data.message, 'error');
        });

        this.socket.on('disconnect', () => {
            this.showMessage('Disconnected from server', 'error');
            this.goHome();
        });
    }

    createRoom() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            this.showMessage('Please enter your name', 'error');
            return;
        }

        this.playerName = playerName;
        this.socket.emit('createRoom', { playerName });
    }

    showJoinForm() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            this.showMessage('Please enter your name first', 'error');
            return;
        }

        this.playerName = playerName;
        document.getElementById('joinRoomForm').classList.remove('hidden');
        document.getElementById('joinRoomBtn').style.display = 'none';
        document.getElementById('createRoomBtn').style.display = 'none';
    }

    hideJoinForm() {
        document.getElementById('joinRoomForm').classList.add('hidden');
        document.getElementById('joinRoomBtn').style.display = 'inline-block';
        document.getElementById('createRoomBtn').style.display = 'inline-block';
    }

    joinRoom() {
        const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
        if (!roomCode) {
            this.showMessage('Please enter a room code', 'error');
            return;
        }

        this.socket.emit('joinRoom', { roomId: roomCode, playerName: this.playerName });
    }

    startGame() {
        this.socket.emit('startGame');
    }

    leaveRoom() {
        this.goHome();
    }

    changeDifficulty(difficulty) {
        document.querySelectorAll('.btn-difficulty').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add('active');
        
        this.socket.emit('changeDifficulty', { difficulty });
    }

    correctGuess() {
        this.socket.emit('correctGuess');
    }

    skipWord() {
        this.socket.emit('skipWord');
    }

    playAgain() {
        this.socket.emit('startGame');
    }

    goHome() {
        this.gameState = null;
        this.roomId = '';
        this.playerName = '';
        document.getElementById('playerName').value = '';
        document.getElementById('roomCode').value = '';
        this.hideJoinForm();
        this.showScreen('homeScreen');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    updateGameDisplay() {
        if (!this.gameState) return;

        switch (this.gameState.gameState) {
            case 'waiting':
                if (this.currentScreen !== 'waitingScreen') {
                    this.showScreen('waitingScreen');
                }
                this.updateWaitingRoom();
                break;
            
            case 'playing':
                if (this.currentScreen !== 'gameScreen') {
                    this.showScreen('gameScreen');
                }
                this.updateGameScreen();
                break;
            
            case 'finished':
                this.showScreen('gameOverScreen');
                this.updateGameOverScreen();
                break;
        }
    }

    updateWaitingRoom() {
        if (!this.gameState) return;

        // Update room ID display
        document.getElementById('roomIdDisplay').textContent = this.gameState.roomId;

        // Update players list
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';
        
        this.gameState.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            playerDiv.textContent = player.name;
            if (player.id === this.socket.id) {
                playerDiv.textContent += ' (You)';
            }
            playersList.appendChild(playerDiv);
        });

        // Update start button
        const startBtn = document.getElementById('startGameBtn');
        if (this.gameState.players.length === 2) {
            startBtn.textContent = 'Start Game';
            startBtn.disabled = false;
        } else {
            startBtn.textContent = 'Waiting for 2nd player...';
            startBtn.disabled = true;
        }

        // Update difficulty
        document.querySelectorAll('.btn-difficulty').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-difficulty="${this.gameState.difficulty}"]`).classList.add('active');
    }

    updateGameScreen() {
        if (!this.gameState) return;

        // Update game info
        document.getElementById('currentRound').textContent = this.gameState.currentRound;
        document.getElementById('maxRounds').textContent = this.gameState.maxRounds;
        document.getElementById('timeLeft').textContent = this.gameState.timeLeft;
        document.getElementById('currentPlayerName').textContent = this.gameState.currentPlayer.name;

        // Update word display
        document.getElementById('currentWord').textContent = this.gameState.currentWord.toUpperCase();
        document.getElementById('wordCategory').textContent = `Difficulty: ${this.gameState.difficulty}`;

        // Update scores
        this.updateScores();

        // Show/hide controls based on current player
        const isCurrentPlayer = this.gameState.currentPlayer.id === this.socket.id;
        const controls = document.querySelector('.game-controls');
        controls.style.display = isCurrentPlayer ? 'flex' : 'none';

        if (!isCurrentPlayer) {
            const waitingMsg = document.createElement('p');
            waitingMsg.textContent = `Waiting for ${this.gameState.currentPlayer.name} to describe the word...`;
            waitingMsg.style.color = '#718096';
            waitingMsg.style.fontSize = '1.1rem';
            waitingMsg.style.margin = '20px 0';
            
            const existingMsg = controls.parentNode.querySelector('.waiting-message');
            if (existingMsg) {
                existingMsg.remove();
            }
            
            waitingMsg.className = 'waiting-message';
            controls.parentNode.insertBefore(waitingMsg, controls.nextSibling);
        } else {
            const existingMsg = controls.parentNode.querySelector('.waiting-message');
            if (existingMsg) {
                existingMsg.remove();
            }
        }

        // Handle round transitions
        this.handleRoundTransition();
    }

    updateScores() {
        if (!this.gameState) return;

        const scoresDisplay = document.getElementById('scoresDisplay');
        scoresDisplay.innerHTML = '';

        this.gameState.players.forEach(player => {
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'score-item';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'score-name';
            nameDiv.textContent = player.name;
            
            const valueDiv = document.createElement('div');
            valueDiv.className = 'score-value';
            valueDiv.textContent = this.gameState.scores[player.id] || 0;
            
            scoreDiv.appendChild(nameDiv);
            scoreDiv.appendChild(valueDiv);
            scoresDisplay.appendChild(scoreDiv);
        });
    }

    handleRoundTransition() {
        // This would be enhanced to show round transition animations
        // For now, we'll keep it simple
    }

    updateGameOverScreen() {
        if (!this.gameState) return;

        // Update final scores
        const finalScoresDisplay = document.getElementById('finalScoresDisplay');
        finalScoresDisplay.innerHTML = '';

        let winner = null;
        let maxScore = -1;

        this.gameState.players.forEach(player => {
            const score = this.gameState.scores[player.id] || 0;
            if (score > maxScore) {
                maxScore = score;
                winner = player;
            }

            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'score-item';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'score-name';
            nameDiv.textContent = player.name;
            
            const valueDiv = document.createElement('div');
            valueDiv.className = 'score-value';
            valueDiv.textContent = score;
            
            scoreDiv.appendChild(nameDiv);
            scoreDiv.appendChild(valueDiv);
            finalScoresDisplay.appendChild(scoreDiv);
        });

        // Display winner
        const winnerDisplay = document.getElementById('winnerDisplay');
        if (winner) {
            const ties = this.gameState.players.filter(p => 
                (this.gameState.scores[p.id] || 0) === maxScore
            );
            
            if (ties.length > 1) {
                winnerDisplay.textContent = "It's a tie! Great game!";
            } else {
                winnerDisplay.textContent = `🎉 ${winner.name} wins with ${maxScore} words!`;
            }
        }
    }

    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        messageContainer.appendChild(messageDiv);
        
        // Remove message after 4 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 4000);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CatchPhraseGame();
});
