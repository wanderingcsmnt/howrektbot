require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const { rollRekt, todayKey } = require("./rekt");
const { pickFlavor } = require("./flavors");
const { recordRoll, getTodayLeaderboard, getHallOfShame } = require("./db");

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing BOT_TOKEN. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

let botUsername = "your_bot";
bot.getMe().then((me) => {
  botUsername = me.username;
});

function displayName(from) {
  if (from.username) return `@${from.username}`;
  return [from.first_name, from.last_name].filter(Boolean).join(" ") || "someone";
}

// Bar like ████████░░ for a quick visual
function bar(percent, width = 10) {
  const filled = Math.round((percent / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

bot.onText(/^\/(rekt|howrekt)(@\w+)?$/i, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const name = displayName(msg.from);
  const dateKey = todayKey();

  const { percent, seedIndex } = rollRekt(userId, dateKey);
  const flavor = pickFlavor(percent, seedIndex);

  recordRoll({
    chatId,
    userId,
    username: msg.from.username ? `@${msg.from.username}` : name,
    dateKey,
    percent,
  });

  const text =
    `${name} is *${percent}% REKT* today\n` +
    `${bar(percent)}\n` +
    `_${flavor}_`;

  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
});

bot.onText(/^\/rektboard(@\w+)?$/i, (msg) => {
  const chatId = msg.chat.id;
  const dateKey = todayKey();
  const rows = getTodayLeaderboard(chatId, dateKey, 10);

  if (rows.length === 0) {
    bot.sendMessage(chatId, "Nobody's rolled today yet. Use /rekt to find out how rekt you are.");
    return;
  }

  const lines = rows.map((r, i) => `${i + 1}. ${r.username || "unknown"} — ${r.percent}%`);
  bot.sendMessage(chatId, `*Today's Rekt Leaderboard*\n\n${lines.join("\n")}`, {
    parse_mode: "Markdown",
  });
});

bot.onText(/^\/rekthalloffame(@\w+)?$/i, (msg) => {
  const chatId = msg.chat.id;
  const rows = getHallOfShame(chatId, 10);

  if (rows.length === 0) {
    bot.sendMessage(chatId, "No history yet. Use /rekt to start the record book.");
    return;
  }

  const lines = rows.map(
    (r, i) => `${i + 1}. ${r.username || "unknown"} — ${r.percent}% (on ${r.date_key})`
  );
  bot.sendMessage(chatId, `*Hall of Shame (all-time worst rolls)*\n\n${lines.join("\n")}`, {
    parse_mode: "Markdown",
  });
});

bot.onText(/^\/help(@\w+)?$/i, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "*How Rekt Bot*\n\n" +
      "/rekt — find out how rekt you are today (resets daily)\n" +
      "/rektboard — today's leaderboard for this chat\n" +
      "/rekthalloffame — worst rolls ever recorded in this chat\n" +
      "Type @" + botUsername + " in any chat to share your score inline.",
    { parse_mode: "Markdown" }
  );
});

// Inline mode: lets someone type "@YourBotName" in ANY chat (without adding
// the bot to it) and get a shareable result, like "via @HowGayBot" bots do.
// Requires inline mode to be turned on for the bot via BotFather (/setinline).
bot.on("inline_query", async (query) => {
  const userId = query.from.id;
  const name = displayName(query.from);
  const dateKey = todayKey();

  const { percent, seedIndex } = rollRekt(userId, dateKey);
  const flavor = pickFlavor(percent, seedIndex);

  const messageText =
    `I'm not ${percent}% rekt or anything, but ${flavor}`;

  const result = {
    type: "article",
    id: `rekt-${userId}-${dateKey}`,
    title: `You are ${percent}% REKT today`,
    description: flavor,
    input_message_content: {
      message_text: messageText,
    },
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Share your rekt score 💀",
            switch_inline_query: "",
          },
        ],
      ],
    },
  };

  try {
    await bot.answerInlineQuery(query.id, [result], { cache_time: 0 });
  } catch (err) {
    console.error("Failed to answer inline query:", err.message);
  }
});

console.log("How Rekt bot is running...");
