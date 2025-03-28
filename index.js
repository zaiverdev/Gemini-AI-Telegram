const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Ganti dengan token bot Telegram Anda
const TELEGRAM_BOT_TOKEN = '7025803879:AAHoSdA4S1RlqfROYoxkPQULPDwVwvsUn_s';
// Ganti dengan API key Google Generative Language API Anda
const GEMINI_API_KEY = 'AIzaSyCGpkQ95zwAfAEhbHDXaot1tDUqWR5uzno';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${GEMINI_API_KEY}`;

// Buat instance bot Telegram
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

console.log('Bot sedang berjalan...');

// Tangani pesan masuk
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  try {
    // Kiram pesan "Sedang memproses..." ke pengguna
    await bot.sendChatAction(chatId, 'typing');
    
    // Panggil Generative Language API
    const response = await axios.post(
      GEMINI_API_URL,
      {
        contents: [{
          parts: [{ text: userMessage }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Ambil teks respons dari API
    const generatedText = response.data.candidates[0].content.parts[0].text;
    
    // Kirim balasan ke pengguna
    await bot.sendMessage(chatId, generatedText);
  } catch (error) {
    console.error('Error:', error);
    
    // Kirim pesan error ke pengguna
    let errorMessage = 'Maaf, terjadi kesalahan saat memproses permintaan Anda.';
    if (error.response) {
      errorMessage += ` (Status: ${error.response.status})`;
    }
    
    await bot.sendMessage(chatId, errorMessage);
  }
});

// Tangani error polling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});
