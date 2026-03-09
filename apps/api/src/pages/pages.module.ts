import { Module } from '@nestjs/common';
import { ProjectPagesController, PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  controllers: [ProjectPagesController, PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
