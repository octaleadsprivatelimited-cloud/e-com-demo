import { Global, Module } from '@nestjs/common';
import { EntityRepository } from './entity.repository';

/**
 * Global per-row entity store. Provided via an async factory so its init()
 * (table + indexes + one-time migration) completes before any service uses it.
 */
@Global()
@Module({
  providers: [
    {
      provide: EntityRepository,
      useFactory: async () => {
        const repo = new EntityRepository();
        await repo.init();
        return repo;
      },
    },
  ],
  exports: [EntityRepository],
})
export class EntityModule {}
