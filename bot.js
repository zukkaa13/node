require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const BOT_TOKEN = (process.env.BOT_TOKEN || '').trim();
const CURRENCIES_API = 'https://rowix.com/currencies.php';

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN არ არის მითითებული. შექმენი .env ფაილი და დაამატე BOT_TOKEN.');
  process.exit(1);
}
if (BOT_TOKEN === 'your_bot_token_here' || !/^\d+:[A-Za-z0-9_-]+$/.test(BOT_TOKEN)) {
  console.error('BOT_TOKEN არასწორია. @BotFather-ში მიიღე ტოკენი და .env-ში ჩაწერე ფორმატით: BOT_TOKEN=123456789:AAH...');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

bot.on('polling_error', (err) => {
  if (err.message && err.message.includes('401')) {
    console.error('401 Unauthorized — ტოკენი არასწორია ან გაუქმებულია. @BotFather → /mybots → ბოტი → API Token → დააკოპირე ახალი ტოკენი და .env-ში ჩაწერე.');
    process.exit(1);
  }
  console.error('polling_error:', err.message);
});

// მეხსიერებაში ვალუტების ქეში (API იძახება ბოტის სტარტზე)
let currenciesCache = [];

function formatCurrencyMessage(currency) {
  return `${currency.name}\nსიმბოლო: ${currency.symbol}\nკურსი: ${currency.rate}`;
}

function findCurrency(code) {
  if (!code || typeof code !== 'string') return null;
  const normalized = code.trim().toUpperCase().replace(/^\//, '');
  return currenciesCache.find((c) => c.code.toUpperCase() === normalized) || null;
}

async function fetchCurrencies() {
  try {
    const { data } = await axios.get(CURRENCIES_API);
    if (Array.isArray(data)) {
      currenciesCache = data;
      console.log(`ჩატვირთულია ${currenciesCache.length} ვალუტა.`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('API შეცდომა:', err.message);
    return false;
  }
}

// ბოტის გაშვება: ჯერ ვალუტები, შემდეგ ტოკენის შემოწმება, მერე polling
async function start() {
  const ok = await fetchCurrencies();
  if (!ok) console.warn('კურსების ჩატვირთვა ვერ მოხერხდა. ბოტი მუშაობს ცარიელი ქეშით.');

  try {
    await bot.getMe();
  } catch (err) {
    const is401 = (err.response && err.response.statusCode === 401) || (err.message && String(err.message).includes('401'));
    if (is401) {
      console.error('401 Unauthorized — ტოკენი არასწორია ან გაუქმებულია. @BotFather → /mybots → ბოტი → API Token → დააკოპირე ახალი ტოკენი და .env-ში ჩაწერე.');
      process.exit(1);
    }
    throw err;
  }

  bot.startPolling();
  console.log('Telegram ბოტი გაშვებულია (long polling).');
}
start();

// Inline კლავიატურა – პოპულარული ვალუტები (USD, EUR, GBP)
const popularKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🇺🇸 USD', callback_data: 'currency_USD' }, { text: '🇪🇺 EUR', callback_data: 'currency_EUR' }],
      [{ text: '🇬🇧 GBP', callback_data: 'currency_GBP' }]
    ]
  }
};

// ——— /start ———
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcome = `👋 გამარჯობა!\n\nეს ბოტი აჩვენებს ვალუტის კურსებს.\n\n` +
    `📌 ვალუტის მოთხოვნა:\n` +
    `• გაგზავნე კოდი: \`usd\`, \`eur\`, \`gbp\`\n` +
    `• ან ბრძანება: \`/eur\`, \`/gbp\`\n\n` +
    `📌 ყველა ვალუტა: \`/all\`\n\n` +
    `ქვემოთ არის ღილაკები ყველაზე პოპულარული ვალუტებისთვის.`;
  bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown', ...popularKeyboard });
});

// ——— Inline ღილაკების დაჭერა ———
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('currency_')) {
    const code = data.replace('currency_', '');
    const currency = findCurrency(code);
    if (currency) {
      bot.sendMessage(chatId, formatCurrencyMessage(currency));
    } else {
      const errMsg = currenciesCache.length === 0
        ? 'კურსების მიღება ვერ მოხერხდა.'
        : 'ვალუტა ვერ მოიძებნა.';
      bot.sendMessage(chatId, errMsg);
    }
  }
  bot.answerCallbackQuery(query.id);
});

// ——— ვალუტის მოთხოვნა (ტექსტი ან /code) ———
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  // /start უკვე ცალკეა
  if (text === '/start') return;

  // /all
  if (text === '/all') {
    if (currenciesCache.length === 0) {
      bot.sendMessage(chatId, 'კურსების მიღება ვერ მოხერხდა. სცადეთ მოგვიანებით.');
      return;
    }
    const lines = currenciesCache.map((c) => `${c.code} ${c.symbol} — ${c.rate}`);
    bot.sendMessage(chatId, lines.join('\n'));
    return;
  }

  // ვალუტის კოდი (მაგ. usd, /eur, GBP)
  const currency = findCurrency(text);
  if (currency) {
    bot.sendMessage(chatId, formatCurrencyMessage(currency));
    return;
  }

  // არასწორი კოდი ან API ცარიელი – მხოლოდ თუ რაღაც ტექსტი იყო
  if (text.length > 0 && !text.startsWith('/')) {
    const msg = currenciesCache.length === 0
      ? 'კურსების მიღება ვერ მოხერხდა.'
      : 'ვალუტა ვერ მოიძებნა.';
    bot.sendMessage(chatId, msg);
  }
});
