function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error('APP_URL environment variable is required');
  return url.replace(/\/+$/, '');
}

export function projectUrl(projectId: string): string {
  return `${getAppUrl()}/app/projects/${projectId}`;
}

export function pageUrl(projectId: string, pageId: string): string {
  return `${getAppUrl()}/app/projects/${projectId}/pages/${pageId}`;
}
