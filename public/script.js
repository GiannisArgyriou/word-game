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
        document.getElementById('submitGuessBtn').addEventListener('click', () => this.submitGuess());
        document.getElementById('skipBtn').addEventListener('click', () => this.skipWord());
        
        // Enter key to submit guess
        document.getElementById('guessInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitGuess();
        });

        // Game over screen events
        document.getElementById('continueToTestBtn').addEventListener('click', () => this.showTest());

        // Test screen events
        document.getElementById('submitTestBtn').addEventListener('click', () => this.submitTest());
        
        // Test complete screen events
        document.getElementById('playAgainAfterTestBtn').addEventListener('click', () => this.playAgain());
        document.getElementById('homeAfterTestBtn').addEventListener('click', () => this.goHome());

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
        
        this.socket.on('guessResult', (result) => {
            this.handleGuessResult(result);
        });

        this.socket.on('error', (data) => {
            this.showMessage(data.message, 'error');
        });

        this.socket.on('testSubmitted', (data) => {
            if (data.success) {
                this.showScreen('testCompleteScreen');
                this.showMessage('Your answers have been recorded!', 'success');
            }
        });

        this.socket.on('disconnect', () => {
            this.showMessage('Disconnected from server', 'error');
            this.goHome();
        });
    }

    createRoom() {
        const playerName = document.getElementById('playerName').value.trim();
        const language = document.getElementById('languageSelect').value;
        if (!playerName) {
            this.showMessage('Please enter your name', 'error');
            return;
        }

        this.playerName = playerName;
        this.socket.emit('createRoom', { playerName, language });
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

    // Get translation for current word using merged word sets
    getTranslation(word, language) {
        // Translation mappings (must match server)
        const TRANSLATIONS = {
            // English to Spanish
            'River': 'Río', 
            'Fridge': 'Nevera / Refrigerador / Frigorífico', 
            'Lecture': 'Conferencia / Charla / Clase', 
            'Mower': 'Cortacésped / Cortadora de césped', 
            'Propel': 'Propulsionar / Impulsar',
            'Journal': 'Diario / Revista / Periódico', 
            'Waiter': 'Camarero / Mesero', 
            'Bakery': 'Panadería / Pastelería', 
            'Gravy': 'Salsa / Jugo de carne', 
            'Cupholder': 'Posavasos / Portavasos',
            'Lawn': 'Césped / Prado / Jardín', 
            'Sip': 'Sorbo / Trago pequeño', 
            'Mutual': 'Mutuo / Recíproco', 
            'Stale': 'Rancio / Viejo / Duro', 
            'Nozzle': 'Boquilla / Pitorro',
            'Bat': 'Murciélago / Bate', 
            'Cider': 'Sidra', 
            'Ashes': 'Cenizas', 
            'Stable': 'Establo / Caballeriza / Estable', 
            'Chew': 'Masticar / Mascar',
            'Tart': 'Tarta / Ácido / Agrio', 
            'Leftovers': 'Restos / Sobras', 
            'Contemporary': 'Contemporáneo / Moderno', 
            'Mumble': 'Murmurar / Mascullar', 
            'Brew': 'Preparar / Hacer / Fermentar',
            'Caterpillar': 'Oruga', 
            'Dressing': 'Aderezo / Aliño / Vendaje', 
            'Garlic': 'Ajo', 
            'Ranch': 'Rancho / Granja / Hacienda', 
            'Peel': 'Pelar / Cáscara',
            'Pear': 'Pera', 
            'Chop': 'Trocear / Cortar / Picar', 
            'Pastrami': 'Pastrami / Carne curada', 
            'Grip': 'Agarrar / Agarre / Empuñadura', 
            'Invoice': 'Factura',
            'Stew': 'Estofado / Guiso', 
            'Break': 'Romper / Descanso / Pausa', 
            'Lunch': 'Almuerzo / Comida', 
            'Teapot': 'Tetera', 
            'Doorbell': 'Timbre / Campanilla',
            'Mug': 'Taza / Jarro', 
            'Corn': 'Maíz / Elote / Choclo', 
            'Billionaire': 'Multimillonario / Billonario', 
            'Dishwasher': 'Lavavajillas / Lavaplatos', 
            'Honey': 'Miel',
            'Plant': 'Planta / Plantar', 
            'Pomegranate': 'Granada', 
            'Asparagus': 'Espárrago', 
            'Diet': 'Dieta / Régimen', 
            'Lake': 'Lago',
            // Spanish to English
            'Camarero': 'Waiter / Server', 
            'Rancio': 'Stale / Rancid', 
            'Malvavisco': 'Marshmallow', 
            'Pimienta': 'Pepper / Black pepper', 
            'Restos': 'Leftovers / Remains / Scraps',
            'Sorbo': 'Sip / Small drink', 
            'Melocotón': 'Peach', 
            'Trufa': 'Truffle', 
            'Ajo': 'Garlic', 
            'Colador': 'Strainer / Colander / Sieve',
            'Aderezo': 'Dressing / Seasoning / Condiment', 
            'Sidra': 'Cider / Apple cider', 
            'Nata': 'Cream / Heavy cream', 
            'Tarta': 'Tart / Cake / Pie', 
            'Veterinario': 'Veterinarian / Vet',
            'Pera': 'Pear', 
            'Pavo': 'Turkey', 
            'Sopa': 'Soup', 
            'Oruga': 'Caterpillar', 
            'Mezcla': 'Mix / Mixture / Blend',
            'Tetera': 'Teapot / Kettle', 
            'Calorías': 'Calories', 
            'Boquilla': 'Nozzle / Mouthpiece', 
            'Cenizas': 'Ashes', 
            'Estofado': 'Stew / Braised dish',
            'Miel': 'Honey', 
            'Masticar': 'Chew / Chewing', 
            'Rancho': 'Ranch / Farm', 
            'Barbacoa': 'Barbecue / Grill / BBQ', 
            'Mantequilla': 'Butter',
            'Piña': 'Pineapple', 
            'Espárrago': 'Asparagus', 
            'Propulsionar': 'Propel / Push forward', 
            'Timbre': 'Doorbell / Bell / Buzzer', 
            'Factura': 'Invoice / Bill / Receipt',
            'Pelar': 'Peel / To peel', 
            'Pensar': 'Think / To think', 
            'Palomitas': 'Popcorn', 
            'Trocear': 'Chop / Cut into pieces', 
            'Cortacésped': 'Mower / Lawn mower',
            'Chicle': 'Gum / Chewing gum', 
            'Oído': 'Ear / Hearing', 
            'Murmurar': 'Mumble / Murmur / Whisper', 
            'Panadería': 'Bakery / Bread shop', 
            'Ternera': 'Veal / Beef',
            'Murciélago': 'Bat (animal)', 
            'Establo': 'Stable / Barn', 
            'Posavasos': 'Cupholder / Coaster', 
            'Romper': 'Break / To break / Tear', 
            'Lago': 'Lake'
        };
        
        // Look up translation directly from mapping
        return TRANSLATIONS[word] || null;
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

    // Difficulty selection removed

    submitGuess() {
        const guessInput = document.getElementById('guessInput');
        const guess = guessInput.value.trim();
        
        if (guess) {
            this.socket.emit('checkGuess', guess);
        }
    }

    skipWord() {
        this.socket.emit('skipWord');
    }
    
    handleGuessResult(result) {
        const guessInput = document.getElementById('guessInput');
        const guesserControls = document.getElementById('guesserControls');
        
        if (result.correct) {
            // Clear input on correct guess
            guessInput.value = '';
            
            // Show brief success feedback
            guessInput.placeholder = '✓ Correct! Next word...';
            guessInput.style.borderColor = '#48bb78';
            setTimeout(() => {
                guessInput.placeholder = 'Type your guess here...';
                guessInput.style.borderColor = '';
            }, 1000);
        } else {
            // Show brief error feedback
            guessInput.style.borderColor = '#e53e3e';
            guessInput.classList.add('shake');
            setTimeout(() => {
                guessInput.style.borderColor = '';
                guessInput.classList.remove('shake');
            }, 500);
        }
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

    // Difficulty selection removed

        // Show selected language in waiting room (optional)
        if (this.gameState.language) {
            let langLabel = document.getElementById('roomLanguageLabel');
            if (!langLabel) {
                langLabel = document.createElement('div');
                langLabel.id = 'roomLanguageLabel';
                langLabel.style.margin = '10px 0';
                langLabel.style.fontWeight = '600';
                document.getElementById('waitingScreen').insertBefore(langLabel, document.getElementById('playersList'));
            }
            langLabel.textContent = `Language: ${this.gameState.language === 'es' ? 'Español' : 'English'}`;
        }
    }

    updateGameScreen() {
        if (!this.gameState) return;

        // Update game info
        document.getElementById('currentRound').textContent = this.gameState.currentRound;
        document.getElementById('maxRounds').textContent = this.gameState.maxRounds;
        this.updateTimer();
        document.getElementById('currentPlayerName').textContent = this.gameState.currentPlayer.name;

        // Translation button logic for describer
        // Remove any previous translation button or translation text
        const oldBtn = document.getElementById('showTranslationBtn');
        if (oldBtn) oldBtn.remove();
        const oldTrans = document.getElementById('translationText');
        if (oldTrans) oldTrans.remove();

        // Only show for describer, during playing
        if (this.gameState.isDescriber && this.gameState.gameState === 'playing') {
                if (this.translationTimeout) clearTimeout(this.translationTimeout);
                const controls = document.querySelector('.game-controls');
                const btn = document.createElement('button');
                btn.id = 'showTranslationBtn';
                btn.className = 'btn btn-info';
                btn.textContent = 'Show Translation (5s)';
                btn.style.marginTop = '12px';
                btn.disabled = true;
                let countdown = 5;
                btn.onclick = () => {
                    const translation = this.getTranslation(this.gameState.currentWord, this.gameState.language);
                    let transText = document.createElement('div');
                    transText.id = 'translationText';
                    transText.className = 'translation-text';
                    transText.style.marginTop = '10px';
                    transText.style.fontSize = '1.1rem';
                    transText.style.color = '#4299e1';
                    transText.textContent = translation ? `Translation: ${translation}` : 'Translation not found.';
                    btn.parentNode.insertBefore(transText, btn.nextSibling);
                    btn.disabled = true;
                };
                controls.parentNode.insertBefore(btn, controls.nextSibling);
                // Countdown logic
                this.translationTimeout = setInterval(() => {
                    countdown--;
                    if (countdown > 0) {
                        btn.textContent = `Show Translation (${countdown}s)`;
                    } else {
                        btn.textContent = 'Show Translation';
                        btn.disabled = false;
                        clearInterval(this.translationTimeout);
                    }
                }, 1000);
        } else {
            if (this.translationTimeout) clearTimeout(this.translationTimeout);
        }

        // Update word image
        const wordImage = document.getElementById('wordImage');
        if (this.gameState.currentWordImage) {
            wordImage.src = `/images/${this.gameState.currentWordImage}`;
            wordImage.alt = this.gameState.currentWord;
            wordImage.style.display = 'block';
        } else {
            wordImage.style.display = 'none';
        }

        // Update word display based on player role
        const currentWord = document.getElementById('currentWord');
        const playerRole = document.getElementById('playerRole');
        
        if (this.gameState.isDescriber) {
            // Player is describing - can see word and control game
            currentWord.textContent = this.gameState.currentWord.toUpperCase();
            currentWord.style.fontSize = '3rem';
            currentWord.style.color = 'white';
            playerRole.textContent = `Describe this word to ${this.getOtherPlayerName()}!`;
            playerRole.style.color = '#ffd700';
            playerRole.style.fontWeight = '600';
        } else if (this.gameState.isGuesser) {
            // Player is guessing - cannot see word or control game
            currentWord.textContent = 'LISTEN AND GUESS!';
            currentWord.style.fontSize = '2rem';
            currentWord.style.color = '#e3f0ff'; // very light blue
            playerRole.textContent = `${this.gameState.currentPlayer.name} is describing a word for you to guess!`;
            playerRole.style.color = '#ffd700';
            playerRole.style.fontWeight = '600';
        }
        
        document.getElementById('wordCategory').textContent = ``;

        // Update team score
        this.updateScores();

        // Show/hide controls based on whether player is the describer
        this.updateGameControls();

        // Handle round transitions
        this.handleRoundTransition();
    }

    updateGameControls() {
        const isDescriber = this.gameState.isDescriber;
        const controls = document.querySelector('.game-controls');
        const existingMsg = controls.parentNode.querySelector('.waiting-message');
        
        // Remove existing waiting message
        if (existingMsg) {
            existingMsg.remove();
        }

        const describerControls = document.getElementById('describerControls');
        const guesserControls = document.getElementById('guesserControls');
        
        if (isDescriber) {
            // Describer can only skip
            describerControls.classList.remove('hidden');
            guesserControls.classList.add('hidden');
            
            // Add helpful instruction for describer
            const instructionMsg = document.createElement('p');
            instructionMsg.textContent = `Describe "${this.gameState.currentWord}" without saying the word itself!`;
            instructionMsg.style.color = '#e53e3e';
            instructionMsg.style.fontSize = '1rem';
            instructionMsg.style.margin = '10px 0';
            instructionMsg.style.textAlign = 'center';
            instructionMsg.style.fontWeight = '600';
            instructionMsg.className = 'describer-instruction';
            
            // Remove existing instruction
            const existingInstruction = controls.parentNode.querySelector('.describer-instruction');
            if (existingInstruction) {
                existingInstruction.remove();
            }
            
            controls.parentNode.insertBefore(instructionMsg, controls);
        } else {
            // Guesser types their guess
            describerControls.classList.add('hidden');
            guesserControls.classList.remove('hidden');
            
            // Clear and focus input
            const guessInput = document.getElementById('guessInput');
            guessInput.value = '';
            guessInput.focus();
            
            // Remove describer instruction if exists
            const existingInstruction = controls.parentNode.querySelector('.describer-instruction');
            if (existingInstruction) {
                existingInstruction.remove();
            }
            
            // Add waiting message for guesser
            const waitingMsg = document.createElement('p');
            if (this.gameState.isGuesser) {
                waitingMsg.textContent = `Listen carefully and guess the word! ${this.gameState.currentPlayer.name} will click "They Got It!" when you guess correctly.`;
            } else {
                waitingMsg.textContent = `${this.gameState.currentPlayer.name} is controlling the game...`;
            }
            waitingMsg.style.color = '#718096';
            waitingMsg.style.fontSize = '1.1rem';
            waitingMsg.style.margin = '20px 0';
            waitingMsg.style.textAlign = 'center';
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
        
        // Display the words from the completed round
        const wordsList = document.getElementById('roundWordsList');
        if (wordsList && data.roundWords && data.roundWords.length > 0) {
            wordsList.innerHTML = data.roundWords.map(word => 
                `<span class="round-word-item">${word}</span>`
            ).join('');
        } else if (wordsList) {
            wordsList.innerHTML = '<span class="round-word-item">No words this round</span>';
        }
        
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

    showTest() {
        if (!this.gameState || !this.gameState.wordsShownInGame) {
            this.showMessage('No words available for test', 'error');
            return;
        }

        this.showScreen('testScreen');
        this.generateTestQuestions();
    }

    generateTestQuestions() {
        const testQuestions = document.getElementById('testQuestions');
        testQuestions.innerHTML = '';

        const words = this.gameState.wordsShownInGame;
        const otherLanguage = this.gameState.language === 'en' ? 'Spanish' : 'English';

        words.forEach((word, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'test-question';

            const label = document.createElement('label');
            label.className = 'test-question-label';
            label.innerHTML = `${index + 1}. Translate <span class="test-word">"${word}"</span> to ${otherLanguage}:`;

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'test-input';
            input.id = `test-input-${index}`;
            input.placeholder = 'Enter translation...';
            input.dataset.word = word;

            questionDiv.appendChild(label);
            questionDiv.appendChild(input);
            testQuestions.appendChild(questionDiv);
        });
    }

    submitTest() {
        const words = this.gameState.wordsShownInGame;
        const answers = {};

        words.forEach((word, index) => {
            const input = document.getElementById(`test-input-${index}`);
            answers[word] = input ? input.value.trim() : '';
        });

        // Send answers to server
        this.socket.emit('submitTest', { answers });
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
