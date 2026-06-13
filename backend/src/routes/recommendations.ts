import { Router } from 'express';
import { db } from '../db/index.js';
import { toTaskJson } from '../lib/serialize.js';
import { requireAuth } from '../middleware/auth.js';
import { geminiRecommend, heuristicRecommend, isGeminiConfigured } from '../lib/recommendations.js';

const router = Router();
router.use(requireAuth);

router.get('/status', (_req, res) => {
  res.json({ enabled: isGeminiConfigured() });
});

router.post('/generate', async (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY order_index ASC').all(req.userId!).map(toTaskJson);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId!) as any;
  const firstName = (user?.full_name || '').split(/\s+/)[0] || 'there';

  if (isGeminiConfigured()) {
    try {
      const recommendations = await geminiRecommend(rows as any, firstName);
      return res.json({ recommendations, source: 'gemini' });
    } catch (err: any) {
      if (err?.message !== 'NO_KEY') {
        return res.json({ recommendations: heuristicRecommend(rows as any), source: 'heuristic', error: err.message });
      }
    }
  }

  res.json({ recommendations: heuristicRecommend(rows as any), source: 'heuristic' });
});

export default router;
