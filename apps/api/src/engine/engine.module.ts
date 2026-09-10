import { Global, Module } from '@nestjs/common';
import { SantaraEngine, loadAgentsConfig } from '@santara/agents';

export const SANTARA_ENGINE = 'SANTARA_ENGINE';

@Global()
@Module({
  providers: [
    {
      provide: SANTARA_ENGINE,
      useFactory: () => new SantaraEngine(loadAgentsConfig()),
    },
  ],
  exports: [SANTARA_ENGINE],
})
export class EngineModule {}
