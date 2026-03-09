'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  type ApiKeyCreateResponse,
} from '@/hooks/use-api-keys';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const { data: apiKeys, isLoading } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();
  const [newKey, setNewKey] = useState<ApiKeyCreateResponse | null>(null);
  const [label, setLabel] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createApiKey.mutateAsync(
        label.trim() ? { label: label.trim() } : undefined,
      );
      setNewKey(result);
      setLabel('');
      setShowCreateForm(false);
    } catch {
      // Error state available via createApiKey.error
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey.mutateAsync(id);
      setRevokeConfirm(null);
    } catch {
      // Error state available via revokeApiKey.error
    }
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      {/* API Keys */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-content">
              {t('apiKeys')}
            </h2>
            <p className="mt-1 text-sm text-content-secondary">
              {t('apiKeysDesc')}
            </p>
          </div>
          <button
            onClick={() => { createApiKey.reset(); setShowCreateForm(true); }}
            className="flex items-center gap-2 rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-thread-dark"
          >
            <Plus className="h-4 w-4" />
            {t('generateKey')}
          </button>
        </div>

        {/* Newly created key banner */}
        {newKey && (
          <div className="mb-4 rounded-md border border-sage/30 bg-success-soft p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 shrink-0 text-sage mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-content">
                  {t('keyCreated')}
                </p>
                <p className="mt-1 text-xs text-content-secondary">
                  {t('keyCreatedDesc')}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-sm bg-surface px-3 py-2 text-sm font-mono text-content break-all border border-border">
                    {newKey.key}
                  </code>
                  <button
                    onClick={() => handleCopy(newKey.key)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-surface transition-colors hover:bg-surface-alt"
                    title="Copy key"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-sage" />
                    ) : (
                      <Copy className="h-4 w-4 text-content-secondary" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setNewKey(null)}
                  className="mt-2 text-xs text-content-tertiary transition-colors hover:text-content-secondary"
                >
                  {t('dismiss')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <div className="mb-4 rounded-md border border-border bg-surface-elevated p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="key-label"
                    className="block text-sm font-medium text-content mb-1.5"
                  >
                    {t('labelOptional')}
                  </label>
                  <input
                    id="key-label"
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={t('labelPlaceholder')}
                    autoFocus
                    className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-content-tertiary transition-colors focus:border-border-focus focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); createApiKey.reset(); }}
                  className="rounded-sm px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-alt"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createApiKey.isPending}
                  className={cn(
                    'rounded-sm bg-thread px-4 py-2 text-sm font-medium text-white transition-colors',
                    'hover:bg-thread-dark',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {createApiKey.isPending ? t('generating') : t('generate')}
                </button>
              </div>
              {createApiKey.isError && (
                <p className="text-sm text-error">
                  {t('createError')}
                </p>
              )}
            </form>
          </div>
        )}

        {/* Keys list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-md bg-surface-alt animate-pulse"
              />
            ))}
          </div>
        ) : !apiKeys || apiKeys.length === 0 ? (
          <EmptyState
            icon={Key}
            title={t('noKeysTitle')}
            description={t('noKeysDesc')}
          />
        ) : (
          <div className="space-y-2">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-4 py-3"
              >
                <Key className="h-4 w-4 shrink-0 text-content-tertiary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-content">
                      {apiKey.keyPrefix}...
                    </code>
                    {apiKey.label && (
                      <span className="text-sm text-content-secondary">
                        {apiKey.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-content-tertiary">
                    <span>
                      {t('created')}{' '}
                      {new Date(apiKey.createdAt).toLocaleDateString()}
                    </span>
                    {apiKey.lastUsedAt && (
                      <span>
                        {t('lastUsed')}{' '}
                        {new Date(apiKey.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <StatusBadge status={apiKey.status} />

                {apiKey.status === 'active' && (
                  <>
                    {revokeConfirm === apiKey.id ? (
                      <div className="flex items-center gap-1.5">
                        {revokeApiKey.isError && (
                          <span className="text-xs text-error">{t('revokeError')}</span>
                        )}
                        <button
                          onClick={() => handleRevoke(apiKey.id)}
                          disabled={revokeApiKey.isPending}
                          className="rounded-sm bg-error px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-50"
                        >
                          {t('confirm')}
                        </button>
                        <button
                          onClick={() => setRevokeConfirm(null)}
                          className="rounded-sm px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-alt"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevokeConfirm(apiKey.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-content-tertiary transition-colors hover:bg-surface-alt hover:text-error"
                        title="Revoke key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
