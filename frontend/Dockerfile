# Use Node.js image (Alpine version for better security)
FROM node:16-alpine AS build

WORKDIR /app

# Copy all necessary files (including tsconfig.json)
COPY . .

# Install dependencies
RUN npm install

# Build the app
RUN npm run build

# Use nginx to serve the app
FROM nginx:alpine

# Copy build files from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the port where nginx will listen internally
EXPOSE 8181

# Command to run nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
