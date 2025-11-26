const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { initDatabase, saveTestResult } = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Initialize database
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  console.log('⚠️  App will continue but test results will not be saved to database');
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Merged word sets for the game
const WORDS_EN = [
  'pizza', 'dog', 'car', 'book', 'phone', 'tree', 'water', 'music', 'house', 'coffee',
  'beach', 'movie', 'friend', 'school', 'birthday', 'vacation', 'chocolate', 'garden',
  'summer', 'winter', 'football', 'basketball', 'computer', 'restaurant', 'hospital',
  'adventure', 'telescope', 'volcano', 'butterfly', 'democracy', 'university', 'newspaper',
  'elephant', 'dinosaur', 'skeleton', 'laboratory', 'microphone', 'refrigerator', 'calculator',
  'photograph', 'mechanic', 'architect', 'detective', 'magician', 'scientist', 'astronaut',
  'thunderstorm', 'rainbow', 'mountain', 'lighthouse',
  'philosophical', 'entrepreneur', 'metamorphosis', 'consciousness', 'photosynthesis',
  'extraterrestrial', 'archaeological', 'cryptocurrency', 'biodegradable', 'sophisticated',
  'revolutionary', 'extraordinary', 'incomprehensible', 'interdisciplinary', 'neuroscience',
  'procrastination', 'claustrophobia', 'serendipity', 'antidisestablishmentarianism',
  'incompatibility', 'superintendent', 'telecommunications', 'anthropomorphic', 'epistemology'
];
const WORDS_ES = [
  'pizza', 'perro', 'coche', 'libro', 'teléfono', 'árbol', 'agua', 'música', 'casa', 'café',
  'playa', 'película', 'amigo', 'escuela', 'cumpleaños', 'vacaciones', 'chocolate', 'jardín',
  'verano', 'invierno', 'fútbol', 'baloncesto', 'computadora', 'restaurante', 'hospital',
  'aventura', 'telescopio', 'volcán', 'mariposa', 'democracia', 'universidad', 'periódico',
  'elefante', 'dinosaurio', 'esqueleto', 'laboratorio', 'micrófono', 'refrigerador', 'calculadora',
  'fotografía', 'mecánico', 'arquitecto', 'detective', 'mago', 'científico', 'astronauta',
  'tormenta', 'arcoíris', 'montaña', 'faro',
  'filosófico', 'emprendedor', 'metamorfosis', 'conciencia', 'fotosíntesis',
  'extraterrestre', 'arqueológico', 'criptomoneda', 'biodegradable', 'sofisticado',
  'revolucionario', 'extraordinario', 'incomprensible', 'interdisciplinario', 'neurociencia',
  'procrastinación', 'claustrofobia', 'serendipia', 'antidisestablishmentarianismo',
  'incompatibilidad', 'superintendente', 'telecomunicaciones', 'antropomórfico', 'epistemología'
];

// Game state management
const rooms = new Map();
const players = new Map();

class GameRoom {
  constructor(roomId, ioInstance, language = 'en') {
    this.roomId = roomId;
    this.players = [];
    this.currentRound = 0;
      this.maxRounds = 4;
    this.currentPlayerIndex = 0;
    this.gameState = 'waiting'; // waiting, playing, finished
    this.currentWord = '';
    this.timeLeft = 60;
    this.totalScore = 0; // Cooperative scoring - total words guessed by team
    this.timer = null;
    this.wordIndex = 0;
    this.usedWords = new Set();
    this.wordsShownInGame = []; // Track all correctly guessed words during the game
    this.currentRoundWords = []; // Track correctly guessed words in the current round
    this.testAnswers = new Map(); // Store test answers for each player
  // Difficulty removed
    this.language = language;
    this.io = ioInstance; // Store io instance for broadcasting
  }

  addPlayer(playerId, playerName) {
    if (this.players.length < 2) {
      this.players.push({ id: playerId, name: playerName });
      return true;
    }
    return false;
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    
    if (this.players.length === 0) {
      this.stopGame();
    } else if (this.gameState === 'playing') {
      this.stopGame();
    }
  }

  startGame() {
    if (this.players.length === 2) {
      this.gameState = 'playing';
      this.currentRound = 1;
      this.currentPlayerIndex = 0;
      this.startRound();
      return true;
    }
    return false;
  }

  startRound() {
    this.timeLeft = 60;
    this.currentRoundWords = []; // Clear words for new round
    this.getNewWord();
    this.startTimer();
    // Broadcast new game state with new word
    this.broadcastGameState();
  }

  getNewWord() {
  const wordPool = this.language === 'en' ? WORDS_EN : WORDS_ES;
    let newWord;
    
    // If we've used all words, reset the used words set
    if (this.usedWords.size >= wordPool.length) {
      this.usedWords.clear();
    }
    
    do {
      newWord = wordPool[Math.floor(Math.random() * wordPool.length)];
    } while (this.usedWords.has(newWord));
    
    this.usedWords.add(newWord);
    this.currentWord = newWord;
  }

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.timeLeft--;
      
      // Broadcast timer update to all players in real-time
      this.broadcastTimerUpdate();
      
      if (this.timeLeft <= 0) {
        this.endRound();
      }
    }, 1000);
  }

  broadcastTimerUpdate() {
    // Send timer update to all players in the room
    this.players.forEach(player => {
      this.io.to(player.id).emit('timerUpdate', { timeLeft: this.timeLeft });
    });
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  checkGuess(guess) {
    // Normalize both strings: lowercase, trim, remove extra spaces
    const normalizedGuess = guess.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedWord = this.currentWord.toLowerCase().trim().replace(/\s+/g, ' ');
    
    if (normalizedGuess === normalizedWord) {
      this.totalScore++; // Increment team score
      
      // Track correctly guessed word for post-game test
      if (!this.wordsShownInGame.includes(this.currentWord)) {
        this.wordsShownInGame.push(this.currentWord);
      }
      
      // Track correctly guessed word for current round
      this.currentRoundWords.push(this.currentWord);
      
      this.getNewWord();
      return { correct: true };
    }
    return { correct: false };
  }

  skipWord() {
    this.getNewWord();
    // Broadcast updated state immediately
    this.broadcastGameState();
  }

  endRound() {
    this.stopTimer();
    
    // Store the words from this round before clearing
    const roundWords = [...this.currentRoundWords];
    
    // Immediately switch players
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
    
    if (this.currentRound < this.maxRounds) {
      this.currentRound++;
      
      // Show round transition with countdown and words from completed round
      this.showRoundTransition(roundWords, () => {
        if (this.gameState === 'playing') {
          this.startRound();
        }
      });
    } else {
      this.endGame();
    }
  }

  showRoundTransition(roundWords, callback) {
    // Broadcast round transition state with words from completed round
    this.players.forEach(player => {
      this.io.to(player.id).emit('roundTransition', {
        message: `Round ${this.currentRound} starting soon...`,
        nextPlayer: this.players[this.currentPlayerIndex].name,
        countdown: 10,
        roundWords: roundWords
      });
    });

    // Countdown from 10 to 1
    let countdown = 10;
    const countdownTimer = setInterval(() => {
      countdown--;
      
      if (countdown > 0) {
        this.players.forEach(player => {
          this.io.to(player.id).emit('roundTransition', {
            message: `Round ${this.currentRound} starting soon...`,
            nextPlayer: this.players[this.currentPlayerIndex].name,
            countdown: countdown,
            roundWords: roundWords
          });
        });
      } else {
        clearInterval(countdownTimer);
        
        // Hide transition and start round
        this.players.forEach(player => {
          this.io.to(player.id).emit('hideRoundTransition');
        });
        
        callback();
      }
    }, 1000);
  }

  broadcastGameState() {
    // Send updated game state to all players with their specific view
    this.players.forEach(player => {
      this.io.to(player.id).emit('gameUpdate', this.getGameStateForPlayer(player.id));
    });
  }

  endGame() {
    this.gameState = 'finished';
    this.stopTimer();
    // Broadcast final state with words for test
    this.broadcastGameState();
  }

  stopGame() {
    this.gameState = 'waiting';
    this.currentRound = 0;
    this.stopTimer();
    this.totalScore = 0; // Reset team score
    this.wordsShownInGame = []; // Reset words list
    this.testAnswers.clear(); // Clear test answers
  }

  getGameState() {
    return {
      roomId: this.roomId,
      players: this.players,
      gameState: this.gameState,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      currentPlayer: this.players[this.currentPlayerIndex],
      currentWord: this.currentWord,
      timeLeft: this.timeLeft,
      totalScore: this.totalScore, // Team score instead of individual scores
  // difficulty removed
      language: this.language,
      wordsShownInGame: this.wordsShownInGame // Words for post-game test
    };
  }

  // Get game state for specific player (hides word from guesser)
  getGameStateForPlayer(playerId) {
    const gameState = this.getGameState();
    
    // The current player is the one describing (who can see the word and control the game)
    const currentPlayer = this.players[this.currentPlayerIndex];
    const isDescriber = currentPlayer && currentPlayer.id === playerId;
    
    if (isDescriber && this.gameState === 'playing') {
      // Describer sees the word and can control the game
      gameState.isDescriber = true;
      gameState.isGuesser = false;
    } else if (this.gameState === 'playing') {
      // Guesser doesn't see the word and cannot control the game
      gameState.currentWord = '***'; // Hide word from guesser
      gameState.isDescriber = false;
      gameState.isGuesser = true;
    } else {
      gameState.isDescriber = false;
      gameState.isGuesser = false;
    }
    
    return gameState;
  }
}

// Generate random room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (data) => {
    const roomId = generateRoomId();
    const language = data.language || 'en';
    const room = new GameRoom(roomId, io, language);
    
    if (room.addPlayer(socket.id, data.playerName)) {
      rooms.set(roomId, room);
      players.set(socket.id, { roomId, playerName: data.playerName });
      
      socket.join(roomId);
      socket.emit('roomCreated', { roomId, gameState: room.getGameStateForPlayer(socket.id) });
      
      console.log(`Room ${roomId} created by ${data.playerName} (Language: ${language})`);
    }
  });

  socket.on('joinRoom', (data) => {
    const room = rooms.get(data.roomId);
    
    if (room && room.addPlayer(socket.id, data.playerName)) {
      players.set(socket.id, { roomId: data.roomId, playerName: data.playerName });
      
      socket.join(data.roomId);
      socket.emit('roomJoined', { gameState: room.getGameStateForPlayer(socket.id) });
      
      // Notify all players in the room with their specific game state
      room.players.forEach(player => {
        io.to(player.id).emit('gameUpdate', room.getGameStateForPlayer(player.id));
      });
      
      console.log(`${data.playerName} joined room ${data.roomId}`);
    } else {
      socket.emit('error', { message: 'Room not found or full' });
    }
  });

  socket.on('startGame', () => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room && room.startGame()) {
        // Send player-specific game states
        room.broadcastGameState();
      }
    }
  });

  socket.on('checkGuess', (guess) => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room && room.gameState === 'playing') {
        const result = room.checkGuess(guess);
        socket.emit('guessResult', result);
        if (result.correct) {
          // Broadcast updated state to all players
          room.broadcastGameState();
        }
      }
    }
  });

  socket.on('skipWord', () => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room && room.gameState === 'playing') {
        room.skipWord();
        // Game state is broadcast within skipWord method
      }
    }
  });

  // Difficulty change removed

  socket.on('submitTest', (data) => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room && room.gameState === 'finished') {
        // Store test answers
        const testResult = {
          playerName: playerData.playerName,
          roomId: playerData.roomId,
          language: room.language,
          answers: data.answers,
          timestamp: new Date().toISOString()
        };
        
        room.testAnswers.set(socket.id, testResult);
        
        console.log(`Test submitted by ${playerData.playerName} in room ${playerData.roomId}:`, data.answers);
        
        // Save to database (async, won't block response)
        saveTestResult(testResult).catch(err => {
          // Errors are already logged in database.js
        });
        
        // Send confirmation
        socket.emit('testSubmitted', { success: true });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room) {
        room.removePlayer(socket.id);
        
        if (room.players.length === 0) {
          rooms.delete(playerData.roomId);
        } else {
          // Send updated game state to remaining players
          room.broadcastGameState();
        }
      }
      players.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
