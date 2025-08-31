# Catch Phrase - Online Word Game

A real-time multiplayer word game inspired by Catch Phrase. Describe as many words as you can before time runs out!

## Features

- 🎮 **Real-time multiplayer** - Two players join a room using a room code
- ⏱️ **Timer-based rounds** - 60 seconds per round, 3 rounds total
- 📚 **Multiple difficulty levels** - Easy, Medium, and Hard word sets
- 🏆 **Scoring system** - Track points for each correctly guessed word
- 📱 **Responsive design** - Works on desktop and mobile devices
- 🌐 **Free hosting ready** - Deploy to Render, Railway, or Vercel

## How to Play

1. **Create or Join a Room**: One player creates a room and shares the code with a friend
2. **Choose Difficulty**: Select from Easy, Medium, or Hard word sets
3. **Take Turns**: Players take turns describing words without saying the word itself
4. **Score Points**: Click "Correct!" for each word guessed correctly, or "Skip" to move on
5. **Win the Game**: Player with the most points after 3 rounds wins!

## Local Development

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to `http://localhost:3000`

### Production

To run in production mode:
```bash
npm start
```

## Deployment

This game can be deployed to various free hosting platforms:

### Render
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

### Railway
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway up`

### Vercel (Requires some modifications for WebSocket support)
1. Install Vercel CLI: `npm install -g vercel`
2. Deploy: `vercel`

## Game Rules

### Describing Words
- ✅ Use synonyms, descriptions, actions, sounds
- ✅ Give examples or categories
- ✅ Use rhyming words
- ❌ Don't say the word itself or parts of it
- ❌ Don't use "sounds like" or "rhymes with"
- ❌ Don't spell out the word

### Scoring
- +1 point for each correctly guessed word
- No penalty for skipped words
- Game consists of 3 rounds (60 seconds each)
- Players alternate who describes words each round

## Technical Details

### Backend
- Node.js with Express
- Socket.IO for real-time communication
- In-memory game state management

### Frontend
- Vanilla JavaScript (no frameworks)
- Responsive CSS with modern design
- Real-time updates via WebSockets

### Word Database
- Demo set included with 75 words across 3 difficulty levels
- Easy: Common everyday words
- Medium: More complex concepts
- Hard: Advanced vocabulary

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

MIT License - feel free to use this code for your own projects!
