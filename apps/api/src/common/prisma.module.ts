import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient, PrismaClient } from '@bottomup/db';

export const PRISMA = Symbol('PRISMA');

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      useFactory: (): PrismaClient => createPrismaClient(),
    },
  ],
  exports: [PRISMA],
})
export class PrismaModule implements OnModuleDestroy {
  constructor() {
    // Module-level lifecycle is fine; process exit closes the pool.
  }
  async onModuleDestroy(): Promise<void> {
    // Prisma connection cleanup on graceful shutdown is handled implicitly.
  }
}
