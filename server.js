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

// Word sets for the game
const WORDS_EN = [
  'River', 'Fridge', 'Lecture', 'Mower', 'Propel', 'Journal', 'Waiter', 'Bakery', 'Gravy', 'Cupholder',
  'Lawn', 'Sip', 'Mutual', 'Stale', 'Nozzle', 'Bat', 'Cider', 'Ashes', 'Stable', 'Chew',
  'Tart', 'Leftovers', 'Contemporary', 'Mumble', 'Brew', 'Caterpillar', 'Dressing', 'Garlic', 'Ranch', 'Peel',
  'Pear', 'Chop', 'Pastrami', 'Grip', 'Invoice', 'Stew', 'Break', 'Lunch', 'Teapot', 'Doorbell',
  'Mug', 'Corn', 'Billionaire', 'Dishwasher', 'Honey', 'Plant', 'Pomegranate', 'Asparagus', 'Strainer', 'Lake'
];

const WORDS_ES = [
  'Camarero', 'Rancio', 'Malvavisco', 'Pimienta', 'Restos', 'Sorbo', 'Melocotón', 'Trufa', 'Ajo', 'Colador',
  'Aderezo', 'Sidra', 'Nata', 'Tarta', 'Veterinario', 'Pera', 'Pavo', 'Sopa', 'Oruga', 'Mezcla',
  'Tetera', 'Calorías', 'Boquilla', 'Cenizas', 'Estofado', 'Miel', 'Masticar', 'Rancho', 'Barbacoa', 'Mantequilla',
  'Piña', 'Espárrago', 'Propulsionar', 'Timbre', 'Factura', 'Pelar', 'Pensar', 'Palomitas', 'Trocear', 'Cortacésped',
  'Chicle', 'Oído', 'Murmurar', 'Panadería', 'Ternera', 'Murciélago', 'Establo', 'Posavasos', 'Romper', 'Lago'
];

// Translation mappings (EN -> ES and ES -> EN)
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
  'Strainer': 'Colador', 
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

// Image mappings - maps words to their image filenames
// Spanish words that represent the same concept use the same English image
const WORD_IMAGES = {
  // English words
  'River': 'river.jpg',
  'Fridge': 'fridge.jpg',
  'Lecture': 'lecture.jpg',
  'Mower': 'mower.jpg',
  'Propel': 'propel.jpg',
  'Journal': 'journal.jpg',
  'Waiter': 'waiter.jpg',
  'Bakery': 'bakery.jpg',
  'Gravy': 'gravy.jpg',
  'Cupholder': 'cupholder.jpg',
  'Lawn': 'lawn.jpg',
  'Sip': 'sip.jpg',
  'Mutual': 'mutual.jpg',
  'Stale': 'stale.jpg',
  'Nozzle': 'nozzle.jpg',
  'Bat': 'bat.jpg',
  'Cider': 'cider.jpg',
  'Ashes': 'ashes.jpg',
  'Stable': 'stable.jpg',
  'Chew': 'chew.jpg',
  'Tart': 'tart.jpg',
  'Leftovers': 'leftovers.jpg',
  'Contemporary': 'contemporary.jpg',
  'Mumble': null, // No image for Mumble
  'Brew': 'brew.jpg',
  'Caterpillar': 'caterpillar.jpg',
  'Dressing': 'dressing.jpg',
  'Garlic': 'garlic.jpg',
  'Ranch': 'ranch.jpg',
  'Peel': 'peel.jpg',
  'Pear': 'pear.jpg',
  'Chop': 'chop.jpg',
  'Pastrami': 'pastrami.jpg',
  'Grip': 'grip.jpg',
  'Invoice': 'invoice.jpg',
  'Stew': 'stew.jpg',
  'Break': 'break.jpg',
  'Lunch': 'lunch.jpg',
  'Teapot': 'teapot.jpg',
  'Doorbell': 'doorbell.jpg',
  'Mug': 'mug.jpg',
  'Corn': 'corn.jpg',
  'Billionaire': 'billionaire.jpg',
  'Dishwasher': 'dishwasher.jpg',
  'Honey': 'honey.jpg',
  'Plant': 'plant.jpg',
  'Pomegranate': 'pomegranate.jpg',
  'Asparagus': 'asparagus.jpg',
  'Strainer': 'strainer.jpg',
  'Lake': 'lake.jpg',
  // Spanish words - mapped to corresponding English images
  'Camarero': 'waiter.jpg',
  'Rancio': 'stale.jpg',
  'Malvavisco': 'marshmallow.jpg',
  'Pimienta': 'pepper.jpg',
  'Restos': 'leftovers.jpg',
  'Sorbo': 'sip.jpg',
  'Melocotón': 'peach.jpg',
  'Trufa': 'truffle.jpg',
  'Ajo': 'garlic.jpg',
  'Colador': 'strainer.jpg',
  'Aderezo': 'dressing.jpg',
  'Sidra': 'cider.jpg',
  'Nata': 'cream.jpg',
  'Tarta': 'tart.jpg',
  'Veterinario': 'vet.jpg',
  'Pera': 'pear.jpg',
  'Pavo': 'turkey.jpg',
  'Sopa': 'soup.jpg',
  'Oruga': 'caterpillar.jpg',
  'Mezcla': 'mix.jpg',
  'Tetera': 'teapot.jpg',
  'Calorías': 'diet.jpg',
  'Boquilla': 'nozzle.jpg',
  'Cenizas': 'ashes.jpg',
  'Estofado': 'stew.jpg',
  'Miel': 'honey.jpg',
  'Masticar': 'chew.jpg',
  'Rancho': 'ranch.jpg',
  'Barbacoa': 'barbecue.jpg',
  'Mantequilla': 'butter.jpg',
  'Piña': 'pineapple.jpg',
  'Espárrago': 'asparagus.jpg',
  'Propulsionar': 'propel.jpg',
  'Timbre': 'doorbell.jpg',
  'Factura': 'invoice.jpg',
  'Pelar': 'peel.jpg',
  'Pensar': 'think.jpg',
  'Palomitas': 'popcorn.jpg',
  'Trocear': 'chop.jpg',
  'Cortacésped': 'mower.jpg',
  'Chicle': 'gum.jpg',
  'Oído': 'ear.jpg',
  'Murmurar': null,
  'Panadería': 'bakery.jpg',
  'Ternera': 'beef.jpg',
  'Murciélago': 'bat.jpg',
  'Establo': 'stable.jpg',
  'Posavasos': 'cupholder.jpg',
  'Romper': 'break.jpg',
  'Lago': 'lake.jpg'
};

// Game state management
const rooms = new Map();
const players = new Map();

class GameRoom {
  constructor(roomId, ioInstance) {
    this.roomId = roomId;
    this.players = [];
    this.currentRound = 0;
      this.maxRounds = 8;
    this.currentPlayerIndex = 0;
    this.gameState = 'waiting'; // waiting, playing, finished
    this.currentWord = '';
    this.currentWordLanguage = 'en'; // Track current word's language
    this.timeLeft = 90;
    this.totalScore = 0; // Cooperative scoring - total words guessed by team
    this.timer = null;
    this.wordIndex = 0;
    this.usedWordsEN = new Set(); // Track used English words across entire session
    this.usedWordsES = new Set(); // Track used Spanish words across entire session
    this.availableWordsEN = [...WORDS_EN]; // Available English words pool
    this.availableWordsES = [...WORDS_ES]; // Available Spanish words pool
    this.wordsShownInGame = []; // Track all correctly guessed words during the game
    this.currentRoundWords = []; // Track correctly guessed words in the current round
    this.testAnswers = new Map(); // Store test answers for each player
    this.playerNativeLanguages = new Map(); // Store each player's native language
    this.playAgainVotes = new Set(); // Track which players voted to play again
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
      this.playAgainVotes.clear(); // Clear votes when starting new game
      this.playerNativeLanguages.clear(); // Clear language selections for new game
      this.testAnswers.clear(); // Clear previous test answers
      this.wordsShownInGame = []; // Reset words list for new game
      this.totalScore = 0; // Reset score for new game
      this.startRound();
      return true;
    }
    return false;
  }

  startRound() {
    this.timeLeft = 90;
    this.currentRoundWords = []; // Clear words for new round
    this.getNewWord();
    this.startTimer();
    // Broadcast new game state with new word
    this.broadcastGameState();
  }

  getNewWord() {
    // Determine which language to use based on current round
    // First half of rounds: English only
    // Second half of rounds: Spanish only
    const useLanguage = this.currentRound <= Math.floor(this.maxRounds / 2) ? 'en' : 'es';
    const wordPool = useLanguage === 'en' ? this.availableWordsEN : this.availableWordsES;
    
    // If no words available in this pool, refill it
    if (wordPool.length === 0) {
      if (useLanguage === 'en') {
        this.availableWordsEN = [...WORDS_EN];
        this.usedWordsEN.clear();
      } else {
        this.availableWordsES = [...WORDS_ES];
        this.usedWordsES.clear();
      }
    }
    
    // Pick random word from available pool
    const availablePool = useLanguage === 'en' ? this.availableWordsEN : this.availableWordsES;
    const randomIndex = Math.floor(Math.random() * availablePool.length);
    const newWord = availablePool[randomIndex];
    
    // Remove word from available pool and add to used set
    availablePool.splice(randomIndex, 1);
    if (useLanguage === 'en') {
      this.usedWordsEN.add(newWord);
    } else {
      this.usedWordsES.add(newWord);
    }
    
    this.currentWord = newWord;
    this.currentWordLanguage = useLanguage;
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

  removeAccents(str) {
    // Normalize string and remove diacritical marks (accents)
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  checkGuess(guess) {
    // Normalize both strings: lowercase, trim, remove extra spaces, and remove accents
    const normalizedGuess = this.removeAccents(guess.toLowerCase().trim().replace(/\s+/g, ' '));
    const normalizedWord = this.removeAccents(this.currentWord.toLowerCase().trim().replace(/\s+/g, ' '));
    
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
    this.playerNativeLanguages.clear(); // Clear language selections
    this.playAgainVotes.clear(); // Clear play again votes
    // Keep word pools intact across sessions (usedWordsEN, usedWordsES, availableWordsEN, availableWordsES)
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
      currentWordLanguage: this.currentWordLanguage,
      currentWordImage: WORD_IMAGES[this.currentWord] || null,
      timeLeft: this.timeLeft,
      totalScore: this.totalScore, // Team score instead of individual scores
      wordsShownInGame: this.wordsShownInGame, // Words for post-game test
      playAgainVotes: Array.from(this.playAgainVotes),
      englishWords: WORDS_EN, // Send word lists for client-side language detection
      spanishWords: WORDS_ES
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
    const room = new GameRoom(roomId, io);
    
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

  socket.on('setNativeLanguage', (data) => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room && room.gameState === 'finished') {
        room.playerNativeLanguages.set(socket.id, data.nativeLanguage);
        socket.emit('nativeLanguageSet', { success: true });
      }
    }
  });

  socket.on('submitTest', (data) => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room && room.gameState === 'finished') {
        // Get player's native language and test language
        const nativeLanguage = data.nativeLanguage;
        
        // Store test answers
        const testResult = {
          playerName: playerData.playerName,
          roomId: playerData.roomId,
          language: nativeLanguage,
          answers: data.answers,
          score: room.totalScore,
          timestamp: new Date().toISOString()
        };
        
        room.testAnswers.set(socket.id, testResult);
        
        console.log(`Test submitted by ${playerData.playerName} in room ${playerData.roomId} - Score: ${room.totalScore}:`, data.answers);
        
        // Save to database (async, won't block response)
        saveTestResult(testResult).catch(err => {
          // Errors are already logged in database.js
        });
        
        // Send confirmation
        socket.emit('testSubmitted', { success: true });
      }
    }
  });

  socket.on('votePlayAgain', () => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const room = rooms.get(playerData.roomId);
      if (room) {
        room.playAgainVotes.add(socket.id);
        
        const votesNeeded = 2 - room.playAgainVotes.size;
        
        // Broadcast vote status to all players
        room.players.forEach(player => {
          io.to(player.id).emit('playAgainVote', { votesNeeded });
        });
        
        // If both players voted, restart the game
        if (room.playAgainVotes.size === 2 && room.players.length === 2) {
          room.playAgainVotes.clear();
          room.startGame();
        }
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
