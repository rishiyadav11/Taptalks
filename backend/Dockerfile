# Use Node.js image (Alpine version for better security)
FROM node:16-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the backend port (3000)
EXPOSE 3000

# Command to run the app
CMD ["npm", "start"]
