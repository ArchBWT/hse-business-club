# HSE Business Club

Прототип модуля стартапов и вакансий для Telegram Mini App Бизнес-клуба ВШЭ.

## Быстрый запуск

### Требования
- Docker & Docker Compose

### Запуск

```bash
# Клонировать репозиторий
git clone <URL>
cd ВШЭ

# Запустить все сервисы
docker compose up --build -d

# Загрузить тестовые данные (один раз)
docker compose exec backend python -m app.seed

# Открыть в браузере
open http://localhost
```

Приложение доступно на: **http://localhost**  
API документация: **http://localhost:8000/api/docs**

---

## Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| 👑 Администратор | admin@hse.ru | Admin1234 |
| 🚀 Алиса (фаундер EdTech) | alice@hse.ru | Alice1234 |
| 💻 Боб (разработчик) | bob@hse.ru | Bob12345 |
| 📊 Кэрол (Product Manager) | carol@hse.ru | Carol1234 |
| 🎨 Дан (дизайнер) | dan@hse.ru | Dan12345 |

---

## Тесты

```bash
# Установить зависимости
cd backend && pip install -r requirements.txt aiosqlite

# Запустить тесты
pytest -v

# Или через Docker
docker compose exec backend pytest -v
```

Покрыты 17 тест-кейсов:
- Регистрация (успех, дубликат, слабый пароль)
- Аутентификация (успех, неверный пароль, refresh token)
- Посты (CRUD, поиск, фильтры, счётчик просмотров, access control)
- Отклики (подать, нельзя на свой пост, нельзя дважды, принять, отклонить, только автор отвечает)
- Видимость откликов в личном кабинете

---

## Технологический стек

### Backend
- **FastAPI** (Python 3.12) — REST API, автодокументация через OpenAPI
- **SQLAlchemy 2.0** (async) — ORM с asyncpg
- **PostgreSQL 16** — основная БД
- **Alembic** — миграции схемы
- **JWT** (python-jose) — stateless аутентификация
- **bcrypt** (passlib) — хеширование паролей

### Frontend
- **React 18** + **Vite** — SPA
- **React Router v6** — клиентская навигация
- **Axios** — HTTP клиент с interceptors для авто-refresh токена
- **Vanilla CSS** — дизайн-система с CSS-переменными, без фреймворков
- **Lucide React** — иконки

### Инфраструктура
- **Docker Compose** — оркестрация сервисов (db + backend + frontend/nginx)
- **Nginx** — serve React SPA + proxy к API

---

## Архитектурные решения

### Структура данных

**Три основные сущности:**

```
User (участник)
 ├── Post (публикация — стартап или вакансия)
 │    └── Application (отклик на публикацию)
 └── Application (отклики, где пользователь — автор поста)
```

**Ключевые решения:**

1. **Один тип поста для стартапов и вакансий** — поле `type: enum('startup', 'vacancy')`. Оба типа имеют общую структуру (title, description, looking_for, skills_required). Специфические поля (stage для стартапов, compensation для вакансий) опциональны. Это упрощает ленту и не дублирует код.

2. **Денормализация `post_author_id` в Application** — позволяет быстро фильтровать входящие отклики без JOIN к Posts. При масштабировании это критически важно.

3. **UniqueConstraint(post_id, applicant_id)** — идемпотентность на уровне БД. Нельзя откликнуться дважды даже при параллельных запросах.

4. **Денормализованные счётчики** — `views_count` и `applications_count` в таблице Posts. Инкрементируются при каждом просмотре / отклике. Быстрее, чем COUNT() при каждой загрузке ленты.

5. **Refresh token rotation** — при обновлении access-токена выдаётся новый refresh-токен. Это позволяет отзывать сессии (достаточно ротировать секретный ключ для полного выхода).

### Жизненный цикл публикации

```
draft → active ↔ closed
                 (автор может переключать active/closed)
```

Только `active` публикации принимают отклики.

### Жизненный цикл отклика

```
pending → accepted
        → rejected
```

- Только автор поста может изменить статус с `pending`
- Откликнувшийся может *удалить* только `pending` отклик (не отозвать accepted/rejected)
- Результат всегда виден в «Личном кабинете» → «Мои отклики»

### Безопасность

- Пароли хешируются bcrypt (cost factor 12)
- JWT Access-токены живут 60 мин, Refresh — 30 дней
- Все мутирующие операции требуют аутентификации
- Проверка owner_id перед PATCH/DELETE (нельзя редактировать чужое)
- Нельзя откликнуться на собственный пост (409/400)
- Только admin может управлять пользователями (`is_admin` flag)
- CORS настраивается для конкретного origin в production

---

## API Эндпоинты

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Регистрация |
| POST | /api/auth/login | Вход |
| POST | /api/auth/refresh | Обновить токены |
| GET | /api/auth/me | Текущий пользователь |
| GET | /api/users/me | Профиль |
| PATCH | /api/users/me | Обновить профиль |
| GET | /api/users/me/stats | Статистика |
| GET | /api/users/{username} | Публичный профиль |
| GET | /api/posts/ | Лента (фильтры, пагинация) |
| POST | /api/posts/ | Создать публикацию |
| GET | /api/posts/my | Мои публикации |
| GET | /api/posts/{id} | Детали поста |
| PATCH | /api/posts/{id} | Обновить пост |
| DELETE | /api/posts/{id} | Удалить пост |
| POST | /api/applications/{post_id} | Откликнуться |
| DELETE | /api/applications/{id} | Отозвать отклик |
| GET | /api/applications/sent | Отправленные отклики |
| GET | /api/applications/received | Входящие отклики |
| PATCH | /api/applications/{id}/respond | Принять / отклонить |
| GET | /api/users/ | Admin: список пользователей |
| PATCH | /api/users/{id}/deactivate | Admin: деактивировать |
| PATCH | /api/users/{id}/activate | Admin: активировать |

---

## Про использование ИИ

В разработке использовал ИИ-инструменты **преимущественно для дебаггинга и безопасности**. Конкретно:

- **Дебаггинг**: анализ async SQLAlchemy ошибок (LazyLoadingError с `selectinload`), traceback при refresh-token rotation
- **Безопасность**: проверка JWT-реализации на уязвимости (algorithm confusion attack, отсутствие `type` claim в токене)

**Пример конкретной проверки ИИ-решения:**

ИИ предложил хранить refresh-токены в базе данных для возможности их отзыва (blacklist). Я проанализировал предложение:

*За:* Полный контроль над сессиями, можно инвалидировать конкретный токен.  
*Против:* Дополнительная таблица + запрос к БД при каждом `/api/auth/refresh`, stateful сессии противоречат основной ценности JWT, усложняет горизонтальное масштабирование.

*Решение:* Для прототипа использовал **rotation без blacklist** — при каждом обновлении выдаётся новый refresh-токен, что само по себе ограничивает окно компрометации. Для production следует добавить Redis-based blacklist refresh-токенов.

---

## Затраченное время

| Этап | Время |
|------|-------|
| Проектирование модели данных и API | ~1 ч |
| Backend (FastAPI + SQLAlchemy + Auth) | ~3 ч |
| Frontend (React + CSS дизайн-система) | ~4 ч |
| Тесты | ~1 ч |
| Docker Compose + документация | ~1 ч |
| **Итого** | **~10 ч** |
