import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';

const roles = [
  { name: 'Owner', desc: 'Full control. Assigned automatically when you create a project.' },
  { name: 'Admin', desc: 'Same as owner, but can be revoked by the owner.' },
  { name: 'Editor', desc: 'Can edit memory, pages, and connect agents. Cannot manage project or members.' },
  { name: 'Member', desc: 'Can connect their own agent and view everything. Cannot edit content.' },
  { name: 'Viewer', desc: 'Read-only access. Cannot connect agents or edit anything.' },
] as const;

const permissions = [
  'canManageProject',
  'canManageMembers',
  'canEditMemory',
  'canConnectAgent',
  'canView',
] as const;

const permissionLabels: Record<string, string> = {
  canManageProject: 'Manage Project',
  canManageMembers: 'Manage Members',
  canEditMemory: 'Edit Memory & Pages',
  canConnectAgent: 'Connect Agent',
  canView: 'View',
};

const matrix: Record<string, boolean[]> = {
  Owner:  [true, true, true, true, true],
  Admin:  [true, true, true, true, true],
  Editor: [false, false, true, true, true],
  Member: [false, false, false, true, true],
  Viewer: [false, false, false, false, true],
};

function Allowed() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage/10">
      <Check className="h-3.5 w-3.5 text-sage" />
    </span>
  );
}

function Denied() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-alt">
      <X className="h-3.5 w-3.5 text-content-tertiary" />
    </span>
  );
}

export default function RolesPage() {
  const t = useTranslations('Docs');

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          {t('navRoles')}
        </h1>
        <p className="mt-2 text-sm text-content-secondary">
          LoomKnot uses role-based access control (RBAC) with 5 roles. Each
          role determines what a user — and their connected AI agent — can do
          in a project.
        </p>
      </section>

      {/* Permissions Matrix */}
      <section>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left">
                <th className="px-4 py-3 font-medium text-content-secondary">
                  Permission
                </th>
                {roles.map((r) => (
                  <th
                    key={r.name}
                    className="px-4 py-3 text-center font-medium text-content"
                  >
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-elevated">
              {permissions.map((perm, pi) => (
                <tr key={perm}>
                  <td className="px-4 py-3 text-content-secondary">
                    {permissionLabels[perm]}
                  </td>
                  {roles.map((r) => (
                    <td key={r.name} className="px-4 py-3">
                      <div className="flex justify-center">
                        {matrix[r.name][pi] ? <Allowed /> : <Denied />}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Role descriptions */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-content">Role Details</h2>
        {roles.map((role) => (
          <div
            key={role.name}
            className="rounded-md border border-border bg-surface-elevated p-4"
          >
            <h3 className="text-sm font-semibold text-content">{role.name}</h3>
            <p className="mt-1 text-sm text-content-secondary">{role.desc}</p>
          </div>
        ))}
      </section>

      {/* Agent permissions note */}
      <section className="rounded-md border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold text-content mb-2">
          Agent Permissions
        </h3>
        <p className="text-sm text-content-secondary leading-relaxed">
          When a user connects an AI agent via MCP, the agent operates with
          exactly the same permissions as the user. If you are an Editor, your
          agent can edit memory and pages but cannot manage members. If you are
          a Viewer, your agent can only read data.
        </p>
        <p className="mt-2 text-sm text-content-secondary leading-relaxed">
          Private memories are always isolated — even an Admin&rsquo;s agent
          cannot see another user&rsquo;s private memories.
        </p>
      </section>
    </div>
  );
}
