import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
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
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url } });
    } catch (err) {
      res.status(500).json({ message: 'Login failed', error: (err as Error).message });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
