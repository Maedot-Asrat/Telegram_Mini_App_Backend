const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
const cors = require('cors');
app.use(cors());


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

  const userSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    name: String,
    points: { type: Number, default: 0 }, // Added points field
  });
  

  

const User = mongoose.model('User', userSchema);

// const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.chat.first_name;

  let user = await User.findOne({ telegramId: chatId });

  if (!user) {
    user = new User({ telegramId: chatId, name: userName, points: 0 }); // Initialize points to 0
    await user.save();
  }

  const token = jwt.sign({ telegramId: chatId }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Send a message with an inline button that opens the URL
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Open Hamster Maddy App",
            url: `${process.env.VITE_APP_URL}/api/user/${token}`
          }
        ]
      ]
    }
  };
  console.log(JSON.stringify(options, null, 2));

  bot.sendMessage(chatId, "Click the button below to open the Hamster Maddy App:", options);
  
});

// Handle other messages
bot.on('message', (msg) => {
  // You can add other message handling here if needed
});

// Route to handle token verification and user data retrieval
app.get('/api/user/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ telegramId: decoded.telegramId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ name: user.name, points: user.points });
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
});



app.post('/api/update-points', async (req, res) => {
  const { token, pointsToAdd } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await User.findOne({ telegramId: decoded.telegramId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.points += pointsToAdd;
    await user.save();

    res.json({ points: user.points });
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
});
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
bot.setWebHook(`${process.env.VITE_APP_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}`);

app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
