import { Module } from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { MemoriesController, MemoryItemController } from './memories.controller';
import { ContextService } from './context.service';

@Module({
  controllers: [MemoriesController, MemoryItemController],
  providers: [MemoriesService, ContextService],
  exports: [MemoriesService, ContextService],
})
export class MemoriesModule {}
