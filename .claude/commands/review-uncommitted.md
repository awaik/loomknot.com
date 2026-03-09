---
allowed-tools: Bash(git diff:*), Bash(git status:*)
description: Code review незакоммиченных изменений (fullstack)
---

Выполни команду и проанализируй результат:
```bash
git diff
```

Если нет вывода, проверь staged:
```bash
git diff --cached
```

---

Ты senior fullstack разработчик. Проведи ревью для **Aura Monorepo** (Backend: Node.js + Express + Firestore, Frontend: Next.js 15 + React 19 + Redux + Tailwind v4).

## Определи scope изменений

По путям файлов определи что изменено:
- `apps/backend/**` → применяй **Backend правила**
- `apps/frontend/**` → применяй **Frontend правила**
- `packages/shared/**` → проверяй совместимость с обоими apps

---

## 🔴 Общие проверки (оба apps)

**Безопасность**
- XSS, SQL/NoSQL injection
- Утечки токенов/secrets в логи или URL
- Данные пользователя изолированы между аккаунтами

**Архитектура**
- Файл > 500 строк — требуется рефакторинг
- Функции > 50 строк — разбить
- `console.log/debug` → использовать `Logger` (backend) / `createLogger` (frontend)

**Качество**
- `any` без причины
- Magic numbers вместо констант
- Дублирование кода
- null/undefined без проверки

---

## 📦 Backend правила (`apps/backend`)

**Слои**
- Controller содержит только HTTP handling, бизнес-логика в Service
- Repository содержит только DB запросы, логика в Service
- Auth middleware явно per route: `router.get("/", authenticateUser, handler)`, НЕ `router.use()`

**Firestore**
- Cursor-based пагинация, НЕ offset
- `Timestamp.fromDate()` для дат, НЕ `new Date()`
- `.count().get()` для подсчёта, НЕ загрузка всех документов

**AI**
- `MODEL_IDS.*` для моделей, НЕ строки `"google/gemini-..."`
- Safety только через AI, НИКОГДА regex/списки слов
- `OpenRouterClient` — НЕ отдельные клиенты

**SSE**
- `res.flush()` после каждого `res.write()`

---

## 🎨 Frontend правила (`apps/frontend`)

**Auth & State**
- `useAuthRedux()` вместо устаревшего `useAuth` из domains
- `tokenRefreshManager.getToken()` вместо прямого Firebase
- Правильное использование Redux slices

**Тема и стили**
- Semantic токены (`figma-content-*`, `figma-bg-*`) вместо примитивных (`figma-gray-*`)
- Нет `dark:` префиксов — только semantic токены
- Нет хардкодных цветов — только CSS токены из `tokens.css`

**UI**
- Кнопки имеют `cursor-pointer`
- ЗАПРЕЩЕНЫ `alert()`, `confirm()`, `prompt()` — использовать toast/модалки
- Иконки только из `lucide-react`
- Слово "AI" → "Аура" или "ИИ-Психолог Аура"

**Компоненты**
- > 5 useState или > 3 useEffect — разбить на хуки
- Routes должны быть тонкими обёртками (импорт из domains)
- Admin API методы содержат `Admin` в названии

---

## 🐛 Баги (оба apps)

- Race conditions в async коде
- Отсутствие loading/error состояний
- Пустые массивы без обработки
- Неправильная обработка ошибок

---

## Формат ответа

**🔴 CRITICAL** — блокеры, безопасность, потеря данных

**🟡 MAJOR** — баги, архитектурные проблемы, нарушения CLAUDE.md

**🟢 MINOR** — стиль, оптимизации

Будь кратким. Указывай конкретные строки и что исправить.
