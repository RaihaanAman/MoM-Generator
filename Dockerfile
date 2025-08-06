# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy everything needed to build (index.html, src/, etc.)
COPY . .

# Build Vite app
RUN npm run build

# Optional: Use serve to run the app
RUN npm install -g serve

CMD ["serve", "-s", "dist"]
