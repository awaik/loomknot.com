# Рефакторинг файла

Проведи рефакторинг файла: $ARGUMENTS

Ты senior fullstack разработчик. Проведи рефакторинг указанного файла согласно архитектуре проекта.

## Процесс

### 1. Анализ (НЕ редактируй пока)
- Прочитай файл целиком
- Определи **app**: `apps/backend` или `apps/frontend`
- Определи тип файла (см. таблицу ниже)
- Посчитай строки и найди проблемы:
  - Файл > 450 строк
  - Функции > 50 строк
  - **Frontend**: > 5 useState, > 3 useEffect, JSX > 150 строк
  - **Backend**: контроллер содержит бизнес-логику, сервис содержит SQL/Firestore запросы
  - Смешанная ответственность

### 2. План рефакторинга
Создай TaskCreate с конкретными шагами. Покажи пользователю что планируешь сделать.

### 3. Выполнение
Разбей файл по правилам для соответствующего app.

---

## 📁 Frontend (`apps/frontend`)

**Структура фичи:**
```
domains/client/features/{feature}/
  index.ts              # только реэкспорт
  {Feature}.tsx         # главный компонент (тонкий оркестратор)
  {feature}.api.ts      # HTTP запросы
  {feature}.types.ts    # interfaces, types, enums
  {feature}.constants.ts
  components/           # подкомпоненты
  hooks/                # хуки с логикой
  utils/                # чистые функции
```

**Проверки:**
- [ ] `useAuthRedux()`, НЕ `useAuth` из domains
- [ ] `tokenRefreshManager.getToken()`, НЕ Firebase напрямую
- [ ] `createLogger()`, НЕ `console.log`
- [ ] Кнопки имеют `cursor-pointer`
- [ ] Нет хардкодных цветов — только токены `figma-*`
- [ ] Нет `dark:` префиксов

---

## 📁 Backend (`apps/backend`)

**Структура фичи:**
```
features/{feature}/
  index.ts                # barrel export
  {feature}.types.ts      # interfaces, DTOs, enums
  {feature}.constants.ts
  {feature}.controller.ts # HTTP handlers (thin!)
  {feature}.service.ts    # бизнес-логика (оркестратор)
  {feature}.repository.ts # Firestore/DB запросы
  services/               # sub-services
  utils/                  # pure functions
```

**Слои и зависимости:**
| Слой | Может вызывать | НЕ может вызывать |
|------|----------------|-------------------|
| Controller | Service | Repository, DB |
| Service | Repository, другие Services | Controller |
| Repository | Firestore/DB | Service, Controller |

**Проверки:**
- [ ] `Logger`, НЕ `console.log`
- [ ] Controller НЕ содержит бизнес-логику
- [ ] Repository НЕ содержит бизнес-логику
- [ ] `MODEL_IDS.*` для AI моделей, НЕ строки
- [ ] Cursor-based пагинация, НЕ offset
- [ ] `Timestamp.fromDate()` для дат Firestore
- [ ] Auth middleware явно per route, НЕ `router.use()`

---

## Naming Conventions (оба app)

| Суффикс | Назначение | Зависимости |
|---------|------------|-------------|
| `*.types.ts` | interfaces, types, DTOs, enums | Никаких |
| `*.constants.ts` | константы, конфиги | Никаких |
| `*.utils.ts` / `*.helper.ts` | pure functions | Только types/constants |
| `*.api.ts` / `*.repository.ts` | HTTP/DB запросы | Инфраструктура |
| `*.service.ts` / `use*.ts` | бизнес-логика | Может использовать всё |
| `*.controller.ts` | HTTP handlers | Только Service |
| `*.tsx` | React компоненты | — |

---

## Примеры

### Frontend: До → После

**❌ До:** 500+ строк, всё в одном
```tsx
export function ChatFeature() {
  const [messages, setMessages] = useState([]);
  // ...ещё 10 useState, 5 useEffect, 200 строк JSX
}
```

**✅ После:** разделение ответственности
- `chat.types.ts` — типы
- `chat.api.ts` — HTTP
- `hooks/useChatMessages.ts` — логика
- `components/ChatMessageList.tsx` — UI
- `ChatFeature.tsx` — тонкий оркестратор

### Backend: До → После

**❌ До:** controller с бизнес-логикой
```typescript
router.get("/users/:id", async (req, res) => {
  const user = await db.collection("users").doc(req.params.id).get();
  const subscription = await db.collection("subscriptions")...
  // 50 строк логики
  res.json(result);
});
```

**✅ После:** слои
- `users.controller.ts` — только HTTP, вызывает service
- `users.service.ts` — бизнес-логика, вызывает repository
- `users.repository.ts` — Firestore запросы

---

## Важно

- **НЕ добавляй** лишние фичи, комментарии, docstrings
- **НЕ трогай** код который не относится к рефакторингу
- **Сохраняй** всю существующую функциональность
- После рефакторинга — проверь что импорты работают
- Запусти `npm run build` для проверки
