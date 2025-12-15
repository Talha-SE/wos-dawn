import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import env from './config/env';
import { connectDB } from './db/connection';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import giftRoutes from './routes/gift';
import adminRoutes from './routes/admin';
import profileRoutes from './routes/profile';
import aiRoutes from './routes/ai';
import allianceRoutes from './routes/alliance';
import slotsRoutes from './routes/slots';
import supportRoutes from './routes/support';
import notificationRoutes from './routes/notification';
import { startAutoRedeemCron } from './cron/autoRedeem';
import { startSlotResetCron } from './cron/resetSlots';
import { startMessageCleanupCron } from './cron/cleanOldMessages';
import { startTranslationCleanup } from './cron/cleanOldTranslations';
import { initializeTranslationQueue } from './services/translationQueue';
import path from 'path';
import fs from 'fs';

async function bootstrap() {
  await connectDB();

  // Log admin configuration on startup
  console.log('Admin Configuration:', {
    ADMIN_EMAIL: env.ADMIN_EMAIL || '(not set)',
    ADMIN_PASSWORD_SET: !!env.ADMIN_PASSWORD,
    ADMIN_PASSWORD_LENGTH: env.ADMIN_PASSWORD?.length || 0
  });

  // Create uploads directory if it doesn't exist
  const uploadDir = path.join(__dirname, '../public/uploads/voice-messages');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created uploads directory at ${uploadDir}`);
  }

  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());

  // File upload middleware
  app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
  }));

  // Serve static files from the public directory
  app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/gift', giftRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/alliance', allianceRoutes);
  app.use('/api/slots', slotsRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api', notificationRoutes);

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });

  // Initialize translation queue (loads pending translations)
  await initializeTranslationQueue();

  if (env.ENABLE_CRON) {
    startAutoRedeemCron();
    startSlotResetCron();
    startMessageCleanupCron();
    startTranslationCleanup();
  }

  return server;
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
