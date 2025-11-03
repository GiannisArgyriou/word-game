# 🎯 Catch Phrase - Online Word Game

A real-time multiplayer word game for 2 players with bilingual support (English/Spanish) and post-game translation tests.

## Features

- 🌐 Real-time multiplayer gameplay using Socket.IO
- 🌍 Bilingual support (English & Spanish)
- 🎮 Cooperative team-based scoring
- 📝 Post-game translation test
- 💾 PostgreSQL database for storing test results
- 🎨 Beautiful, responsive UI

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** HTML, CSS, JavaScript
- **Database:** PostgreSQL
- **Deployment:** Railway

## Local Development

### Prerequisites

- Node.js 16+
- PostgreSQL (optional for local development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YourUsername/word-game.git
cd word-game
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set up local PostgreSQL database:
```bash
# Create a .env file
cp .env.example .env

# Edit .env and add your local database URL
DATABASE_URL=postgresql://username:password@localhost:5432/catchphrase
```

4. Run the development server:
```bash
npm run dev
```

5. Open http://localhost:3000 in your browser

## Deployment to Railway

### Step 1: Push to GitHub

Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy on Railway

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `word-game` repository
5. Railway will auto-detect Node.js and start deploying

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically:
   - Create a PostgreSQL database
   - Set the `DATABASE_URL` environment variable
   - Connect it to your app

### Step 4: Verify Deployment

1. Click on your app service
2. Go to **"Deployments"** tab
3. Wait for deployment to complete (green checkmark)
4. Click **"Settings"** → **"Generate Domain"**
5. Your app will be live at: `https://your-app-name.up.railway.app`

### Step 5: View Test Results

To view the test results stored in the database:

1. In Railway, click on your **PostgreSQL** service
2. Go to **"Data"** tab
3. You can view the `test_results` table
4. Or click **"Connect"** to get connection details for pgAdmin or other tools

## Database Schema

The `test_results` table stores:

```sql
id              SERIAL PRIMARY KEY
player_name     VARCHAR(255)    - Name of the player
room_id         VARCHAR(10)     - Game room ID
language        VARCHAR(5)      - Language used (en/es)
answers         JSONB          - Translation answers as JSON
timestamp       TIMESTAMP      - When test was submitted
created_at      TIMESTAMP      - Record creation time
```

## Environment Variables

Railway automatically sets:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port

## How to Play

1. **Create a Room:** Enter your name, select language, and create a room
2. **Share Room Code:** Give the room code to your friend
3. **Play Game:** Take turns describing words while your partner guesses
4. **Take Test:** After the game, translate all the words you saw
5. **View Results:** Answers are saved to the database

## Viewing Test Results

### Option 1: Railway Dashboard
- Navigate to PostgreSQL service → Data tab

### Option 2: pgAdmin or Database Client
- Use connection string from Railway PostgreSQL settings

### Option 3: Add API Endpoint (Future)
You can add an admin route to view results in the browser.

## Troubleshooting

### Database connection fails locally
- The app works without a database, but test results won't be saved
- Install PostgreSQL locally or skip database setup for development

### App works locally but not on Railway
- Check Railway logs: Project → Service → Logs
- Verify PostgreSQL is added and connected
- Ensure `npm install` includes `pg` package

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

## License

MIT
