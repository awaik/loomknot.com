import { Module } from '@nestjs/common';
import {
  ProjectNegotiationsController,
  NegotiationsController,
  NegotiationOptionsController,
} from './negotiations.controller';
import { NegotiationsService } from './negotiations.service';

@Module({
  controllers: [
    ProjectNegotiationsController,
    NegotiationsController,
    NegotiationOptionsController,
  ],
  providers: [NegotiationsService],
  exports: [NegotiationsService],
})
export class NegotiationsModule {}
