import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { loadRootEnv } from './shared/env';
import { requireAuth } from './middleware/requireAuth';

loadRootEnv();

/**
 * USER SERVICE
 * - register (hash password)
 * - login (verify, return JWT)
 *
 * NOTE: In production you'd add:
 * - email verification
 * - password policy
 * - refresh tokens
 * - rate limiting
 */

const UserSchema = new mongoose.Schema(
  { email: { type: String, unique: true }, passwordHash: String },
  { timestamps: true }
);

const User = mongoose.model('User', UserSchema);

async function main() {
  await mongoose.connect(process.env.MONGO_USER_URI!);

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/auth/me', requireAuth, (req: any, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
  });
});


app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ message: 'email & password required' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });

    return res.json({ id: user.id, email: user.get('email') });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'Email already registered' });
    console.error('[user-service] register failed', e);
    return res.status(500).json({ message: 'Internal error' });
  }
});


 app.post('/auth/login', async (req, res) => {
  console.log('[user-service] JWT_SECRET length', (process.env.JWT_SECRET || '').length);

  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: 'email & password required' });

  const userDoc = await User.findOne({ email }).lean();
  if (!userDoc) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, (userDoc as any).passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const secret = process.env.JWT_SECRET!;
  const userId = (userDoc as any)._id.toString();

  const token = jwt.sign({ id: userId, email }, secret, { expiresIn: '2h' });

  // ✅ Return user minimal profile so API Gateway can send AuthPayload.user
  res.json({
    token,
    user: {
      id: userId,
      email: (userDoc as any).email,
    },
  });
});


  const port = Number(process.env.USER_PORT || 3001);
  app.listen(port, () => console.log(`User Service running on :${port}`));
}

main().catch((e) => {
  console.error('User service failed', e);
  process.exit(1);
});
