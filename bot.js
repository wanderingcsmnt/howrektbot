require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const { rollRekt, todayKey } = require("./rekt");
const { pickFlavor } = require("./flavors");
const { recordRoll, getTodayLeaderboard, getHallOfShame, setUserTemplate, getUserTemplate } = require("./db");

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

// Builds the shareable one-liner for a user's roll, using their custom
// /text template if they've set one, otherwise a default phrasing.
function buildShareMessage(userId, percent, flavor) {
  const template = getUserTemplate(userId);
  if (template) {
    return template.replace(/%rekt%/g, `${percent}%`);
  }
  return `I'm not ${percent}% rekt or anything, but ${flavor}`;
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

bot.onText(/^\/text(@\w+)?(\s+([\s\S]*))?$/i, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const customText = (match[3] || "").trim();

  if (!customText) {
    bot.sendMessage(
      chatId,
      "You forgot to specify your text! Example: /text I am not %rekt% rekt..."
    );
    return;
  }

  if (!customText.includes("%rekt%")) {
    bot.sendMessage(
      chatId,
      "The custom message must contain one %rekt%, which will be replaced " +
        "with the rekt-centage. (e.g. 50%)"
    );
    return;
  }

  setUserTemplate(userId, customText);
  bot.sendMessage(chatId, "Got it — your custom rekt message is set.");
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
//
// Thumbnails must be public https URLs (Telegram can't accept local files
// here), so this points at the PNGs in this repo's /assets folder via
// GitHub's raw file host. Set ASSETS_BASE_URL as an environment variable to
// something like:
//   https://raw.githubusercontent.com/<your-username>/how-rekt-bot/main/assets
const ASSETS_BASE_URL =
  process.env.ASSETS_BASE_URL ||
  "https://raw.githubusercontent.com/YOUR_USERNAME/how-rekt-bot/main/assets";

bot.on("inline_query", async (query) => {
  const userId = query.from.id;
  const dateKey = todayKey();

  const { percent, seedIndex } = rollRekt(userId, dateKey);
  const flavor = pickFlavor(percent, seedIndex);

  const rektResult = {
    type: "article",
    id: `rekt-${userId}-${dateKey}`,
    title: "💀 How rekt are you?",
    description: "Send your current rekt score to this chat.",
    thumb_url: `${ASSETS_BASE_URL}/rekt-thumb.png`,
    input_message_content: {
      message_text: buildShareMessage(userId, percent, flavor),
    },
    reply_markup: {
      inline_keyboard: [
        [{ text: "Share your rekt score 💀", switch_inline_query: "" }],
      ],
    },
  };

  const helpText =
    `Either press the button attached to this message and select the chat ` +
    `you would like to post in, or simply enter "@${botUsername} " into ` +
    `your text box.\n\n` +
    `For a personalized rekt message, send @${botUsername} a message!`;

  const helpResult = {
    type: "article",
    id: "help",
    title: "❓ Help",
    description: "Send the usage guidelines to this chat.",
    thumb_url: `${ASSETS_BASE_URL}/help-thumb.png`,
    input_message_content: {
      message_text: helpText,
    },
    reply_markup: {
      inline_keyboard: [
        [{ text: "Share your rekt score 💀", switch_inline_query: "" }],
      ],
    },
  };

  try {
    await bot.answerInlineQuery(query.id, [rektResult, helpResult], {
      cache_time: 0,
    });
  } catch (err) {
    console.error("Failed to answer inline query:", err.message);
  }
});

// Personalized DM: if someone messages the bot directly (not a slash
// command, not in a group), reply with their rekt score conversationally.
bot.on("message", (msg) => {
  const isPrivateChat = msg.chat.type === "private";
  const isCommand = msg.text && msg.text.startsWith("/");
  if (!isPrivateChat || !msg.text || isCommand) return;

  const userId = msg.from.id;
  const dateKey = todayKey();

  const { percent, seedIndex } = rollRekt(userId, dateKey);
  const flavor = pickFlavor(percent, seedIndex);

  bot.sendMessage(msg.chat.id, buildShareMessage(userId, percent, flavor));
});

console.log("How Rekt bot is running...");
