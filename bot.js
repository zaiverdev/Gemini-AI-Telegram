const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Ganti dengan token bot Telegram Anda
const token = '7983808155:AAFEO0ieBCb4zPsKPL6wSYxgW1hh80ZQp3o';
const apiKey = 'AIzaSyCGpkQ95zwAfAEhbHDXaot1tDUqWR5uzno';

// Buat instance bot
const bot = new TelegramBot(token, { polling: true });

// Fungsi untuk memanggil API Gemini
async function callGeminiAPI(userMessage) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: userMessage,
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Mengambil respons dari API
    return response.data.contents[0].parts[0].text;
  } catch (error) {
    console.error('Error:', error.message);
    return 'Maaf, terjadi kesalahan saat memproses permintaan Anda.';
  }
}

// Event ketika menerima pesan
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  // Cek jika perintah adalah /start
  if (userMessage === '/start') {
    const welcomeMessage = `Halo, Saya Asisten AI\nada yang bisa saya bantu?`;
    return bot.sendMessage(chatId, welcomeMessage);
  }

  // Panggil layanan API jika bukan /start
  const responseText = await callGeminiAPI(userMessage);
  bot.sendMessage(chatId, responseText);
});
          
