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

        // Real-time timer updates
        this.socket.on('timerUpdate', (data) => {
            if (this.gameState && this.currentScreen === 'gameScreen') {
                this.gameState.timeLeft = data.timeLeft;
                this.updateTimer();
            }
        });

        // Round transition handling
        this.socket.on('roundTransition', (data) => {
            this.showRoundTransition(data);
        });

        this.socket.on('hideRoundTransition', () => {
            this.hideRoundTransition();
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
        this.updateTimer();
        document.getElementById('currentPlayerName').textContent = this.gameState.currentPlayer.name;

        // Update word display based on player role
        const currentWord = document.getElementById('currentWord');
        const playerRole = document.getElementById('playerRole');
        
        if (this.gameState.isGuesser) {
            currentWord.textContent = 'LISTEN AND GUESS!';
            currentWord.style.fontSize = '2rem';
            currentWord.style.color = '#667eea';
            playerRole.textContent = `${this.gameState.currentPlayer.name} is describing a word for you to guess!`;
            playerRole.style.color = '#667eea';
            playerRole.style.fontWeight = '600';
        } else {
            currentWord.textContent = this.gameState.currentWord.toUpperCase();
            currentWord.style.fontSize = '3rem';
            currentWord.style.color = 'white';
            playerRole.textContent = `Describe this word to ${this.getOtherPlayerName()}!`;
            playerRole.style.color = '#ffd700';
            playerRole.style.fontWeight = '600';
        }
        
        document.getElementById('wordCategory').textContent = `Difficulty: ${this.gameState.difficulty}`;

        // Update team score
        this.updateScores();

        // Show/hide controls based on current player and ensure UI updates immediately
        this.updateGameControls();

        // Handle round transitions
        this.handleRoundTransition();
    }

    updateGameControls() {
        const isCurrentPlayer = this.gameState.currentPlayer.id === this.socket.id;
        const controls = document.querySelector('.game-controls');
        const existingMsg = controls.parentNode.querySelector('.waiting-message');
        
        // Remove existing waiting message
        if (existingMsg) {
            existingMsg.remove();
        }

        if (isCurrentPlayer) {
            controls.style.display = 'flex';
        } else {
            controls.style.display = 'none';
            
            // Add waiting message for non-current player
            const waitingMsg = document.createElement('p');
            waitingMsg.textContent = `${this.gameState.currentPlayer.name} is controlling the game...`;
            waitingMsg.style.color = '#718096';
            waitingMsg.style.fontSize = '1.1rem';
            waitingMsg.style.margin = '20px 0';
            waitingMsg.className = 'waiting-message';
            
            controls.parentNode.insertBefore(waitingMsg, controls.nextSibling);
        }
    }

    updateTimer() {
        document.getElementById('timeLeft').textContent = this.gameState.timeLeft;
        
        // Add visual urgency when time is running low
        const timerElement = document.querySelector('.timer');
        if (this.gameState.timeLeft <= 10) {
            timerElement.style.color = '#e53e3e';
            timerElement.style.animation = 'pulse 1s infinite';
        } else if (this.gameState.timeLeft <= 30) {
            timerElement.style.color = '#ed8936';
            timerElement.style.animation = 'none';
        } else {
            timerElement.style.color = '#4a5568';
            timerElement.style.animation = 'none';
        }
    }

    showRoundTransition(data) {
        const transitionElement = document.getElementById('roundTransition');
        const overlayElement = document.getElementById('transitionOverlay');
        
        if (!transitionElement) return;
        
        transitionElement.querySelector('h2').textContent = 'Round Complete!';
        transitionElement.querySelector('p').innerHTML = 
            `<strong>${data.nextPlayer}</strong> will describe next round.<br>Starting in <span id="nextRoundTimer">${data.countdown}</span>...`;
        
        transitionElement.classList.remove('hidden');
        if (overlayElement) {
            overlayElement.classList.remove('hidden');
        }
    }

    hideRoundTransition() {
        const transitionElement = document.getElementById('roundTransition');
        const overlayElement = document.getElementById('transitionOverlay');
        
        if (transitionElement) {
            transitionElement.classList.add('hidden');
        }
        if (overlayElement) {
            overlayElement.classList.add('hidden');
        }
    }

    getOtherPlayerName() {
        if (!this.gameState || !this.gameState.players) return 'your teammate';
        const otherPlayer = this.gameState.players.find(p => p.id !== this.socket.id);
        return otherPlayer ? otherPlayer.name : 'your teammate';
    }

    updateScores() {
        if (!this.gameState) return;

        const scoresDisplay = document.getElementById('scoresDisplay');
        scoresDisplay.innerHTML = '';

        // Show team score
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'score-item team-score';
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'score-name';
        labelDiv.textContent = 'Words Guessed';
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'score-value';
        valueDiv.textContent = this.gameState.totalScore || 0;
        
        scoreDiv.appendChild(labelDiv);
        scoreDiv.appendChild(valueDiv);
        scoresDisplay.appendChild(scoreDiv);

        // Show round progress
        const progressDiv = document.createElement('div');
        progressDiv.className = 'score-item';
        
        const progressLabel = document.createElement('div');
        progressLabel.className = 'score-name';
        progressLabel.textContent = 'Round Progress';
        
        const progressValue = document.createElement('div');
        progressValue.className = 'score-value';
        progressValue.style.fontSize = '1.2rem';
        progressValue.textContent = `${this.gameState.currentRound}/${this.gameState.maxRounds}`;
        
        progressDiv.appendChild(progressLabel);
        progressDiv.appendChild(progressValue);
        scoresDisplay.appendChild(progressDiv);
    }

    handleRoundTransition() {
        // This would be enhanced to show round transition animations
        // For now, we'll keep it simple
    }

    updateGameOverScreen() {
        if (!this.gameState) return;

        // Update final team performance
        const finalScoresDisplay = document.getElementById('finalScoresDisplay');
        finalScoresDisplay.innerHTML = '';

        const totalScore = this.gameState.totalScore || 0;
        const maxPossibleWords = this.gameState.maxRounds * 30; // Rough estimate

        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'score-item team-final-score';
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'score-name';
        labelDiv.textContent = 'Total Words Guessed';
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'score-value';
        valueDiv.textContent = totalScore;
        
        scoreDiv.appendChild(labelDiv);
        scoreDiv.appendChild(valueDiv);
        finalScoresDisplay.appendChild(scoreDiv);

        // Display performance feedback
        const performanceDisplay = document.getElementById('performanceDisplay');
        let performanceMessage = '';
        let performanceClass = '';

        if (totalScore >= 50) {
            performanceMessage = "🏆 Amazing teamwork! You're word masters!";
            performanceClass = 'excellent';
        } else if (totalScore >= 30) {
            performanceMessage = "🎉 Great job! Solid communication skills!";
            performanceClass = 'good';
        } else if (totalScore >= 15) {
            performanceMessage = "👍 Good effort! Keep practicing together!";
            performanceClass = 'okay';
        } else {
            performanceMessage = "💪 Practice makes perfect! Try again!";
            performanceClass = 'needs-improvement';
        }

        performanceDisplay.textContent = performanceMessage;
        performanceDisplay.className = `performance-message ${performanceClass}`;
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
