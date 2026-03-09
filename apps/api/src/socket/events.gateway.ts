import { Inject, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { eq } from 'drizzle-orm';
import { EVENTS, ROOMS } from '@loomknot/shared';
import { projectMembers, type DrizzleDB } from '@loomknot/shared/db';
import { DATABASE_TOKEN } from '../database/database.provider';
import { JwtService } from '../auth/jwt.service';

@WebSocketGateway({
  namespace: '/socket.io',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:8026',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(DATABASE_TOKEN) private readonly db: DrizzleDB,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAccessToken(token);
      client.data.userId = payload.sub;

      // Join user's personal room
      client.join(ROOMS.user(payload.sub));

      // Query user's projects and join their rooms
      const memberships = await this.db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, payload.sub));

      for (const m of memberships) {
        client.join(ROOMS.project(m.projectId));
      }

      this.logger.debug(
        `Client ${client.id} connected as user ${payload.sub}, joined ${memberships.length} project rooms`,
      );
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client ${client.id} disconnected`);
    // Socket.io handles room cleanup automatically
  }

  // --- Memory events ---
  // Private memories must only be emitted to the owner's personal room.

  @OnEvent('memory.created')
  handleMemoryCreated(payload: { projectId: string; memory: Record<string, unknown> }) {
    if (payload.memory.level === 'private' && payload.memory.userId) {
      this.server.to(ROOMS.user(payload.memory.userId as string)).emit(EVENTS.MEMORY_CREATED, payload.memory);
    } else {
      this.server.to(ROOMS.project(payload.projectId)).emit(EVENTS.MEMORY_CREATED, payload.memory);
    }
  }

  @OnEvent('memory.updated')
  handleMemoryUpdated(payload: { projectId: string; memory: Record<string, unknown> }) {
    if (payload.memory.level === 'private' && payload.memory.userId) {
      this.server.to(ROOMS.user(payload.memory.userId as string)).emit(EVENTS.MEMORY_UPDATED, payload.memory);
    } else {
      this.server.to(ROOMS.project(payload.projectId)).emit(EVENTS.MEMORY_UPDATED, payload.memory);
    }
  }

  @OnEvent('memory.deleted')
  handleMemoryDeleted(payload: { projectId: string; memoryId: string; level?: string; userId?: string }) {
    if (payload.level === 'private' && payload.userId) {
      this.server.to(ROOMS.user(payload.userId)).emit(EVENTS.MEMORY_DELETED, { id: payload.memoryId });
    } else {
      this.server.to(ROOMS.project(payload.projectId)).emit(EVENTS.MEMORY_DELETED, { id: payload.memoryId });
    }
  }

  // --- Page events ---

  @OnEvent('page.created')
  handlePageCreated(payload: { projectId: string; page: Record<string, unknown> }) {
    this.server.to(ROOMS.project(payload.projectId)).emit(EVENTS.PAGE_CREATED, payload.page);
  }

  @OnEvent('page.updated')
  handlePageUpdated(payload: { projectId: string; page: Record<string, unknown> }) {
    this.server.to(ROOMS.project(payload.projectId)).emit(EVENTS.PAGE_UPDATED, payload.page);
  }

  @OnEvent('page.deleted')
  handlePageDeleted(payload: { projectId: string; pageId: string }) {
    this.server
      .to(ROOMS.project(payload.projectId))
      .emit(EVENTS.PAGE_DELETED, { id: payload.pageId });
  }

  // --- Project events ---

  @OnEvent('project.updated')
  handleProjectUpdated(payload: { projectId: string; project: Record<string, unknown> }) {
    this.server
      .to(ROOMS.project(payload.projectId))
      .emit(EVENTS.PROJECT_UPDATED, payload.project);
  }

  @OnEvent('member.joined')
  handleMemberJoined(payload: { projectId: string; member: Record<string, unknown> }) {
    this.server.to(ROOMS.project(payload.projectId)).emit(EVENTS.MEMBER_JOINED, payload.member);
  }

  @OnEvent('member.left')
  handleMemberLeft(payload: { projectId: string; userId: string }) {
    this.server
      .to(ROOMS.project(payload.projectId))
      .emit(EVENTS.MEMBER_LEFT, { userId: payload.userId });
  }

  // --- Task events ---

  @OnEvent('task.created')
  handleTaskCreated(payload: { userId: string; task: Record<string, unknown> }) {
    this.server.to(ROOMS.user(payload.userId)).emit(EVENTS.TASK_CREATED, payload.task);
  }

  @OnEvent('task.updated')
  handleTaskUpdated(payload: { userId: string; task: Record<string, unknown> }) {
    this.server.to(ROOMS.user(payload.userId)).emit(EVENTS.TASK_UPDATED, payload.task);
  }

  // --- Negotiation events ---

  @OnEvent('negotiation.proposal')
  handleNegotiationProposal(payload: { projectId: string; option: Record<string, unknown> }) {
    this.server
      .to(ROOMS.project(payload.projectId))
      .emit(EVENTS.NEGOTIATION_PROPOSAL, payload.option);
  }

  @OnEvent('negotiation.vote')
  handleNegotiationVote(payload: { projectId: string; vote: Record<string, unknown> }) {
    this.server
      .to(ROOMS.project(payload.projectId))
      .emit(EVENTS.NEGOTIATION_VOTED, payload.vote);
  }
}
