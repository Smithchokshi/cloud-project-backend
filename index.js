const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const { dbConnection } = require('./config/config');
const authMiddleware = require('./Middleware/authMiddleware');
const userRoute = require('./Routes/userRoute');
const chatRoute = require('./Routes/chatRoute');
const messageRoute = require('./Routes/messageRoute');
const stripe = require('./Routes/stripeRoute');
const orderRoute = require('./Routes/orderRoute');
const cookieSession = require('cookie-session');

const app = express();
const server = http.createServer(app);
require('dotenv').config();
const io = socketIO(server, {
  cors: process.env.FRONTEND_URL,
});
global.io = io;

dbConnection();

app.use(cookieSession({ name: 'session', keys: ['lama'], maxAge: 24 * 60 * 60 * 100 }));

// app.use(express.json());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

app.use('/api/users', userRoute);
app.use('/api/stripe', stripe);
app.use('/api/chats', authMiddleware, chatRoute);
app.use('/api/orders', authMiddleware, orderRoute);
app.use('/api/message', authMiddleware, messageRoute);
app.get('/', (req, res) => {
  res.send('working');
});

let onlineUsers = [];

io.on('connection', socket => {
  console.log('New connection: ', socket.id);

  // listen to a connection

  socket.on('addNewUser', userId => {
    !onlineUsers.some(user => user.userId === userId) &&
      onlineUsers.push({
        userId,
        socketId: socket.id,
      });

    io.emit('getOnlineUsers', onlineUsers);
  });

  // add message
  socket.on('sendMessage', message => {
    console.log('message', message);
    const user = onlineUsers.find(cur => cur.userId === message.content.recipientId);
    console.log('user', user);

    if (user) {
      io.to(user.socketId).emit('getMessage', message);
    }
  });

  socket.on('disconnect', () => {
    onlineUsers = onlineUsers.filter(user => user.socketId !== socket.id);

    io.emit('getOnlineUsers', onlineUsers);
  });

  socket.on('paymentSuccessful', data => {
    const user = onlineUsers.find(cur => cur.userId === data.userId);
    const recipientUser = onlineUsers.find(cur => cur.userId === data.recipientId);

    const message = {
      content: {
        chatId: data.chatId,
        senderId: data.userId,
        content: `Payment of $${data.amount} is successful`,
        isImage: false,
        isPayment: true,
      },
    };

    if (user) {
      io.to(user.socketId).emit('getMessage', message);
    }
    if (recipientUser) {
      io.to(recipientUser.socketId).emit('getMessage', message);
    }
  });
});

const PORT = process.env.PORT || 5010;

server.listen(PORT, () => {
  console.log('Server is running', PORT);
});
