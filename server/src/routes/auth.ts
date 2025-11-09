import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import tlds from 'tlds';
import { toASCII } from 'punycode/';
import { User } from '../models/User';
import env from '../config/env';

function validateEmailAddress(rawEmail: string): boolean {
  const candidate = rawEmail.trim();
  if (!validator.isEmail(candidate, { allow_display_name: false, require_tld: true, allow_utf8_local_part: true })) {
    return false;
  }

  const domainPart = candidate.split('@')[1];
  if (!domainPart) return false;

  const withoutTrailingDot = domainPart.toLowerCase().replace(/\.+$/, '');
  if (!withoutTrailingDot) return false;

  let asciiDomain = withoutTrailingDot;
  try {
    asciiDomain = toASCII(withoutTrailingDot);
  } catch {
    return false;
  }

  const labels = asciiDomain.split('.').filter(Boolean);
  if (labels.length < 2) return false;

  const topLevel = labels[labels.length - 1];
  if (!topLevel) return false;

  return tlds.includes(topLevel);
}

const router = Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, passwordConfirmation } = req.body as { email: string; password: string; passwordConfirmation?: string };
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    if (!validateEmailAddress(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (!passwordConfirmation || password !== passwordConfirmation) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });

    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, gameId: user.gameId, automationEnabled: user.automationEnabled } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

export default router;
