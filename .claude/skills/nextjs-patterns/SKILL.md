---
name: nextjs-patterns
description: Advanced Next.js patterns and best practices. Covers Server Actions, Route Handlers, cookies handling, useSearchParams with Suspense, parallel routes, intercepting routes, streaming, and common anti-patterns to avoid. CRITICAL for server actions ('use server' directive), setting cookies from client components, form handling, and URL query parameters. Use when implementing mutations, API routes, complex routing patterns, or reviewing code for Next.js best practices.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Next.js Advanced Patterns

## TypeScript: NEVER Use `any` Type

**CRITICAL:** This codebase has `@typescript-eslint/no-explicit-any` enabled.

```typescript
// ❌ WRONG
async function handleSubmit(e: any) { ... }

// ✅ CORRECT
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) { ... }
```

---

## Part 1: Server Actions

### Basic Server Action

```typescript
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;

  if (!title) throw new Error('Title required');

  await db.posts.create({ data: { title } });
  revalidatePath('/posts');
  // No return for form actions!
}
```

### Using in Forms

**Pattern 1: Simple Form (no feedback needed)**

```typescript
// app/page.tsx
import { createPost } from './actions';

export default function Page() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

**Pattern 2: With useActionState (for feedback)**

```typescript
// app/page.tsx
'use client';

import { useActionState } from 'react';
import { createPost } from './actions';

export default function Page() {
  const [state, action, isPending] = useActionState(createPost, null);

  return (
    <form action={action}>
      <input name="title" required />
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}

// app/actions.ts
'use server';

export async function createPost(prevState: unknown, formData: FormData) {
  const title = formData.get('title') as string;

  if (!title) return { error: 'Title required' };

  await db.posts.create({ data: { title } });
  return { success: true };
}
```

### Client Component Calling Server Action

**Two-file pattern (required):**

```typescript
// app/actions.ts
'use server';

import { cookies } from 'next/headers';

export async function setTheme(theme: 'light' | 'dark') {
  const cookieStore = await cookies();
  cookieStore.set('theme', theme, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
}

// app/ThemeToggle.tsx
'use client';

import { setTheme } from './actions';

export default function ThemeToggle() {
  return (
    <button onClick={() => setTheme('dark')}>
      Dark Mode
    </button>
  );
}
```

### Server Action with Redirect

```typescript
// app/actions.ts
'use server';

import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const session = await authenticate(email);

  if (!session) throw new Error('Invalid credentials');

  const cookieStore = await cookies();
  cookieStore.set('session', session.token, { httpOnly: true });

  redirect('/dashboard');
}
```

---

## Part 2: Route Handlers (API Routes)

### Basic Route Handler

```typescript
// app/api/posts/route.ts
export async function GET() {
  const posts = await db.posts.findMany();
  return Response.json(posts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const post = await db.posts.create({ data: body });
  return Response.json(post, { status: 201 });
}
```

### Dynamic Route Handler

```typescript
// app/api/posts/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await db.posts.findUnique({ where: { id } });

  if (!post) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json(post);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.posts.delete({ where: { id } });
  return Response.json({ success: true });
}
```

### Headers and Cookies in Route Handlers

```typescript
// app/api/profile/route.ts
import { cookies, headers } from 'next/headers';

export async function GET() {
  const headersList = await headers();
  const auth = headersList.get('authorization');

  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ user: await getUser(session.value) });
}
```

### Streaming Response

```typescript
// app/api/stream/route.ts
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(encoder.encode(`data: ${i}\n\n`));
        await new Promise(r => setTimeout(r, 1000));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

---

## Part 3: useSearchParams Pattern

**CRITICAL: Requires `'use client'` AND `<Suspense>` wrapper**

```typescript
// app/search/page.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => updateParams('q', e.target.value)}
        placeholder="Search..."
      />
      <select
        value={category}
        onChange={(e) => updateParams('category', e.target.value)}
      >
        <option value="all">All</option>
        <option value="electronics">Electronics</option>
      </select>
      <p>Results for: {query} in {category}</p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
```

### Server Component Alternative

```typescript
// app/search/page.tsx - Server Component
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  const results = await search(q, category);

  return <ResultsList results={results} />;
}
```

---

## Part 4: Cookies Pattern

### Setting Cookies from Client Component

```typescript
// app/actions.ts
'use server';

import { cookies } from 'next/headers';

export async function setPreference(key: string, value: string) {
  const cookieStore = await cookies();
  cookieStore.set(key, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
}

// app/PreferenceButton.tsx
'use client';

import { setPreference } from './actions';

export default function PreferenceButton() {
  return (
    <button onClick={() => setPreference('theme', 'dark')}>
      Enable Dark Mode
    </button>
  );
}
```

### Reading Cookies

**Server Components:**
```typescript
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value || 'light';
  return <div className={theme}>Content</div>;
}
```

**Client Components (limited - non-httpOnly only):**
```typescript
'use client';

import { useEffect, useState } from 'react';

export default function ThemeDisplay() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const match = document.cookie.match(/theme=([^;]+)/);
    if (match) setTheme(match[1]);
  }, []);

  return <div>Theme: {theme}</div>;
}
```

---

## Part 5: Parallel & Intercepting Routes

### Parallel Routes

```
app/
├── dashboard/
│   ├── @analytics/
│   │   └── page.tsx
│   ├── @team/
│   │   └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
```

```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2">
        {analytics}
        {team}
      </div>
    </div>
  );
}
```

### Intercepting Routes (Modal Pattern)

```
app/
├── photos/
│   ├── [id]/
│   │   └── page.tsx      # Full photo page
│   └── page.tsx          # Photo gallery
├── @modal/
│   ├── (.)photos/
│   │   └── [id]/
│   │       └── page.tsx  # Modal photo view
│   └── default.tsx       # Return null
└── layout.tsx
```

```typescript
// app/layout.tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}

// app/@modal/(.)photos/[id]/page.tsx
import Modal from '@/components/Modal';

export default async function PhotoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const photo = await getPhoto(id);

  return (
    <Modal>
      <img src={photo.url} alt={photo.title} />
    </Modal>
  );
}

// app/@modal/default.tsx
export default function Default() {
  return null;
}
```

---

## Part 6: Anti-Patterns to Avoid

### ❌ Using useEffect for Data Fetching

```typescript
// ❌ WRONG
'use client';

export default function Posts() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(setPosts);
  }, []);

  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}

// ✅ CORRECT - Server Component
export default async function Posts() {
  const posts = await fetch('https://api.example.com/posts').then(r => r.json());
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

### ❌ Over-using 'use client'

```typescript
// ❌ WRONG - Entire page is client-side
'use client';

export default function Page() {
  return (
    <div>
      <Header />
      <StaticContent />
      <InteractiveButton />
    </div>
  );
}

// ✅ CORRECT - Only interactive part is client
export default function Page() {
  return (
    <div>
      <Header />
      <StaticContent />
      <InteractiveButton /> {/* Only this has 'use client' */}
    </div>
  );
}
```

### ❌ Serial Await (Waterfall)

```typescript
// ❌ WRONG - Sequential fetching
const user = await fetchUser();
const posts = await fetchPosts(); // Waits for user!

// ✅ CORRECT - Parallel fetching
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts(),
]);
```

### ❌ Using window.location for Navigation

```typescript
// ❌ WRONG - Full page reload
window.location.href = '/dashboard';

// ✅ CORRECT - Client-side navigation
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/dashboard');

// ✅ EVEN BETTER - Use Link
import Link from 'next/link';
<Link href="/dashboard">Go</Link>
```

### ❌ useState for Derived Values

```typescript
// ❌ WRONG
const [total, setTotal] = useState(0);
useEffect(() => {
  setTotal(products.reduce((sum, p) => sum + p.price, 0));
}, [products]);

// ✅ CORRECT - Calculate directly
const total = products.reduce((sum, p) => sum + p.price, 0);

// Or with useMemo for expensive calculations
const total = useMemo(
  () => products.reduce((sum, p) => sum + p.price, 0),
  [products]
);
```

### ❌ Missing Suspense for useSearchParams

```typescript
// ❌ WRONG - No Suspense
'use client';

export default function Page() {
  const searchParams = useSearchParams(); // Will cause issues!
  return <div>{searchParams.get('q')}</div>;
}

// ✅ CORRECT - With Suspense
'use client';

function SearchContent() {
  const searchParams = useSearchParams();
  return <div>{searchParams.get('q')}</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
```

---

## Quick Reference

### Server Actions Checklist

- [ ] File has `'use server'` at top
- [ ] Form actions return `void` (no return statement)
- [ ] Use `useActionState` when feedback needed
- [ ] Client components import actions from separate file
- [ ] Use `revalidatePath` or `revalidateTag` after mutations
- [ ] Use `redirect` for navigation after action

### Common Patterns

| Pattern | Files | Key Points |
|---------|-------|------------|
| Server Action | `actions.ts` | `'use server'`, FormData, revalidate |
| Client → Server cookie | `actions.ts` + `Component.tsx` | Two files required |
| useSearchParams | Single file | `'use client'` + `<Suspense>` |
| Route Handler | `route.ts` | HTTP methods, await params |
| Parallel Routes | `@slot/page.tsx` | Layout receives as props |
| Intercepting Routes | `(.)route/page.tsx` | Modal pattern |

### Anti-Pattern Detection Checklist

- [ ] No `useEffect` for data fetching
- [ ] No `'use client'` on static components
- [ ] No serial `await` for independent requests
- [ ] No `window.location` for navigation
- [ ] No `useState` for derived values
- [ ] Always `<Suspense>` with `useSearchParams`
