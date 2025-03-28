const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Konfigurasi
const TELEGRAM_BOT_TOKEN = '7025803879:AAHoSdA4S1RlqfROYoxkPQULPDwVwvsUn_s';
const GEMINI_API_KEY = 'AIzaSyCGpkQ95zwAfAEhbHDXaot1tDUqWR5uzno';
const TEXT_MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${GEMINI_API_KEY}`;
const IMAGE_MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`;

// Inisialisasi bot dengan opsi pemrosesan perintah yang tepat
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: true,
  filepath: false,
  baseApiUrl: 'https://api.telegram.org'
});

console.log('Bot sedang berjalan...');

// Fungsi untuk memproses teks
async function generateText(prompt) {
  const response = await axios.post(
    TEXT_MODEL_URL,
    {
      contents: [{
        parts: [{ text: prompt }]
      }]
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data.candidates[0].content.parts[0].text;
}

// Fungsi untuk menghasilkan gambar
async function generateImage(prompt) {
  const response = await axios.post(
    IMAGE_MODEL_URL,
    {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseModalities: ["Text", "Image"]
      }
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  // Ekstrak data gambar dari respons
  const imagePart = response.data.candidates[0].content.parts.find(part => part.inlineData);
  if (!imagePart) {
    throw new Error('Tidak mendapatkan data gambar dari API');
  }
  
  const imageData = imagePart.inlineData.data;
  
  // Simpan gambar ke file sementara
  const tempDir = './temp';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const imagePath = path.join(tempDir, `generated_${Date.now()}.png`);
  fs.writeFileSync(imagePath, Buffer.from(imageData, 'base64'));
  
  return imagePath;
}

// Tangani perintah /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🤖 *Selamat datang di AI Bot!*

Saya bisa membantu Anda dengan:
- Chat biasa: cukup ketik pesan
- Buat gambar: gunakan perintah /image [deskripsi]

Contoh:
/image lukisan minyak pemandangan desa di sore hari
  `;
  
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Tangani perintah /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
🆘 *Bantuan*

Perintah yang tersedia:
/start - Memulai bot
/help - Menampilkan pesan bantuan
/image [deskripsi] - Membuat gambar berdasarkan deskripsi

Untuk chat biasa, cukup ketik pesan Anda.
  `;
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Tangani perintah /image
bot.onText(/\/image (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];

  try {
    await bot.sendChatAction(chatId, 'upload_photo');
    const processingMessage = await bot.sendMessage(
      chatId, 
      `🖌️ Membuat gambar berdasarkan: "${prompt}"...`,
      { reply_to_message_id: msg.message_id }
    );

    const imagePath = await generateImage(prompt);
    
    await bot.sendPhoto(
      chatId, 
      fs.readFileSync(imagePath), 
      {
        caption: `🎨 Hasil gambar untuk: "${prompt}"`,
        reply_to_message_id: msg.message_id
      }
    );
    
    // Hapis pesan "processing" dan file sementara
    await bot.deleteMessage(chatId, processingMessage.message_id);
    fs.unlinkSync(imagePath);
  } catch (error) {
    console.error('Error generating image:', error);
    
    let errorMessage = '❌ Maaf, gagal membuat gambar. Silakan coba lagi dengan deskripsi yang berbeda.';
    if (error.response?.data?.error) {
      errorMessage += `\n\nDetail: ${error.response.data.error.message}`;
    }
    
    await bot.sendMessage(
      chatId, 
      errorMessage,
      { reply_to_message_id: msg.message_id }
    );
  }
});

// Tangani pesan teks biasa (bukan perintah)
bot.on('message', async (msg) => {
  // Abaikan jika pesan adalah perintah atau bukan teks
  if (msg.text?.startsWith('/') || !msg.text) return;

  const chatId = msg.chat.id;
  const userMessage = msg.text;

  try {
    await bot.sendChatAction(chatId, 'typing');
    
    const responseText = await generateText(userMessage);
    
    await bot.sendMessage(
      chatId, 
      responseText,
      { reply_to_message_id: msg.message_id }
    );
  } catch (error) {
    console.error('Error processing text:', error);
    
    await bot.sendMessage(
      chatId, 
      '❌ Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.',
      { reply_to_message_id: msg.message_id }
    );
  }
});

// Tangani error
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});
