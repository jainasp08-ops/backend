const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');

// Load environment variables
dotenv.config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 5000;
// Increase mongoose buffer timeout so first cold start doesn't fail fast
const mongooseBufferTimeoutMs = parseInt(process.env.MONGOOSE_BUFFER_TIMEOUT_MS || '30000', 10);
mongoose.set('bufferTimeoutMS', mongooseBufferTimeoutMs);

// Middleware
// Robust CORS: allow multiple origins via env, including Vercel previews
const primaryFrontendUrl = process.env.FRONTEND_URL || '';
const extraAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS || '';
const allowedOrigins = [
  'http://localhost:3000',
  primaryFrontendUrl,
  ...extraAllowedOrigins.split(',')
].map(o => o.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isExplicitlyAllowed = allowedOrigins.some(allowed => {
      if (allowed.startsWith('*.')) {
        const suffix = allowed.slice(1); // e.g. '.vercel.app'
        return origin.endsWith(suffix);
      }
      return origin === allowed;
    });
    if (isExplicitlyAllowed) return callback(null, true);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Helper to connect DB and start server only after successful connection
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '15000', 10)
    });
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Fail fast so platform restarts the service instead of hanging
    process.exit(1);
  }
}

// Routes
app.use('/api/categories', require('./routes/categories'));
app.use('/api/stock', require('./routes/stock'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Fabric Stock Management API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Kick off startup
startServer();