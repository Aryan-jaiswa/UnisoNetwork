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
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching groups', error: (err as Error).message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, category, privacy, created_by, max_members } = req.body;
      if (!name || !description || !category || !privacy || !created_by) {
        return res.status(400).json({ message: 'Missing fields' });
      }
      const group = await storage.createGroup({ name, description, category, privacy, created_by: Number(created_by), max_members: max_members ? Number(max_members) : undefined });
      res.json(group);
    } catch (err) {
      res.status(500).json({ message: 'Error creating group', error: (err as Error).message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
