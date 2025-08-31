const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Demo word sets for the game
const WORD_CATEGORIES = {
  easy: [
    'pizza', 'dog', 'car', 'book', 'phone', 'tree', 'water', 'music', 'house', 'coffee',
    'beach', 'movie', 'friend', 'school', 'birthday', 'vacation', 'chocolate', 'garden',
    'summer', 'winter', 'football', 'basketball', 'computer', 'restaurant', 'hospital'
  ],
  medium: [
    'adventure', 'telescope', 'volcano', 'butterfly', 'democracy', 'university', 'newspaper',
    'elephant', 'dinosaur', 'skeleton', 'laboratory', 'microphone', 'refrigerator', 'calculator',
    'photograph', 'mechanic', 'architect', 'detective', 'magician', 'scientist', 'astronaut',
    'thunderstorm', 'rainbow', 'mountain', 'lighthouse'
  ],
  hard: [
    'philosophical', 'entrepreneur', 'metamorphosis', 'consciousness', 'photosynthesis',
    'extraterrestrial', 'archaeological', 'cryptocurrency', 'biodegradable', 'sophisticated',
    'revolutionary', 'extraordinary', 'incomprehensible', 'interdisciplinary', 'neuroscience',
    'procrastination', 'claustrophobia', 'serendipity', 'antidisestablishmentarianism',
    'incompatibility', 'superintendent', 'telecommunications', 'anthropomorphic', 'epistemology'
  ]
};

// Game state management
const rooms = new Map();
const players = new Map();

class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.currentRound = 0;
    this.maxRounds = 3;
    this.currentPlayerIndex = 0;
    this.gameState = 'waiting'; // waiting, playing, finished
    this.currentWord = '';
    this.timeLeft = 60;
    this.totalScore = 0; // Cooperative scoring - total words guessed by team
    this.timer = null;
    this.wordIndex = 0;
    this.usedWords = new Set();
    this.difficulty = 'easy';
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
    this.getNewWord();
    this.startTimer();
  }

  getNewWord() {
    const wordPool = WORD_CATEGORIES[this.difficulty];
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
      const roomId = this.roomId;
      io.to(roomId).emit('timerUpdate', { timeLeft: this.timeLeft });
      
      if (this.timeLeft <= 0) {
        this.endRound();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  correctGuess() {
    this.totalScore++; // Increment team score
    this.getNewWord();
  }

  skipWord() {
    this.getNewWord();
  }

  endRound() {
    this.stopTimer();
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
    
    if (this.currentRound < this.maxRounds) {
      this.currentRound++;
      setTimeout(() => {
        if (this.gameState === 'playing') {
          this.startRound();
        }
      }, 3000);
    } else {
      this.endGame();
    }
  }

  endGame() {
    this.gameState = 'finished';
    this.stopTimer();
  }

  stopGame() {
    this.gameState = 'waiting';
    this.currentRound = 0;
    this.stopTimer();
    this.totalScore = 0; // Reset team score
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
      difficulty: this.difficulty
    };
  }

  // Get game state for specific player (hides word from guesser)
  getGameStateForPlayer(playerId) {
    const gameState = this.getGameState();
    
    // Hide the word from the player who is guessing
    const currentPlayer = this.players[this.currentPlayerIndex];
    const isCurrentPlayerDescribing = currentPlayer && currentPlayer.id !== playerId;
    
    if (!isCurrentPlayerDescribing && this.gameState === 'playing') {
      gameState.currentWord = '***'; // Hide word from guesser
      gameState.isGuesser = true;
    } else {
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
    const room = new GameRoom(roomId);
    
    if (room.addPlayer(socket.id, data.playerName)) {
      rooms.set(roomId, room);
      players.set(socket.id, { roomId, playerName: data.playerName });
      
      socket.join(roomId);
      socket.emit('roomCreated', { roomId, gameState: room.getGameStateForPlayer(socket.id) });
      
      console.log(`Room ${roomId} created by ${data.playerName}`);
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
        room.players.forEach(player => {
          io.to(player.id).emit('gameUpdate', room.getGameStateForPlayer(player.id));
        });
      }
    }
  });

  socket.on('correctGuess', () => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room && room.gameState === 'playing') {
        room.correctGuess();
        // Send updated game state to all players
        room.players.forEach(player => {
          io.to(player.id).emit('gameUpdate', room.getGameStateForPlayer(player.id));
        });
      }
    }
  });

  socket.on('skipWord', () => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room && room.gameState === 'playing') {
        room.skipWord();
        // Send updated game state to all players
        room.players.forEach(player => {
          io.to(player.id).emit('gameUpdate', room.getGameStateForPlayer(player.id));
        });
      }
    }
  });

  socket.on('changeDifficulty', (data) => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room && room.gameState === 'waiting') {
        room.difficulty = data.difficulty;
        // Send updated game state to all players
        room.players.forEach(player => {
          io.to(player.id).emit('gameUpdate', room.getGameStateForPlayer(player.id));
        });
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
          room.players.forEach(player => {
            io.to(player.id).emit('gameUpdate', room.getGameStateForPlayer(player.id));
          });
        }
      }
      players.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
