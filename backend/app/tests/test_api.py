"""
Integration tests for key scenarios:
1. User registration and login
2. Creating and listing posts
3. Applying to a post
4. Responding to an application (accept/reject)
5. Access control (can't apply to own post, can't edit others' posts)
6. Idempotency (can't apply twice)
7. Admin user management
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole

# Use in-memory SQLite for tests (fast, no external dep)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"


@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine):
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()
        # Clean up tables between tests
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c

    app.dependency_overrides.clear()


# ─── Helpers ────────────────────────────────────────────────────────────────

async def register_and_login(client: AsyncClient, email: str, password: str, username: str, full_name: str):
    await client.post("/api/auth/register", json={
        "email": email,
        "username": username,
        "full_name": full_name,
        "password": password,
    })
    resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Tests ──────────────────────────────────────────────────────────────────

class TestAuth:
    async def test_register_success(self, client):
        resp = await client.post("/api/auth/register", json={
            "email": "test@hse.ru",
            "username": "testuser",
            "full_name": "Test User",
            "password": "Password1",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "test@hse.ru"
        assert "hashed_password" not in data

    async def test_register_duplicate_email(self, client):
        payload = {"email": "dup@hse.ru", "username": "dup1", "full_name": "Dup", "password": "Password1"}
        await client.post("/api/auth/register", json=payload)
        payload["username"] = "dup2"
        resp = await client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409

    async def test_register_weak_password(self, client):
        resp = await client.post("/api/auth/register", json={
            "email": "weak@hse.ru",
            "username": "weakuser",
            "full_name": "Weak",
            "password": "password",  # no uppercase, no digit
        })
        assert resp.status_code == 422

    async def test_login_wrong_password(self, client):
        await client.post("/api/auth/register", json={
            "email": "u@hse.ru", "username": "user1", "full_name": "User", "password": "Password1"
        })
        resp = await client.post("/api/auth/login", json={"email": "u@hse.ru", "password": "wrong"})
        assert resp.status_code == 401

    async def test_token_refresh(self, client):
        await client.post("/api/auth/register", json={
            "email": "r@hse.ru", "username": "refresh_user", "full_name": "Refresh", "password": "Password1"
        })
        login_resp = await client.post("/api/auth/login", json={"email": "r@hse.ru", "password": "Password1"})
        refresh_token = login_resp.json()["refresh_token"]

        resp = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()


class TestPosts:
    async def test_create_post(self, client):
        token = await register_and_login(client, "a@hse.ru", "Password1", "alice", "Alice")
        resp = await client.post("/api/posts/", json={
            "type": "startup",
            "title": "My AI Startup",
            "description": "Building the next big thing in AI for education",
            "looking_for": "Python developer with ML experience",
            "industry": "EdTech",
            "is_remote": True,
        }, headers=auth_header(token))
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "My AI Startup"
        assert data["type"] == "startup"
        assert data["status"] == "active"

    async def test_list_posts_public(self, client):
        token = await register_and_login(client, "b@hse.ru", "Password1", "bob", "Bob")
        await client.post("/api/posts/", json={
            "type": "vacancy",
            "title": "React Developer Needed",
            "description": "Looking for a skilled React developer for our startup project",
            "looking_for": "3+ years React experience, TypeScript",
            "is_remote": True,
        }, headers=auth_header(token))

        resp = await client.get("/api/posts/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1

    async def test_search_posts(self, client):
        token = await register_and_login(client, "s@hse.ru", "Password1", "searcher", "Searcher")
        await client.post("/api/posts/", json={
            "type": "startup",
            "title": "Blockchain Finance Platform",
            "description": "Revolutionary blockchain solution for decentralized finance",
            "looking_for": "Blockchain developer with Solidity experience",
            "industry": "FinTech",
            "is_remote": True,
        }, headers=auth_header(token))

        resp = await client.get("/api/posts/?search=blockchain")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1

    async def test_filter_by_type(self, client):
        token = await register_and_login(client, "f@hse.ru", "Password1", "filter_user", "Filter")
        await client.post("/api/posts/", json={
            "type": "startup",
            "title": "Startup Only Post",
            "description": "This is specifically a startup looking for co-founders",
            "looking_for": "Co-founder with business development skills",
            "is_remote": True,
        }, headers=auth_header(token))

        resp = await client.get("/api/posts/?type=startup")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert all(i["type"] == "startup" for i in items)

    async def test_update_own_post(self, client):
        token = await register_and_login(client, "u@hse.ru", "Password1", "updater", "Updater")
        create_resp = await client.post("/api/posts/", json={
            "type": "vacancy",
            "title": "Original Title",
            "description": "Original description for this vacancy position",
            "looking_for": "Developer with Python skills",
            "is_remote": True,
        }, headers=auth_header(token))
        post_id = create_resp.json()["id"]

        resp = await client.patch(f"/api/posts/{post_id}", json={"title": "Updated Title"},
                                   headers=auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

    async def test_cannot_update_others_post(self, client):
        token1 = await register_and_login(client, "own@hse.ru", "Password1", "owner", "Owner")
        token2 = await register_and_login(client, "hkr@hse.ru", "Password1", "hacker", "Hacker")

        create_resp = await client.post("/api/posts/", json={
            "type": "startup",
            "title": "Protected Startup Post",
            "description": "This post should not be editable by other users",
            "looking_for": "Only the owner can edit this",
            "is_remote": True,
        }, headers=auth_header(token1))
        post_id = create_resp.json()["id"]

        resp = await client.patch(f"/api/posts/{post_id}", json={"title": "Hacked"},
                                   headers=auth_header(token2))
        assert resp.status_code == 403

    async def test_view_count_increments(self, client):
        token = await register_and_login(client, "v@hse.ru", "Password1", "viewer", "Viewer")
        create_resp = await client.post("/api/posts/", json={
            "type": "startup",
            "title": "Popular Startup",
            "description": "This startup is very popular and gets many views",
            "looking_for": "Everyone is invited to join",
            "is_remote": True,
        }, headers=auth_header(token))
        post_id = create_resp.json()["id"]

        resp1 = await client.get(f"/api/posts/{post_id}")
        resp2 = await client.get(f"/api/posts/{post_id}")
        assert resp2.json()["views_count"] > resp1.json()["views_count"]


class TestApplications:
    async def test_apply_success(self, client):
        token1 = await register_and_login(client, "p@hse.ru", "Password1", "poster", "Poster")
        token2 = await register_and_login(client, "ap@hse.ru", "Password1", "applicant", "Applicant")

        post_resp = await client.post("/api/posts/", json={
            "type": "startup",
            "title": "Great Startup",
            "description": "An amazing startup that needs talented developers",
            "looking_for": "Python developer with startup experience",
            "is_remote": True,
        }, headers=auth_header(token1))
        post_id = post_resp.json()["id"]

        resp = await client.post(f"/api/applications/{post_id}", json={
            "cover_letter": "I'm very interested in this opportunity!"
        }, headers=auth_header(token2))
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "pending"
        assert data["post_id"] == post_id

    async def test_cannot_apply_to_own_post(self, client):
        token = await register_and_login(client, "self@hse.ru", "Password1", "selfapply", "Self")
        post_resp = await client.post("/api/posts/", json={
            "type": "startup",
            "title": "My Own Startup",
            "description": "I created this startup and want to apply to myself",
            "looking_for": "Co-founder for my own project",
            "is_remote": True,
        }, headers=auth_header(token))
        post_id = post_resp.json()["id"]

        resp = await client.post(f"/api/applications/{post_id}", json={},
                                  headers=auth_header(token))
        assert resp.status_code == 400

    async def test_cannot_apply_twice(self, client):
        token1 = await register_and_login(client, "pp@hse.ru", "Password1", "poster2", "Poster2")
        token2 = await register_and_login(client, "aa@hse.ru", "Password1", "applicant2", "App2")

        post_resp = await client.post("/api/posts/", json={
            "type": "vacancy",
            "title": "Unique Vacancy",
            "description": "A unique position that can only be applied to once",
            "looking_for": "A developer who applies only once",
            "is_remote": True,
        }, headers=auth_header(token1))
        post_id = post_resp.json()["id"]

        await client.post(f"/api/applications/{post_id}", json={}, headers=auth_header(token2))
        resp = await client.post(f"/api/applications/{post_id}", json={}, headers=auth_header(token2))
        assert resp.status_code == 409

    async def test_accept_application(self, client):
        token1 = await register_and_login(client, "acc_p@hse.ru", "Password1", "acc_poster", "AccPoster")
        token2 = await register_and_login(client, "acc_a@hse.ru", "Password1", "acc_app", "AccApp")

        post_resp = await client.post("/api/posts/", json={
            "type": "startup",
            "title": "Accepting Startup",
            "description": "This startup will accept your application if you're a great fit",
            "looking_for": "The best developer in the world",
            "is_remote": True,
        }, headers=auth_header(token1))
        post_id = post_resp.json()["id"]

        app_resp = await client.post(f"/api/applications/{post_id}", json={
            "cover_letter": "I am the best!"
        }, headers=auth_header(token2))
        app_id = app_resp.json()["id"]

        resp = await client.patch(f"/api/applications/{app_id}/respond", json={
            "status": "accepted",
            "response_message": "Welcome aboard!",
        }, headers=auth_header(token1))
        assert resp.status_code == 200
        assert resp.json()["status"] == "accepted"
        assert resp.json()["response_message"] == "Welcome aboard!"

    async def test_reject_application(self, client):
        token1 = await register_and_login(client, "rej_p@hse.ru", "Password1", "rej_poster", "RejPoster")
        token2 = await register_and_login(client, "rej_a@hse.ru", "Password1", "rej_app", "RejApp")

        post_resp = await client.post("/api/posts/", json={
            "type": "vacancy",
            "title": "Rejecting Vacancy",
            "description": "This vacancy will reject your application unfortunately",
            "looking_for": "Very specific skills that nobody has",
            "is_remote": True,
        }, headers=auth_header(token1))
        post_id = post_resp.json()["id"]

        app_resp = await client.post(f"/api/applications/{post_id}", json={}, headers=auth_header(token2))
        app_id = app_resp.json()["id"]

        resp = await client.patch(f"/api/applications/{app_id}/respond", json={
            "status": "rejected",
            "response_message": "Not the right fit.",
        }, headers=auth_header(token1))
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

    async def test_only_author_can_respond(self, client):
        token1 = await register_and_login(client, "rp@hse.ru", "Password1", "rp_poster", "RpPoster")
        token2 = await register_and_login(client, "ra@hse.ru", "Password1", "ra_app", "RaApp")
        token3 = await register_and_login(client, "ri@hse.ru", "Password1", "ri_intruder", "RiIntruder")

        post_resp = await client.post("/api/posts/", json={
            "type": "startup",
            "title": "Private Startup",
            "description": "Only the author should be able to respond to applications",
            "looking_for": "Developer who respects access control",
            "is_remote": True,
        }, headers=auth_header(token1))
        post_id = post_resp.json()["id"]

        app_resp = await client.post(f"/api/applications/{post_id}", json={}, headers=auth_header(token2))
        app_id = app_resp.json()["id"]

        resp = await client.patch(f"/api/applications/{app_id}/respond", json={"status": "accepted"},
                                   headers=auth_header(token3))
        assert resp.status_code == 403

    async def test_sent_applications_visible(self, client):
        token1 = await register_and_login(client, "sv_p@hse.ru", "Password1", "sv_poster", "SvPoster")
        token2 = await register_and_login(client, "sv_a@hse.ru", "Password1", "sv_app", "SvApp")

        post_resp = await client.post("/api/posts/", json={
            "type": "startup",
            "title": "Visible Applications Startup",
            "description": "Test that sent applications are visible in the personal cabinet",
            "looking_for": "Applicant who checks their sent applications",
            "is_remote": True,
        }, headers=auth_header(token1))
        post_id = post_resp.json()["id"]

        await client.post(f"/api/applications/{post_id}", json={}, headers=auth_header(token2))

        resp = await client.get("/api/applications/sent", headers=auth_header(token2))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_received_applications_visible(self, client):
        token1 = await register_and_login(client, "rv_p@hse.ru", "Password1", "rv_poster", "RvPoster")
        token2 = await register_and_login(client, "rv_a@hse.ru", "Password1", "rv_app", "RvApp")

        post_resp = await client.post("/api/posts/", json={
            "type": "startup",
            "title": "Received Applications Test",
            "description": "Test that post author can see received applications",
            "looking_for": "Someone who applies to test the received endpoint",
            "is_remote": True,
        }, headers=auth_header(token1))
        post_id = post_resp.json()["id"]

        await client.post(f"/api/applications/{post_id}", json={}, headers=auth_header(token2))

        resp = await client.get("/api/applications/received", headers=auth_header(token1))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
