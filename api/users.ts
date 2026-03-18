import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { storage } from '../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { name, email, password_hash, avatar_url } = req.body;
      if (!name || !email || !password_hash) return res.status(400).json({ message: 'Missing fields' });
      const hashed = await bcrypt.hash(password_hash, 10);
      const user = await storage.createUser({ name, email, password_hash: hashed, avatar_url });
      res.json({ id: user.id, name: user.name, email: user.email });
    } catch (err) {
      res.status(500).json({ message: 'Signup failed', error: (err as Error).message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
