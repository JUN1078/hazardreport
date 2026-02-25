import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database';
import { generateToken } from '../middleware/auth';
import { User } from '../types';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password, full_name, role } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const validRoles = ['hse_officer', 'project_manager', 'supervisor', 'auditor', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'hse_officer';

    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, role, full_name) VALUES (?, ?, ?, ?, ?)'
    ).run(username, email, password_hash, userRole, full_name || null);

    const user = db.prepare('SELECT id, username, email, role, full_name, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid) as Omit<User, 'password_hash'>;

    const token = generateToken({ id: user.id, username: user.username, role: user.role });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .get(username, username) as User | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    const { password_hash, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'safevision-secret-key-change-in-production') as { id: number };
    const user = db.prepare('SELECT id, username, email, role, full_name, created_at FROM users WHERE id = ?')
      .get(payload.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
});

export default router;
