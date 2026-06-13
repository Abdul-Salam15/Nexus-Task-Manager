import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db/index.js';
import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';
import categoriesRoutes from './routes/categories.js';
import notificationsRoutes from './routes/notifications.js';
import activityRoutes from './routes/activity.js';
import recommendationsRoutes from './routes/recommendations.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/recommendations', recommendationsRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Nexus backend listening on http://localhost:${PORT}`);
});
