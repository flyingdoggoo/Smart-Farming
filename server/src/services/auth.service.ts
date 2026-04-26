import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface RegisterInput {
  fname: string;
  username: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

function generateToken(userId: number, username: string): string {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: 604800 } // 7 days
  );
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { username: input.username } });
  if (existing) {
    throw { status: 409, message: 'Username đã tồn tại' };
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: { fname: input.fname, username: input.username, password: hashedPassword },
  });

  const token = generateToken(user.id, user.username);
  return { token, user: { id: user.id, fname: user.fname, username: user.username } };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  if (!user) {
    throw { status: 401, message: 'Sai username hoặc password' };
  }

  const validPassword = await bcrypt.compare(input.password, user.password);
  if (!validPassword) {
    throw { status: 401, message: 'Sai username hoặc password' };
  }

  const token = generateToken(user.id, user.username);
  return { token, user: { id: user.id, fname: user.fname, username: user.username } };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fname: true, username: true },
  });

  if (!user) {
    throw { status: 404, message: 'User không tồn tại' };
  }

  return user;
}
