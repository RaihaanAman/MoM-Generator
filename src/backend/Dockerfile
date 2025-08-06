# Use Python 3.12.6
FROM python:3.12.6-slim

# Install system dependencies
RUN apt-get update && apt-get install -y ffmpeg && apt-get clean

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose Flask port
EXPOSE 5000

# Run Flask app
CMD ["python", "LoginAuth.py"]
