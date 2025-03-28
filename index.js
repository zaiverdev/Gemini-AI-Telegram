const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Konfigurasi
const TELEGRAM_BOT_TOKEN = '7025803879:AAHoSdA4S1RlqfROYoxkPQULPDwVwvsUn_s';
const GEMINI_API_KEY = 'AIzaSyCGpkQ95zwAfAEhbHDXaot1tDUqWR5uzno';
const TEXT_MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${GEMINI_API_KEY}`;
const IMAGE_MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`;

// Inisialisasi bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

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
  const imageData = response.data.candidates[0].content.parts
    .find(part => part.inlineData).inlineData.data;
  
  // Simpan gambar ke file sementara
  const tempDir = './temp';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  const imagePath = path.join(tempDir, `generated_${Date.now()}.png`);
  fs.writeFileSync(imagePath, Buffer.from(imageData, 'base64'));
  
  return imagePath;
}

// Tangani pesan masuk
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  try {
    if (!userMessage) {
      await bot.sendMessage(chatId, 'Silakan kirim pesan teks.');
      return;
    }

    await bot.sendChatAction(chatId, 'typing');

    // Deteksi perintah khusus untuk generate gambar
    if (userMessage.startsWith('/image ')) {
      const prompt = userMessage.substring(7);
      
      if (!prompt) {
        await bot.sendMessage(chatId, 'Silakan sertakan prompt gambar setelah /image');
        return;
      }

      // Kirim notifikasi sedang memproses
      await bot.sendMessage(chatId, `Membuat gambar berdasarkan: "${prompt}"...`);
      
      // Generate gambar
      const imagePath = await generateImage(prompt);
      
      // Kirim gambar ke pengguna
      await bot.sendPhoto(chatId, fs.readFileSync(imagePath), {
        caption: `Hasil gambar untuk: "${prompt}"`
      });
      
      // Hapus file sementara
      fs.unlinkSync(imagePath);
    } else {
      // Generate teks biasa
      const responseText = await generateText(userMessage);
      await bot.sendMessage(chatId, responseText);
    }
  } catch (error) {
    console.error('Error:', error);
    
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

// Tangani error lainnya
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});
