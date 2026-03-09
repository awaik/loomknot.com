import { Module } from '@nestjs/common';
import { ProjectsController, InvitesController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController, InvitesController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
