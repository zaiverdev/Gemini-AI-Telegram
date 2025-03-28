const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Replace with your Telegram bot token
const TELEGRAM_BOT_TOKEN = '7025803879:AAHoSdA4S1RlqfROYoxkPQULPDwVwvsUn_s';
// Replace with your Gemini API key
const GEMINI_API_KEY = 'AIzaSyCGpkQ95zwAfAEhbHDXaot1tDUqWR5uzno';

// Initialize Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Create a temporary directory for images if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '👋 Hello! I can generate images using Gemini AI. Just send me a description of what you want to see!');
});

// Handle text messages
bot.on('text', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore commands
    if (text.startsWith('/')) return;

    try {
        // Send "generating" message
        const generatingMsg = await bot.sendMessage(chatId, '🖌️ Generating your image...');

        // Call Gemini API
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: text }
                    ]
                }],
                generationConfig: { responseModities: ["Text", "Image"] }
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        // Extract image data
        const imageData = response.data.candidates[0].content.parts.find(part => part.image)?.image.data;
        if (!imageData) {
            throw new Error('No image data found in response');
        }

        // Save image to file
        const imagePath = path.join(tempDir, `gemini-image-${Date.now()}.png`);
        fs.writeFileSync(imagePath, Buffer.from(imageData, 'base64'));

        // Send image to user
        await bot.sendPhoto(chatId, fs.createReadStream(imagePath), {
            caption: 'Here\'s your generated image! 🎨'
        });

        // Delete the generating message
        bot.deleteMessage(chatId, generatingMsg.message_id);

        // Clean up - delete the temporary image file
        fs.unlinkSync(imagePath);
    } catch (error) {
        console.error('Error:', error);
        bot.sendMessage(chatId, '❌ Sorry, there was an error generating your image. Please try again later.');
    }
});

console.log('Bot is running...');
