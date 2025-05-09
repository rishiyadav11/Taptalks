# Use node 16 image
FROM node:16 AS build

WORKDIR /app

# Copy all necessary files (including tsconfig.json)
COPY . .

# Install dependencies
RUN npm install

# Build the app
RUN npm run build

# Expose the port (optional here for build stage)
EXPOSE 80

# Use nginx to serve the app
FROM nginx:alpine

# Copy build files from previous stage
COPY --from=build /app/dist /usr/share/nginx/html
