import { Global, Module } from '@nestjs/common';
import { StoreService } from './store.service';

/**
 * Global store. StoreService is created via an async factory so its init()
 * (Postgres connect + cache hydration) COMPLETES before any service that
 * injects it is instantiated — so seeding never races an empty cache.
 */
@Global()
@Module({
  providers: [
    {
      provide: StoreService,
      useFactory: async () => {
        const store = new StoreService();
        await store.init();
        return store;
      },
    },
  ],
  exports: [StoreService],
})
export class StoreModule {}
