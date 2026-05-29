import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const initDb = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully (PostgreSQL via Prisma).');
  } catch (error: any) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};
