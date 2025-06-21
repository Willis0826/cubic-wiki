import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

// when in development, set the prisma client to the global prisma client
// to prevent from creating multiple instances while hot reloading
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
