import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtService],
})
export class AuthModule {}
