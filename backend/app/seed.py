"""
Seed script — creates test users, posts, and applications.
Run once after `docker compose up`:
    docker compose exec backend python -m app.seed
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.post import Post, PostType, PostStatus
from app.models.application import Application, ApplicationStatus
from app.core.database import Base


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        # --- Users ---
        admin = User(
            email="admin@hse.ru",
            username="admin",
            full_name="Администратор Клуба",
            hashed_password=get_password_hash("Admin1234"),
            bio="Администратор Бизнес-клуба ВШЭ",
            is_admin=True,
            role=UserRole.admin,
            skills_tags="management,strategy,networking",
        )

        alice = User(
            email="alice@hse.ru",
            username="alice_ivanova",
            full_name="Алиса Иванова",
            hashed_password=get_password_hash("Alice1234"),
            bio="Основатель EdTech-стартапа. Люблю продукт, данные и кофе ☕",
            telegram_handle="alice_ivanova",
            linkedin_url="https://linkedin.com/in/alice-ivanova",
            skills_tags="product,python,ml,edtech",
        )

        bob = User(
            email="bob@hse.ru",
            username="bob_petrov",
            full_name="Боб Петров",
            hashed_password=get_password_hash("Bob12345"),
            bio="Full-stack разработчик. React + Python. Ищу интересный стартап.",
            telegram_handle="bob_petrov",
            skills_tags="react,python,typescript,postgresql",
        )

        carol = User(
            email="carol@hse.ru",
            username="carol_sidorova",
            full_name="Кэрол Сидорова",
            hashed_password=get_password_hash("Carol1234"),
            bio="Product Manager с опытом в fintech. MBA ВШЭ 2023.",
            telegram_handle="carol_pm",
            skills_tags="product,fintech,analytics,growth",
        )

        dan = User(
            email="dan@hse.ru",
            username="dan_kozlov",
            full_name="Дан Козлов",
            hashed_password=get_password_hash("Dan12345"),
            bio="Дизайнер UX/UI. Figma, Framer, research. Верю в хороший интерфейс.",
            skills_tags="ux,ui,figma,design,research",
        )

        session.add_all([admin, alice, bob, carol, dan])
        await session.flush()

        # --- Posts ---
        p1 = Post(
            author_id=alice.id,
            type=PostType.startup,
            title="EduPath — AI-платформа для персонализированного обучения",
            description=(
                "Строим EdTech-платформу, которая строит персональную траекторию обучения на основе "
                "слабых сторон студента, используя ML-модели. Уже есть MVP и первые 50 тестовых пользователей. "
                "Ищем технического co-founder, готового вложить время в equity-based партнёрство."
            ),
            looking_for=(
                "ML-инженер или full-stack разработчик с опытом в Python/FastAPI и желанием "
                "строить продукт с нуля. Готовность работать в режиме стартапа."
            ),
            stage="mvp",
            industry="EdTech",
            skills_required="python,ml,fastapi,react",
            is_remote=True,
            status=PostStatus.active,
        )

        p2 = Post(
            author_id=carol.id,
            type=PostType.startup,
            title="FinFlow — b2b сервис для автоматизации финансовой отчётности МСБ",
            description=(
                "FinFlow помогает малому и среднему бизнесу автоматически формировать "
                "P&L, ДДС и управленческие отчёты из 1С/Moysklad/Excel. "
                "Уже есть 3 платящих клиента, MRR $800. Ищем CTO."
            ),
            looking_for=(
                "Технический директор: опыт бэкенд-разработки (Python/Node.js), "
                "знание интеграций с бухгалтерскими системами будет плюсом. "
                "Рассматриваем equity + небольшой фикс."
            ),
            stage="growth",
            industry="FinTech",
            skills_required="python,nodejs,integrations,fintech",
            is_remote=False,
            location="Москва",
            status=PostStatus.active,
        )

        p3 = Post(
            author_id=alice.id,
            type=PostType.vacancy,
            title="Frontend-разработчик в EduPath (React, part-time)",
            description=(
                "Нам нужен фронтенд-разработчик для работы над веб-версией "
                "нашей EdTech-платформы. Задачи: реализация учебного интерфейса, "
                "дашборд прогресса, интеграция с REST API."
            ),
            looking_for=(
                "React (hooks, context), TypeScript, желательно опыт с "
                "Tailwind или styled-components. Part-time 20 ч/нед."
            ),
            stage=None,
            industry="EdTech",
            skills_required="react,typescript,css,rest",
            is_remote=True,
            compensation="20 000–35 000 ₽/мес или equity",
            status=PostStatus.active,
        )

        p4 = Post(
            author_id=dan.id,
            type=PostType.vacancy,
            title="UX-исследователь для проекта в healthtech",
            description=(
                "Небольшая команда разрабатывает мобильное приложение для мониторинга "
                "здоровья. Нужен человек, который проведёт пользовательские интервью, "
                "usability-тесты и оформит инсайты."
            ),
            looking_for=(
                "Опыт проведения UX-интервью и юзабилити-тестов. "
                "Умение оформить результаты в понятный отчёт. "
                "Волонтёрское участие или небольшой гонорар."
            ),
            stage=None,
            industry="HealthTech",
            skills_required="ux,research,interviews,figma",
            is_remote=True,
            compensation="По договорённости",
            status=PostStatus.active,
        )

        p5 = Post(
            author_id=bob.id,
            type=PostType.startup,
            title="GreenRoute — маршруты с минимальным углеродным следом",
            description=(
                "Сервис для планирования путешествий с фокусом на экологичность: "
                "сравниваем CO₂-след разных маршрутов (самолёт vs поезд vs авто), "
                "предлагаем зелёные альтернативы. Концепт, ищем команду."
            ),
            looking_for=(
                "Co-founder с опытом в B2C продуктах или мобильной разработке (Flutter/React Native). "
                "Также ищем маркетолога с пониманием ESG-аудитории."
            ),
            stage="idea",
            industry="GreenTech",
            skills_required="flutter,react-native,mobile,marketing",
            is_remote=True,
            status=PostStatus.active,
        )

        session.add_all([p1, p2, p3, p4, p5])
        await session.flush()

        # --- Applications ---
        app1 = Application(
            post_id=p1.id,
            applicant_id=bob.id,
            post_author_id=alice.id,
            cover_letter=(
                "Привет! Я full-stack разработчик с опытом в Python/FastAPI и React. "
                "EdTech — моя страсть, сам учился через онлайн-курсы. "
                "Готов обсудить возможности co-founder сотрудничества."
            ),
            status=ApplicationStatus.pending,
        )
        app2 = Application(
            post_id=p3.id,
            applicant_id=bob.id,
            post_author_id=alice.id,
            cover_letter=(
                "Работаю с React 3 года, знаю TypeScript, знаком с REST API. "
                "Ваша платформа звучит интересно — готов выйти на связь."
            ),
            status=ApplicationStatus.accepted,
            response_message="Отлично, давайте созвонимся на этой неделе! Напишите в TG.",
        )
        app3 = Application(
            post_id=p2.id,
            applicant_id=bob.id,
            post_author_id=carol.id,
            cover_letter=(
                "Интересует позиция CTO. Опыт бэкенда 5 лет, работал с 1С-интеграциями."
            ),
            status=ApplicationStatus.rejected,
            response_message="Спасибо за отклик, но мы ищем кандидата с опытом в финтех-стартапах.",
        )
        app4 = Application(
            post_id=p4.id,
            applicant_id=carol.id,
            post_author_id=dan.id,
            cover_letter=(
                "Занималась UX-ресёрчем в проекте fintech. Готова помочь с интервью и анализом."
            ),
            status=ApplicationStatus.pending,
        )

        session.add_all([app1, app2, app3, app4])

        # Update application_counts
        p1.applications_count = 1
        p2.applications_count = 1
        p3.applications_count = 1
        p4.applications_count = 1

        await session.commit()
        print("✅ Seed complete!")
        print("\nTest accounts:")
        print("  admin@hse.ru     / Admin1234  (admin)")
        print("  alice@hse.ru     / Alice1234  (startup founder)")
        print("  bob@hse.ru       / Bob12345   (developer)")
        print("  carol@hse.ru     / Carol1234  (product manager)")
        print("  dan@hse.ru       / Dan12345   (designer)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
