import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { type CreateApiKeyDto, createApiKeySchema } from './api-keys.dto';

/**
 * API keys controller. User-level, JWT auth only (no ProjectMemberGuard).
 */
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  /**
   * Generate a new API key. The full key is returned ONCE in the response.
   */
  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createApiKeySchema)) dto: CreateApiKeyDto,
  ) {
    return this.apiKeys.create(user.id, dto);
  }

  /**
   * List all API keys (prefix, label, status only).
   */
  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return this.apiKeys.list(user.id);
  }

  /**
   * Revoke an API key.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param('id') keyId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.apiKeys.revoke(keyId, user.id);
  }
}
