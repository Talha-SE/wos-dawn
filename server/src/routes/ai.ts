import { Router } from 'express';
import axios from 'axios';
import { requireAuth, AuthRequest } from '../middleware/auth';
import env from '../config/env';

const router = Router();

router.post('/chat', requireAuth, async (req: AuthRequest, res) => {
  const apiKey = env.MISTRAL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'MISTRAL_API_KEY not configured on server' });
  }

  try {
    const { messages, toolsEnabled } = req.body as {
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      toolsEnabled?: { web_search?: boolean; image_generation?: boolean };
    };

    const inputs = (messages || []).map((m) => ({ role: m.role, content: m.content }));

    const tools: Array<{ type: 'image_generation' | 'web_search' }> = [];
    if (toolsEnabled?.image_generation) tools.push({ type: 'image_generation' });
    if (toolsEnabled?.web_search) tools.push({ type: 'web_search' });

    const body = {
      model: 'mistral-small-latest',
      inputs,
      tools,
      completion_args: {
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
      },
      stream: false,
      instructions: 'you are sassy chatting model, your name is sassy',
    };

    const { data } = await axios.post('https://api.mistral.ai/v1/conversations', body, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      timeout: 60000,
    });

    return res.json(data);
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const err = e?.response?.data || { message: e?.message || 'Upstream error' };
    return res.status(status).json(err);
  }
});

router.post('/transcribe', requireAuth, async (req: AuthRequest, res) => {
  const apiKey = env.MISTRAL_API_KEY;
  if (!apiKey) return res.status(500).json({ message: 'MISTRAL_API_KEY not configured on server' });

  try {
    const { audioBase64, mimeType, fileName, sourceLanguage } = req.body as {
      audioBase64: string;
      mimeType?: string;
      fileName?: string;
      sourceLanguage?: string;
    };
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ message: 'audioBase64 (base64 string) is required' });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    const blob = new Blob([buffer], { type: mimeType || 'audio/webm' });
    const fd = new FormData();
    fd.append('file', blob, fileName || 'audio.webm');
    fd.append('model', 'voxtral-mini-transcribe-2507');
    fd.append('response_format', 'json');

    const map: Record<string, string> = {
      english: 'en', spanish: 'es', french: 'fr', german: 'de', italian: 'it', portuguese: 'pt', russian: 'ru',
      chinese: 'zh', japanese: 'ja', korean: 'ko', arabic: 'ar', hindi: 'hi', urdu: 'ur', bengali: 'bn', turkish: 'tr',
      dutch: 'nl', polish: 'pl', thai: 'th', vietnamese: 'vi', greek: 'el', hebrew: 'he', swedish: 'sv', norwegian: 'no',
      danish: 'da', finnish: 'fi', czech: 'cs', hungarian: 'hu', romanian: 'ro', indonesian: 'id', malay: 'ms', tagalog: 'tl', swahili: 'sw'
    };
    const hint = (sourceLanguage || '').toLowerCase();
    if (hint && hint !== 'autodetect') {
      const iso = map[hint] || hint;
      fd.append('language', iso);
    }

    const upstream = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: fd,
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      return res.status(upstream.status).json({ message: t || 'Upstream error' });
    }
    const data = await upstream.json();
    return res.json({ text: data?.text || '', language: data?.language || 'unknown' });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Transcription failed' });
  }
});

export default router;
