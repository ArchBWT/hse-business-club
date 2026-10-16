#!/usr/bin/env python3
"""
Entrypoint for the backend service.
Runs Alembic migrations then starts uvicorn.
"""
import asyncio
import subprocess
import sys
import time

import asyncpg
from app.core.config import settings


async def wait_for_db(dsn: str, retries: int = 20, delay: float = 2.0):
    """Wait until PostgreSQL accepts connections."""
    # Convert asyncpg DSN from SQLAlchemy format
    pg_dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")
    for attempt in range(retries):
        try:
            conn = await asyncpg.connect(pg_dsn)
            await conn.close()
            print("✅ Database is ready")
            return
        except Exception as e:
            print(f"⏳ Waiting for database... ({attempt + 1}/{retries}): {e}")
            await asyncio.sleep(delay)
    print("❌ Database not available after retries. Exiting.")
    sys.exit(1)


async def main():
    await wait_for_db(settings.DATABASE_URL)


if __name__ == "__main__":
    asyncio.run(main())

    # Run migrations
    print("🔄 Running Alembic migrations...")
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"❌ Migration failed:\n{result.stderr}")
        sys.exit(1)
    print("✅ Migrations complete")

    # Start uvicorn
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        workers=1,
    )
