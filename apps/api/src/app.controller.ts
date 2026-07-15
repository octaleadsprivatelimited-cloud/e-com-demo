import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { StoreService } from './common/store.service';

@Controller()
export class AppController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly appService: AppService,
    private readonly store: StoreService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Liveness/readiness probe. Load balancers and orchestrators poll this and
   * auto-route traffic away from (or restart) an instance that stops returning
   * "ok" — self-healing at the infrastructure layer.
   */
  @Get('health')
  health() {
    let storeOk = true;
    try {
      this.store.read('candidates');
    } catch {
      storeOk = false;
    }
    return {
      status: storeOk ? 'ok' : 'degraded',
      store: storeOk ? 'up' : 'down',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
