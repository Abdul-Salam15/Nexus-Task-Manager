import client from './client';

export interface Recommendation {
  icon: string;
  tone: 'crimson' | 'amber' | 'green' | 'violet';
  title: string;
  body: string;
  actionLabel: string | null;
  actionType: string;
  taskId?: string;
}

export const recommendationsApi = {
  status: () => client.get<{ enabled: boolean }>('/recommendations/status'),
  generate: () => client.post<{ recommendations: Recommendation[]; source: 'gemini' | 'heuristic'; error?: string }>('/recommendations/generate'),
};
