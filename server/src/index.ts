import express from 'express';
import cors from 'cors';
import env from './config/env';
import { connectDB } from './db/connection';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import giftRoutes from './routes/gift';
import adminRoutes from './routes/admin';
import profileRoutes from './routes/profile';
import aiRoutes from './routes/ai';
import allianceRoutes from './routes/alliance';
import { startAutoRedeemCron } from './cron/autoRedeem';

async function bootstrap() {
  await connectDB();

  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/gift', giftRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/alliance', allianceRoutes);

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });

  if (env.ENABLE_CRON) {
    startAutoRedeemCron();
  }

  return server;
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
