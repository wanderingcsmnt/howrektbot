# How Rekt Bot

A Telegram bot in the spirit of the classic "how gay" bot — except it tells
you how *rekt* you are today. Same person + same day always gets the same
number (deterministic hash of user ID + date), so it resets once every 24h
like the original.

## Commands

- `/rekt` or `/howrekt` — roll today's rekt percentage, with flavor text and
  a little bar chart.
- `/rektboard` — today's leaderboard for the current chat, most rekt first.
- `/rekthalloffame` — the worst roll ever recorded per user, all-time, for
  the current chat.
- `/help` — command list.

## Setup

1. **Create the bot with BotFather**
   - Open Telegram, message [@BotFather](https://t.me/BotFather).
   - Send `/newbot`, follow the prompts, and copy the token it gives you.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the token**
   ```bash
   cp .env.example .env
   # then edit .env and paste your token in as BOT_TOKEN=...
   ```

4. **Run it**
   ```bash
   npm start
   ```
   You should see `How Rekt bot is running...`. Add the bot to a group (or
   DM it) and try `/rekt`.

## How it works

- `rekt.js` hashes `userId + today's date (UTC)` with SHA-256 and reduces it
  to a 0–100 percentage, plus a second value used to pick which flavor line
  to show. Because the hash is deterministic, the same person gets the same
  number all day, and a new number the next day — no database needed for
  the roll itself.
- `flavors.js` holds the tiered joke text (least rekt → most rekt).
- `db.js` uses SQLite (`better-sqlite3`) purely to power the leaderboard and
  hall-of-fame commands, storing one row per (chat, user, day).
- `bot.js` wires it all together with `node-telegram-bot-api`, using long
  polling (no public URL/webhook required — works fine on a laptop or a
  small VPS).

## Deploying

Polling mode works anywhere you can keep a Node process running:
- A small VPS (`pm2 start bot.js` or a systemd service) is the simplest.
- Railway / Render / Fly.io free tiers also work well for a bot this light.
- If you'd rather use webhooks instead of polling (better for serverless
  hosts), swap `polling: true` for a webhook setup — happy to add that if
  you tell me which host you're targeting.

## Customizing the humor

All the joke text lives in `flavors.js` — add more lines per tier, or add
new tiers, without touching the bot logic.
