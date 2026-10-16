FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Also install SQLite driver for tests
RUN pip install --no-cache-dir aiosqlite

# Application code
COPY . .

EXPOSE 8000

CMD ["python", "entrypoint.py"]
