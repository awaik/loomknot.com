import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'node:crypto';
import { and, count, eq, inArray, isNull, or } from 'drizzle-orm';
import { slugify } from '@loomknot/shared/constants';
import {
  createId,
  invites,
  memories,
  pages,
  projectMembers,
  projects,
  users,
  type DrizzleDB,
} from '@loomknot/shared/db';
import { DATABASE_TOKEN } from '../database/database.provider';
import type { CreateProjectDto, UpdateProjectDto, CreateInviteDto } from './projects.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new project and assign the creator as owner.
   */
  async create(userId: string, dto: CreateProjectDto) {
    const slug = await this.generateUniqueSlug(dto.title);
    const projectId = createId();
    const memberId = createId();

    await this.db.transaction(async (tx) => {
      await tx.insert(projects).values({
        id: projectId,
        slug,
        title: dto.title,
        description: dto.description ?? null,
        vertical: dto.vertical,
        ownerId: userId,
        isPublic: dto.isPublic,
        settings: dto.settings,
      });

      await tx.insert(projectMembers).values({
        id: memberId,
        projectId,
        userId,
        role: 'owner',
      });
    });

    return this.findById(projectId);
  }

  /**
   * List all projects where the user is a member.
   */
  async listByUser(userId: string) {
    const memberRows = await this.db
      .select({
        projectId: projectMembers.projectId,
        role: projectMembers.role,
        joinedAt: projectMembers.joinedAt,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(
        and(
          eq(projectMembers.userId, userId),
          isNull(projects.deletedAt),
        ),
      );

    if (memberRows.length === 0) return [];

    const projectIds = memberRows.map((r) => r.projectId);

    const projectRows = await this.db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        description: projects.description,
        vertical: projects.vertical,
        ownerId: projects.ownerId,
        isPublic: projects.isPublic,
        summary: projects.summary,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(
        and(
          inArray(projects.id, projectIds),
          isNull(projects.deletedAt),
        ),
      );

    // Count members per project
    const memberCounts = await this.db
      .select({
        projectId: projectMembers.projectId,
        count: count(),
      })
      .from(projectMembers)
      .where(inArray(projectMembers.projectId, projectIds))
      .groupBy(projectMembers.projectId);

    const memberCountMap = new Map(
      memberCounts.map((r) => [r.projectId, r.count]),
    );

    const roleMap = new Map(
      memberRows.map((r) => [r.projectId, { role: r.role, joinedAt: r.joinedAt }]),
    );

    return projectRows.map((p) => ({
      ...p,
      memberCount: memberCountMap.get(p.id) ?? 0,
      myRole: roleMap.get(p.id)?.role ?? null,
      joinedAt: roleMap.get(p.id)?.joinedAt ?? null,
    }));
  }

  /**
   * Get a single project with members, page count, and memory count.
   */
  async getWithDetails(projectId: string) {
    const project = await this.findById(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [members, pageCountResult, memoryCountResult] = await Promise.all([
      this.listMembers(projectId),
      this.db
        .select({ count: count() })
        .from(pages)
        .where(
          and(
            eq(pages.projectId, projectId),
            isNull(pages.deletedAt),
          ),
        ),
      this.db
        .select({ count: count() })
        .from(memories)
        .where(
          and(
            eq(memories.projectId, projectId),
            isNull(memories.deletedAt),
            or(eq(memories.level, 'project'), eq(memories.level, 'public')),
          ),
        ),
    ]);

    return {
      ...project,
      members,
      pageCount: pageCountResult[0]?.count ?? 0,
      memoryCount: memoryCountResult[0]?.count ?? 0,
    };
  }

  /**
   * Update a project (title, description, isPublic, settings).
   */
  async update(projectId: string, dto: UpdateProjectDto) {
    const values: Record<string, unknown> = {};

    if (dto.title !== undefined) values.title = dto.title;
    if (dto.description !== undefined) values.description = dto.description;
    if (dto.isPublic !== undefined) values.isPublic = dto.isPublic;
    if (dto.settings !== undefined) values.settings = dto.settings;

    if (Object.keys(values).length === 0) {
      return this.findById(projectId);
    }

    await this.db
      .update(projects)
      .set(values)
      .where(
        and(
          eq(projects.id, projectId),
          isNull(projects.deletedAt),
        ),
      );

    const updated = await this.findById(projectId);

    this.eventEmitter.emit('project.updated', { projectId, project: updated });

    return updated;
  }

  /**
   * Soft-delete a project (owner only).
   */
  async softDelete(projectId: string, userId: string) {
    const project = await this.findById(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only the project owner can delete the project');
    }

    await this.db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(eq(projects.id, projectId));
  }

  /**
   * List members of a project with user info.
   */
  async listMembers(projectId: string) {
    const rows = await this.db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        projectId: projectMembers.projectId,
        role: projectMembers.role,
        joinedAt: projectMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
        userAvatarUrl: users.avatarUrl,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, projectId));

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      projectId: row.projectId,
      role: row.role,
      joinedAt: row.joinedAt,
      user: {
        id: row.userId,
        email: row.userEmail,
        name: row.userName,
        avatarUrl: row.userAvatarUrl,
      },
    }));
  }

  /**
   * Remove a member from a project.
   * Cannot remove the owner. Cannot remove yourself (use leave instead).
   */
  async removeMember(projectId: string, targetUserId: string, actingUserId: string) {
    if (targetUserId === actingUserId) {
      throw new BadRequestException('Cannot remove yourself; use the leave endpoint instead');
    }

    const [target] = await this.db
      .select({
        role: projectMembers.role,
      })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, targetUserId),
        ),
      )
      .limit(1);

    if (!target) {
      throw new NotFoundException('Member not found in this project');
    }

    if (target.role === 'owner') {
      throw new ForbiddenException('Cannot remove the project owner');
    }

    await this.db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, targetUserId),
        ),
      );

    this.eventEmitter.emit('member.left', { projectId, userId: targetUserId });
  }

  /**
   * Create an invite for an email to join a project.
   */
  async createInvite(
    projectId: string,
    invitedByUserId: string,
    dto: CreateInviteDto,
  ) {
    // Check if user is already a member
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    if (existingUser) {
      const [existingMember] = await this.db
        .select({ id: projectMembers.id })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, existingUser.id),
          ),
        )
        .limit(1);

      if (existingMember) {
        throw new ConflictException('User is already a member of this project');
      }
    }

    // Check for existing pending invite
    const [existingInvite] = await this.db
      .select({ id: invites.id })
      .from(invites)
      .where(
        and(
          eq(invites.projectId, projectId),
          eq(invites.email, dto.email),
          eq(invites.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingInvite) {
      throw new ConflictException('A pending invite already exists for this email');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invite] = await this.db
      .insert(invites)
      .values({
        projectId,
        invitedBy: invitedByUserId,
        email: dto.email,
        role: dto.role,
        token,
        expiresAt,
      })
      .returning();

    // Send email if RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const project = await this.findById(projectId);
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const acceptUrl = `https://loomknot.com/invites/${token}`;
        const safeTitle = this.escapeHtml(project?.title ?? 'Unknown');

        await resend.emails.send({
          from: 'Loomknot <noreply@loomknot.com>',
          to: dto.email,
          subject: `You're invited to join "${project?.title}" on Loomknot`,
          html: `
            <p>You've been invited to join the project <strong>${safeTitle}</strong> on Loomknot.</p>
            <p><a href="${acceptUrl}">Accept invitation</a></p>
            <p>This invitation expires in 7 days.</p>
          `,
        });
      } catch (err) {
        this.logger.error(`Failed to send invite email to ${dto.email}`, err);
      }
    } else {
      this.logger.warn(`[DEV] Invite token for ${dto.email}: ${token}`);
    }

    return {
      id: invite!.id,
      email: invite!.email,
      role: invite!.role,
      status: invite!.status,
      expiresAt: invite!.expiresAt,
      createdAt: invite!.createdAt,
    };
  }

  /**
   * Accept an invite by token.
   */
  async acceptInvite(token: string, userId: string) {
    const [invite] = await this.db
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .limit(1);

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new BadRequestException('Invite has already been used or expired');
    }

    // Verify the authenticated user's email matches the invite recipient
    const [user] = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.email !== invite.email) {
      throw new ForbiddenException('This invite was sent to a different email address');
    }

    if (invite.expiresAt < new Date()) {
      // Mark as expired
      await this.db
        .update(invites)
        .set({ status: 'expired' })
        .where(eq(invites.id, invite.id));

      throw new BadRequestException('Invite has expired');
    }

    // Check project is not deleted
    const [project] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, invite.projectId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is already a member
    const [existingMember] = await this.db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, invite.projectId),
          eq(projectMembers.userId, userId),
        ),
      )
      .limit(1);

    if (existingMember) {
      throw new ConflictException('You are already a member of this project');
    }

    await this.db.transaction(async (tx) => {
      await tx.insert(projectMembers).values({
        projectId: invite.projectId,
        userId,
        role: invite.role,
      });

      await tx
        .update(invites)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(eq(invites.id, invite.id));
    });

    this.eventEmitter.emit('member.joined', {
      projectId: invite.projectId,
      member: { userId, role: invite.role },
    });

    return {
      projectId: invite.projectId,
      role: invite.role,
    };
  }

  // --- Private helpers ---

  private async findById(projectId: string) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    return project ?? null;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const slug = slugify(title);

    // Check if slug is unique
    const [existing] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);

    if (!existing) return slug;

    // Append random suffix
    const suffix = randomBytes(4).toString('hex');
    return `${slug.slice(0, 91)}-${suffix}`;
  }
}
