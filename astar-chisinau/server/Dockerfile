FROM python:3.12-slim

# Install C build tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc cmake make libc6-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy data and C core
COPY data/ data/
COPY core/ core/

# Build the C shared library
RUN mkdir core/build && cd core/build && cmake .. && cmake --build .

# Install Python dependencies
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# Copy server code
COPY server/ server/

EXPOSE 5000

CMD ["python", "server/server.py"]
