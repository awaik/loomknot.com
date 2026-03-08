---
name: nextjs-fundamentals
description: Comprehensive guide for Next.js App Router fundamentals. Covers layouts, routing, metadata, Server vs Client Components, dynamic routes ([id], [slug], [...slug]), params handling, data fetching in server components, and migration from Pages Router. Use when building Next.js 15+ applications, creating pages with URL parameters, choosing between Server and Client Components, or setting up App Router structure.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Next.js App Router Fundamentals

## TypeScript: NEVER Use `any` Type

**CRITICAL:** This codebase has `@typescript-eslint/no-explicit-any` enabled. Using `any` will cause build failures.

```typescript
// ❌ WRONG
function Page({ params }: any) { ... }

// ✅ CORRECT
function Page({ params }: { params: Promise<{ id: string }> }) { ... }
```

---

## Part 1: App Router Structure

### File Conventions

| File | Purpose |
|------|---------|
| `page.tsx` | UI unique to a route (makes route publicly accessible) |
| `layout.tsx` | Shared UI for a segment and its children |
| `loading.tsx` | Loading UI (automatic Suspense boundary) |
| `error.tsx` | Error UI (automatic error boundary) |
| `not-found.tsx` | Not found UI |
| `route.ts` | API endpoint (Route Handler) |
| `template.tsx` | Re-rendered layout (no state persistence) |

### Basic Structure

```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # Home page (/)
├── about/
│   └── page.tsx        # About page (/about)
├── blog/
│   ├── page.tsx        # Blog list (/blog)
│   └── [slug]/
│       └── page.tsx    # Blog post (/blog/my-post)
└── api/
    └── hello/
        └── route.ts    # API route (/api/hello)
```

### Root Layout (Required)

```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Metadata

```typescript
// Static metadata
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My App',
  description: 'App description',
};

// Dynamic metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post.title };
}
```

---

## Part 2: Server vs Client Components

### Default: Server Components

Components are Server Components by default in App Router. They can:
- Fetch data directly (async/await)
- Access backend resources
- Keep sensitive data on server
- Reduce client-side JavaScript

```typescript
// app/posts/page.tsx - Server Component (default)
export default async function PostsPage() {
  const posts = await db.posts.findMany(); // Direct DB access!

  return (
    <ul>
      {posts.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  );
}
```

### When to Use Client Components

Add `'use client'` only when you need:

| Need | Use Client Component |
|------|---------------------|
| Event handlers (onClick, onChange) | ✅ Yes |
| useState, useEffect, useRef | ✅ Yes |
| Browser APIs (window, document) | ✅ Yes |
| Third-party client libraries | ✅ Yes |
| Static rendering, data fetching | ❌ No (Server) |

```typescript
// components/Counter.tsx - Client Component
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}
```

### Composition Pattern

Keep `'use client'` boundary as low as possible:

```typescript
// app/page.tsx - Server Component (NO 'use client')
import Counter from './Counter';

export default async function Page() {
  const data = await fetchData(); // Server-side fetch

  return (
    <div>
      <h1>{data.title}</h1>
      <Counter /> {/* Only this is client-side */}
    </div>
  );
}
```

### Passing Server Components to Client Components

```typescript
// ✅ CORRECT - Use children/slots pattern
// ParentServer.tsx (Server Component)
import ClientWrapper from './ClientWrapper';
import ServerContent from './ServerContent';

export default function ParentServer() {
  return (
    <ClientWrapper>
      <ServerContent /> {/* Stays server-side! */}
    </ClientWrapper>
  );
}

// ClientWrapper.tsx
'use client';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <div className="wrapper">{children}</div>;
}
```

---

## Part 3: Dynamic Routes

### Route Syntax

| Pattern | Example URL | Params |
|---------|------------|--------|
| `[id]` | `/123` | `{ id: '123' }` |
| `[slug]` | `/hello-world` | `{ slug: 'hello-world' }` |
| `[...slug]` | `/a/b/c` | `{ slug: ['a', 'b', 'c'] }` |
| `[[...slug]]` | `/` or `/a/b` | `{ slug: undefined }` or `{ slug: ['a', 'b'] }` |

### Avoid Over-Nesting

**Default to simple routes unless explicitly required:**

```typescript
// ❌ UNNECESSARY NESTING
// app/products/[id]/page.tsx → /products/123

// ✅ SIMPLER (when not specified)
// app/[id]/page.tsx → /123
```

Only nest when the URL structure is explicitly specified in requirements.

### Accessing Params (Next.js 15+)

**CRITICAL: `params` is a Promise in Next.js 15+**

```typescript
// app/[id]/page.tsx
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // Must await!

  const product = await fetch(`https://api.example.com/products/${id}`)
    .then(res => res.json());

  return <div>{product.name}</div>;
}
```

### In Client Components - Use useParams

```typescript
// components/ProductClient.tsx
'use client';

import { useParams } from 'next/navigation';

export default function ProductClient() {
  const params = useParams<{ id: string }>();
  return <div>Product ID: {params.id}</div>;
}
```

### Generate Static Params

```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(post => ({ slug: post.slug }));
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // ...
}
```

### Catch-All Routes

```typescript
// app/docs/[...slug]/page.tsx
export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = slug.join('/'); // ['getting-started', 'install'] → 'getting-started/install'

  return <div>Path: {path}</div>;
}
```

---

## Part 4: Data Fetching

### Server Components (Recommended)

```typescript
// app/posts/page.tsx
export default async function Posts() {
  // Direct fetch - no useEffect needed!
  const posts = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 }, // Cache for 1 hour
  }).then(res => res.json());

  return <PostList posts={posts} />;
}
```

### Fetch Options

```typescript
// Always fresh (like getServerSideProps)
fetch(url, { cache: 'no-store' });

// Cached (like getStaticProps)
fetch(url, { cache: 'force-cache' });

// Revalidate periodically
fetch(url, { next: { revalidate: 60 } }); // 60 seconds

// Revalidate on-demand via tags
fetch(url, { next: { tags: ['posts'] } });
// Then: revalidateTag('posts')
```

### Parallel Data Fetching

```typescript
// ❌ WRONG - Sequential (slow)
const user = await fetchUser();
const posts = await fetchPosts();

// ✅ CORRECT - Parallel (fast)
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts(),
]);
```

### With Suspense

```typescript
import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<UserSkeleton />}>
        <UserInfo />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <RecentPosts />
      </Suspense>
    </div>
  );
}

async function UserInfo() {
  const user = await fetchUser();
  return <div>{user.name}</div>;
}
```

---

## Part 5: Navigation

### Link Component (Server & Client)

```typescript
import Link from 'next/link';

export default function Nav() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href={`/posts/${postId}`}>View Post</Link>
    </nav>
  );
}
```

### Programmatic Navigation

**Server Components - use redirect():**

```typescript
import { redirect } from 'next/navigation';

export default async function Page() {
  const user = await getUser();
  if (!user) redirect('/login');
  return <div>Welcome, {user.name}</div>;
}
```

**Client Components - use useRouter():**

```typescript
'use client';

import { useRouter } from 'next/navigation';

export default function LoginButton() {
  const router = useRouter();

  const handleLogin = async () => {
    await login();
    router.push('/dashboard');
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

---

## Part 6: Handling Errors & Loading

### Loading UI

```typescript
// app/posts/loading.tsx
export default function Loading() {
  return <div className="skeleton">Loading posts...</div>;
}
```

### Error Handling

```typescript
// app/posts/error.tsx
'use client'; // Must be client component!

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Not Found

```typescript
// app/posts/[id]/page.tsx
import { notFound } from 'next/navigation';

export default async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) notFound();

  return <div>{post.title}</div>;
}

// app/posts/[id]/not-found.tsx
export default function NotFound() {
  return <div>Post not found</div>;
}
```

---

## Quick Reference

### Server vs Client Decision Tree

```
Need to...
├─ Fetch data → Server Component
├─ Access DB/backend → Server Component
├─ Use hooks (useState, useEffect) → Client Component
├─ Handle events (onClick) → Client Component
├─ Use browser APIs → Client Component
└─ Render static content → Server Component
```

### Common Patterns Checklist

- [ ] No `'use client'` unless hooks/events needed
- [ ] `params` is `Promise<{...}>` in Next.js 15+
- [ ] Always `await params` before accessing
- [ ] Use `Promise.all` for parallel fetches
- [ ] Add Suspense boundaries for slow data
- [ ] Keep route structure simple unless specified
- [ ] Use `notFound()` for missing resources
- [ ] Never use `any` type
