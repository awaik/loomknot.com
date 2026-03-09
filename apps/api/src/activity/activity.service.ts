import { Inject, Injectable, Logger } from '@nestjs/common';
import { activityLog, type DrizzleDB } from '@loomknot/shared/db';
import { DATABASE_TOKEN } from '../database/database.provider';

export interface LogActivityParams {
  projectId: string;
  userId?: string;
  apiKeyId?: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(@Inject(DATABASE_TOKEN) private readonly db: DrizzleDB) {}

  async log(params: LogActivityParams): Promise<void> {
    try {
      await this.db.insert(activityLog).values(params);
    } catch (err) {
      this.logger.error(`Failed to log activity: ${(err as Error).message}`, (err as Error).stack);
    }
  }
}
