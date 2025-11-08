import dotenv from 'dotenv';
dotenv.config();

const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  ADMIN_SECRET: process.env.ADMIN_SECRET || '',
  WOS_PLAYER_URL: process.env.WOS_PLAYER_URL || 'https://wos-giftcode-api.centurygame.com/api/player',
  WOS_GIFT_URL: process.env.WOS_GIFT_URL || 'https://wos-giftcode-api.centurygame.com/api/gift_code',
  ENABLE_CRON: (process.env.ENABLE_CRON || 'true').toLowerCase() !== 'false',
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || ''
};

export default env;
