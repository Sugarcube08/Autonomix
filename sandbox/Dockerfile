FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure the app can run subprocesses but limit the user for some safety
# For MVP, we'll run as root but in production we'd use a non-privileged user
# and specific capabilities.

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
