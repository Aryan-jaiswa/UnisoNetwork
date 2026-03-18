import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const forums = await storage.getForumThreads();
      res.json(forums);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching forums', error: (err as Error).message });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, content, category, created_by, tags } = req.body;
      if (!title || !content || !category || !created_by) {
        return res.status(400).json({ message: 'Missing fields' });
      }
      const forum = await storage.createForumThread({ title, content, category, created_by: Number(created_by), tags });
      res.json(forum);
    } catch (err) {
      res.status(500).json({ message: 'Error creating forum', error: (err as Error).message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
