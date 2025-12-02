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

// Word sets for the game (100 words each, parallel lists)
const WORDS_EN = [
  'Alarm', 'Alcohol', 'Battery', 'Bell', 'Bubble', 'Cap', 'Ceiling', 'Chain', 'Coin', 'Curtain',
  'File', 'Frame', 'Fuel', 'Heating', 'Iron', 'Keyboard', 'Needle', 'Pan', 'Pin', 'Pipe',
  'Pot', 'Receipt', 'Rope', 'Shelf', 'Tin', 'Coal', 'Cotton', 'Diamond', 'Dirt', 'Flour',
  'Fur', 'Grain', 'Ingredient', 'Leaf', 'Leather', 'Liquid', 'Mud', 'Sand', 'Seed', 'Wool',
  'Bee', 'Earthquake', 'Flood', 'Hurricane', 'Path', 'Shell', 'Wing', 'Tail', 'Tent', 'Yard',
  'Bride', 'Captain', 'Guard', 'Photographer', 'Priest', 'Prince', 'Princess', 'Prisoner', 'Robot', 'Sailor',
  'Stranger', 'Youth', 'Border', 'Cottage', 'Court', 'Entrance', 'Fence', 'Garage', 'Laboratory', 'Mall',
  'Port', 'Stadium', 'Bake', 'Bite', 'Climb', 'Explode', 'Fry', 'Kick', 'Kiss', 'Knock',
  'Measure', 'Mix', 'Pack', 'Swim', 'Chest', 'Drum', 'Muscle', 'Flag', 'Glove', 'Tongue',
  'Breath', 'Nail', 'Album', 'Package', 'Helicopter', 'Net', 'Signal', 'Tape', 'Tube', 'Sculpture'
];

const WORDS_ES = [
  'Alarma', 'Alcohol', 'Batería', 'Campana', 'Burbuja', 'Gorra', 'Techo', 'Cadena', 'Moneda', 'Cortina',
  'Archivo', 'Marco', 'Combustible', 'Calefacción', 'Plancha', 'Teclado', 'Aguja', 'Sartén', 'Alfiler', 'Tubería',
  'Olla', 'Recibo', 'Cuerda', 'Estantería', 'Lata', 'Carbón', 'Algodón', 'Diamante', 'Suciedad', 'Harina',
  'Piel', 'Grano', 'Ingrediente', 'Hoja', 'Cuero', 'Líquido', 'Barro', 'Arena', 'Semilla', 'Lana',
  'Abeja', 'Terremoto', 'Inundación', 'Huracán', 'Camino', 'Concha', 'Ala', 'Cola', 'Tienda', 'Patio',
  'Novia', 'Capitán', 'Guardia', 'Fotógrafo', 'Sacerdote', 'Príncipe', 'Princesa', 'Prisionero', 'Robot', 'Marinero',
  'Desconocido', 'Juventud', 'Frontera', 'Cabaña', 'Cancha', 'Entrada', 'Valla', 'Garaje', 'Laboratorio', 'Centro comercial',
  'Puerto', 'Estadio', 'Hornear', 'Morder', 'Escalar', 'Explotar', 'Freír', 'Patear', 'Besar', 'Llamar',
  'Medir', 'Mezclar', 'Empacar', 'Nadar', 'Pecho', 'Tambor', 'Músculo', 'Bandera', 'Guante', 'Lengua',
  'Aliento', 'Uña', 'Álbum', 'Paquete', 'Helicóptero', 'Red', 'Señal', 'Cinta', 'Tubo', 'Escultura'
];

// Translation mappings (EN -> ES and ES -> EN)
const TRANSLATIONS = {
  // English to Spanish
  'Alarm': 'Alarma',
  'Alcohol': 'Alcohol',
  'Battery': 'Batería / Pila',
  'Bell': 'Campana / Timbre',
  'Bubble': 'Burbuja / Pompa',
  'Cap': 'Gorra / Gorro / Tapa',
  'Ceiling': 'Techo / Cielo raso',
  'Chain': 'Cadena',
  'Coin': 'Moneda',
  'Curtain': 'Cortina',
  'File': 'Archivo / Carpeta / Lima',
  'Frame': 'Marco / Cuadro',
  'Fuel': 'Combustible / Carburante',
  'Heating': 'Calefacción / Calentamiento',
  'Iron': 'Plancha / Hierro',
  'Keyboard': 'Teclado',
  'Needle': 'Aguja',
  'Pan': 'Sartén / Cacerola',
  'Pin': 'Alfiler / Broche / Pin',
  'Pipe': 'Tubería / Tubo / Pipa',
  'Pot': 'Olla / Maceta',
  'Receipt': 'Recibo / Comprobante',
  'Rope': 'Cuerda / Soga',
  'Shelf': 'Estantería / Estante',
  'Tin': 'Lata / Estaño',
  'Coal': 'Carbón',
  'Cotton': 'Algodón',
  'Diamond': 'Diamante',
  'Dirt': 'Suciedad / Tierra / Mugre',
  'Flour': 'Harina',
  'Fur': 'Piel / Pelaje',
  'Grain': 'Grano / Cereal',
  'Ingredient': 'Ingrediente',
  'Leaf': 'Hoja',
  'Leather': 'Cuero / Piel',
  'Liquid': 'Líquido',
  'Mud': 'Barro / Lodo',
  'Sand': 'Arena',
  'Seed': 'Semilla',
  'Wool': 'Lana',
  'Bee': 'Abeja',
  'Earthquake': 'Terremoto / Sismo',
  'Flood': 'Inundación',
  'Hurricane': 'Huracán',
  'Path': 'Camino / Sendero / Ruta',
  'Shell': 'Concha / Cáscara / Caparazón',
  'Wing': 'Ala',
  'Tail': 'Cola / Rabo',
  'Tent': 'Tienda / Carpa',
  'Yard': 'Patio / Jardín / Yarda',
  'Bride': 'Novia',
  'Captain': 'Capitán',
  'Guard': 'Guardia / Guardián',
  'Photographer': 'Fotógrafo',
  'Priest': 'Sacerdote / Cura',
  'Prince': 'Príncipe',
  'Princess': 'Princesa',
  'Prisoner': 'Prisionero / Preso',
  'Robot': 'Robot',
  'Sailor': 'Marinero',
  'Stranger': 'Desconocido / Extraño',
  'Youth': 'Juventud / Joven',
  'Border': 'Frontera / Borde',
  'Cottage': 'Cabaña / Casa de campo',
  'Court': 'Cancha / Tribunal / Corte',
  'Entrance': 'Entrada',
  'Fence': 'Valla / Cerca',
  'Garage': 'Garaje',
  'Laboratory': 'Laboratorio',
  'Mall': 'Centro comercial',
  'Port': 'Puerto',
  'Stadium': 'Estadio',
  'Bake': 'Hornear / Cocinar al horno',
  'Bite': 'Morder / Mordisco',
  'Climb': 'Escalar / Trepar / Subir',
  'Explode': 'Explotar / Estallar',
  'Fry': 'Freír',
  'Kick': 'Patear / Dar una patada',
  'Kiss': 'Besar / Beso',
  'Knock': 'Llamar / Tocar / Golpear',
  'Measure': 'Medir / Medida',
  'Mix': 'Mezclar / Mezcla',
  'Pack': 'Empacar / Empaquetar',
  'Swim': 'Nadar',
  'Chest': 'Pecho / Cofre',
  'Drum': 'Tambor / Batería',
  'Muscle': 'Músculo',
  'Flag': 'Bandera',
  'Glove': 'Guante',
  'Tongue': 'Lengua',
  'Breath': 'Aliento / Respiración',
  'Nail': 'Uña / Clavo',
  'Album': 'Álbum',
  'Package': 'Paquete / Embalaje',
  'Helicopter': 'Helicóptero',
  'Net': 'Red / Malla',
  'Signal': 'Señal',
  'Tape': 'Cinta / Celo',
  'Tube': 'Tubo',
  'Sculpture': 'Escultura',
  // Spanish to English
  'Alarma': 'Alarm',
  'Alcohol': 'Alcohol',
  'Batería': 'Battery / Drums',
  'Campana': 'Bell',
  'Burbuja': 'Bubble',
  'Gorra': 'Cap / Hat',
  'Techo': 'Ceiling / Roof',
  'Cadena': 'Chain',
  'Moneda': 'Coin',
  'Cortina': 'Curtain',
  'Archivo': 'File / Archive',
  'Marco': 'Frame',
  'Combustible': 'Fuel',
  'Calefacción': 'Heating',
  'Plancha': 'Iron',
  'Teclado': 'Keyboard',
  'Aguja': 'Needle',
  'Sartén': 'Pan / Frying pan',
  'Alfiler': 'Pin',
  'Tubería': 'Pipe / Plumbing',
  'Olla': 'Pot',
  'Recibo': 'Receipt',
  'Cuerda': 'Rope',
  'Estantería': 'Shelf / Shelving',
  'Lata': 'Tin / Can',
  'Carbón': 'Coal',
  'Algodón': 'Cotton',
  'Diamante': 'Diamond',
  'Suciedad': 'Dirt / Dirtiness',
  'Harina': 'Flour',
  'Piel': 'Fur / Skin / Leather',
  'Grano': 'Grain',
  'Ingrediente': 'Ingredient',
  'Hoja': 'Leaf / Sheet',
  'Cuero': 'Leather',
  'Líquido': 'Liquid',
  'Barro': 'Mud',
  'Arena': 'Sand',
  'Semilla': 'Seed',
  'Lana': 'Wool',
  'Abeja': 'Bee',
  'Terremoto': 'Earthquake',
  'Inundación': 'Flood',
  'Huracán': 'Hurricane',
  'Camino': 'Path / Road / Way',
  'Concha': 'Shell',
  'Ala': 'Wing',
  'Cola': 'Tail / Queue / Line',
  'Tienda': 'Tent / Store / Shop',
  'Patio': 'Yard / Patio / Courtyard',
  'Novia': 'Bride / Girlfriend',
  'Capitán': 'Captain',
  'Guardia': 'Guard',
  'Fotógrafo': 'Photographer',
  'Sacerdote': 'Priest',
  'Príncipe': 'Prince',
  'Princesa': 'Princess',
  'Prisionero': 'Prisoner',
  'Robot': 'Robot',
  'Marinero': 'Sailor',
  'Desconocido': 'Stranger / Unknown',
  'Juventud': 'Youth',
  'Frontera': 'Border / Frontier',
  'Cabaña': 'Cottage / Cabin',
  'Cancha': 'Court / Field',
  'Entrada': 'Entrance / Entry / Ticket',
  'Valla': 'Fence',
  'Garaje': 'Garage',
  'Laboratorio': 'Laboratory',
  'Centro comercial': 'Mall / Shopping center',
  'Puerto': 'Port / Harbor',
  'Estadio': 'Stadium',
  'Hornear': 'Bake / To bake',
  'Morder': 'Bite / To bite',
  'Escalar': 'Climb / To climb',
  'Explotar': 'Explode / To explode',
  'Freír': 'Fry / To fry',
  'Patear': 'Kick / To kick',
  'Besar': 'Kiss / To kiss',
  'Llamar': 'Knock / Call / To call',
  'Medir': 'Measure / To measure',
  'Mezclar': 'Mix / To mix',
  'Empacar': 'Pack / To pack',
  'Nadar': 'Swim / To swim',
  'Pecho': 'Chest / Breast',
  'Tambor': 'Drum',
  'Músculo': 'Muscle',
  'Bandera': 'Flag',
  'Guante': 'Glove',
  'Lengua': 'Tongue / Language',
  'Aliento': 'Breath',
  'Uña': 'Nail / Fingernail',
  'Álbum': 'Album',
  'Paquete': 'Package / Parcel',
  'Helicóptero': 'Helicopter',
  'Red': 'Net / Network',
  'Señal': 'Signal / Sign',
  'Cinta': 'Tape / Ribbon',
  'Tubo': 'Tube / Pipe',
  'Escultura': 'Sculpture'
};

// Image mappings - maps words to their image filenames
// Spanish and English words share the same images (parallel lists)
const WORD_IMAGES = {
  // English words
  'Alarm': 'alarm.png',
  'Alcohol': 'alcohol.jpg',
  'Battery': 'battery.jpg',
  'Bell': 'bell.jpg',
  'Bubble': 'bubble.jpg',
  'Cap': 'cap.jpg',
  'Ceiling': 'ceiling.jpg',
  'Chain': 'chain.jpg',
  'Coin': 'coin.jpg',
  'Curtain': 'curtain.jpg',
  'File': 'file.jpg',
  'Frame': 'frame.jpg',
  'Fuel': 'fuel.jpg',
  'Heating': 'heating.jpg',
  'Iron': 'iron.jpg',
  'Keyboard': 'keyboard.jpg',
  'Needle': 'needle.jpg',
  'Pan': 'pan.jpg',
  'Pin': 'pin.jpg',
  'Pipe': 'pipe.jpg',
  'Pot': 'pot.jpg',
  'Receipt': 'receipt.jpg',
  'Rope': 'rope.jpg',
  'Shelf': 'shelf.jpg',
  'Tin': 'tin.jpg',
  'Coal': 'coal.jpg',
  'Cotton': 'cotton.jpg',
  'Diamond': 'diamond.jpg',
  'Dirt': 'dirt.jpg',
  'Flour': 'flour.jpg',
  'Fur': 'fur.jpg',
  'Grain': 'grain.jpg',
  'Ingredient': 'ingredient.jpg',
  'Leaf': 'leaf.jpg',
  'Leather': 'leather.jpg',
  'Liquid': 'liquid.jpg',
  'Mud': 'mud.jpg',
  'Sand': 'sand.jpg',
  'Seed': 'seed.jpg',
  'Wool': 'wool.jpg',
  'Bee': 'bee.jpg',
  'Earthquake': 'earthquake.jpg',
  'Flood': 'flood.jpg',
  'Hurricane': 'hurricane.jpg',
  'Path': 'path.jpg',
  'Shell': 'shell.jpg',
  'Wing': 'wing.jpg',
  'Tail': 'tail.jpg',
  'Tent': 'tent.jpg',
  'Yard': 'yard.jpg',
  'Bride': 'bride.jpg',
  'Captain': 'captain.jpg',
  'Guard': 'guard.jpg',
  'Photographer': 'photographer.jpg',
  'Priest': 'priest.jpg',
  'Prince': 'prince.jpg',
  'Princess': 'princess.jpg',
  'Prisoner': 'prisoner.jpg',
  'Robot': 'robot.jpg',
  'Sailor': 'sailor.jpg',
  'Stranger': 'stranger.jpg',
  'Youth': 'youth.jpg',
  'Border': 'border.jpg',
  'Cottage': 'cottage.jpg',
  'Court': 'court.jpg',
  'Entrance': 'entrance.jpg',
  'Fence': 'fence.jpg',
  'Garage': 'garage.jpg',
  'Laboratory': 'laboratory.jpg',
  'Mall': 'mall.jpg',
  'Port': 'port.jpg',
  'Stadium': 'stadium.jpg',
  'Bake': 'bake.jpg',
  'Bite': 'bite.jpg',
  'Climb': 'climb.jpg',
  'Explode': 'explode.jpg',
  'Fry': 'fry.jpg',
  'Kick': 'kick.jpg',
  'Kiss': 'kiss.jpg',
  'Knock': 'knock.jpg',
  'Measure': 'measure.jpg',
  'Mix': 'mix.jpg',
  'Pack': 'pack.jpg',
  'Swim': 'swim.jpg',
  'Chest': 'chest.jpg',
  'Drum': 'drum.jpg',
  'Muscle': 'muscle.jpg',
  'Flag': 'flag.jpg',
  'Glove': 'glove.jpg',
  'Tongue': 'tongue.jpg',
  'Breath': 'breath.jpg',
  'Nail': 'nail.jpg',
  'Album': 'album.jpg',
  'Package': 'package.jpg',
  'Helicopter': 'helicopter.jpg',
  'Net': 'net.jpg',
  'Signal': 'signal.jpg',
  'Tape': 'tape.jpg',
  'Tube': 'tube.jpg',
  'Sculpture': 'sculpture.jpg',
  // Spanish words - use the same images as their English counterparts
  'Alarma': 'alarm.png',
  'Alcohol': 'alcohol.jpg',
  'Batería': 'battery.jpg',
  'Campana': 'bell.jpg',
  'Burbuja': 'bubble.jpg',
  'Gorra': 'cap.jpg',
  'Techo': 'ceiling.jpg',
  'Cadena': 'chain.jpg',
  'Moneda': 'coin.jpg',
  'Cortina': 'curtain.jpg',
  'Archivo': 'file.jpg',
  'Marco': 'frame.jpg',
  'Combustible': 'fuel.jpg',
  'Calefacción': 'heating.jpg',
  'Plancha': 'iron.jpg',
  'Teclado': 'keyboard.jpg',
  'Aguja': 'needle.jpg',
  'Sartén': 'pan.jpg',
  'Alfiler': 'pin.jpg',
  'Tubería': 'pipe.jpg',
  'Olla': 'pot.jpg',
  'Recibo': 'receipt.jpg',
  'Cuerda': 'rope.jpg',
  'Estantería': 'shelf.jpg',
  'Lata': 'tin.jpg',
  'Carbón': 'coal.jpg',
  'Algodón': 'cotton.jpg',
  'Diamante': 'diamond.jpg',
  'Suciedad': 'dirt.jpg',
  'Harina': 'flour.jpg',
  'Piel': 'fur.jpg',
  'Grano': 'grain.jpg',
  'Ingrediente': 'ingredient.jpg',
  'Hoja': 'leaf.jpg',
  'Cuero': 'leather.jpg',
  'Líquido': 'liquid.jpg',
  'Barro': 'mud.jpg',
  'Arena': 'sand.jpg',
  'Semilla': 'seed.jpg',
  'Lana': 'wool.jpg',
  'Abeja': 'bee.jpg',
  'Terremoto': 'earthquake.jpg',
  'Inundación': 'flood.jpg',
  'Huracán': 'hurricane.jpg',
  'Camino': 'path.jpg',
  'Concha': 'shell.jpg',
  'Ala': 'wing.jpg',
  'Cola': 'tail.jpg',
  'Tienda': 'tent.jpg',
  'Patio': 'yard.jpg',
  'Novia': 'bride.jpg',
  'Capitán': 'captain.jpg',
  'Guardia': 'guard.jpg',
  'Fotógrafo': 'photographer.jpg',
  'Sacerdote': 'priest.jpg',
  'Príncipe': 'prince.jpg',
  'Princesa': 'princess.jpg',
  'Prisionero': 'prisoner.jpg',
  'Robot': 'robot.jpg',
  'Marinero': 'sailor.jpg',
  'Desconocido': 'stranger.jpg',
  'Juventud': 'youth.jpg',
  'Frontera': 'border.jpg',
  'Cabaña': 'cottage.jpg',
  'Cancha': 'court.jpg',
  'Entrada': 'entrance.jpg',
  'Valla': 'fence.jpg',
  'Garaje': 'garage.jpg',
  'Laboratorio': 'laboratory.jpg',
  'Centro comercial': 'mall.jpg',
  'Puerto': 'port.jpg',
  'Estadio': 'stadium.jpg',
  'Hornear': 'bake.jpg',
  'Morder': 'bite.jpg',
  'Escalar': 'climb.jpg',
  'Explotar': 'explode.jpg',
  'Freír': 'fry.jpg',
  'Patear': 'kick.jpg',
  'Besar': 'kiss.jpg',
  'Llamar': 'knock.jpg',
  'Medir': 'measure.jpg',
  'Mezclar': 'mix.jpg',
  'Empacar': 'pack.jpg',
  'Nadar': 'swim.jpg',
  'Pecho': 'chest.jpg',
  'Tambor': 'drum.jpg',
  'Músculo': 'muscle.jpg',
  'Bandera': 'flag.jpg',
  'Guante': 'glove.jpg',
  'Lengua': 'tongue.jpg',
  'Aliento': 'breath.jpg',
  'Uña': 'nail.jpg',
  'Álbum': 'album.jpg',
  'Paquete': 'package.jpg',
  'Helicóptero': 'helicopter.jpg',
  'Red': 'net.jpg',
  'Señal': 'signal.jpg',
  'Cinta': 'tape.jpg',
  'Tubo': 'tube.jpg',
  'Escultura': 'sculpture.jpg'
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
    this.timeLeft = 120;
    this.totalScore = 0; // Cooperative scoring - total words guessed by team
    this.timer = null;
    this.wordIndex = 0;
    this.usedWordsEN = new Set(); // Track used English words across entire session
    this.usedWordsES = new Set(); // Track used Spanish words across entire session
    this.availableWordsEN = [...WORDS_EN]; // Available English words pool
    this.availableWordsES = [...WORDS_ES]; // Available Spanish words pool
    this.wordsShownInGame = []; // Track all words shown during the game (for post-game test)
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
    this.timeLeft = 120;
    this.currentRoundWords = []; // Clear words for new round
    this.getNewWord();
    this.startTimer();
    // Broadcast new game state with new word
    this.broadcastGameState();
  }

  getNewWord() {
    // Determine which language to use based on current round
    // Rounds 1, 2, 5, 6: English
    // Rounds 3, 4, 7, 8: Spanish
    const useLanguage = (this.currentRound === 1 || this.currentRound === 2 || this.currentRound === 5 || this.currentRound === 6) ? 'en' : 'es';
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
    
    // Track all words shown in game for post-game test (not just correctly guessed)
    if (!this.wordsShownInGame.includes(newWord)) {
      this.wordsShownInGame.push(newWord);
    }
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
    
    // Auto-save game data to database for each player
    this.players.forEach(player => {
      const testResult = {
        playerName: player.name,
        roomId: this.roomId,
        language: 'N/A', // No language selection anymore
        answers: {}, // Empty answers object (no translations)
        wordsEncountered: this.wordsShownInGame, // Save all words encountered
        score: this.totalScore,
        timestamp: new Date().toISOString()
      };
      
      // Save to database (async, won't block response)
      saveTestResult(testResult).catch(err => {
        // Errors are already logged in database.js
      });
      
      console.log(`Game completed - Data saved for ${player.name} in room ${this.roomId} - Words: ${this.wordsShownInGame.length}, Score: ${this.totalScore}`);
    });
    
    // Broadcast final state
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
