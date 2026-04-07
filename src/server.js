import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
dotenv.config();

import authRoutes from './routes/auth.routes.js'
import messageRoutes from './routes/message.routes.js'
import friendRoutes from './routes/friend.routes.js'
import { app, server } from './lib/socket.js';


const PORT = process.env.PORT || 8080;
const CLIENT_ORIGINS = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);


// const app = express();
const REQUEST_BODY_LIMIT = '10mb';

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (CLIENT_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));
app.use(cookieParser());

app.get('/api/health', (_, res) => {
  res.status(200).json({ ok: true, service: 'chat-app-server' });
});

app.use('/api/auth',authRoutes);
app.use('/api/message',messageRoutes);
app.use('/api/friend',friendRoutes);

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server is Listening on port ${PORT}`);
  });
};

startServer();