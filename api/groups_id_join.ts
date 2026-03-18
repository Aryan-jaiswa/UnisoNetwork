import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { storage } from '../server/storage';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: 'Missing token' });
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      await storage.joinGroup(decoded.id, Number(req.query.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: 'Error joining group', error: (err as Error).message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
