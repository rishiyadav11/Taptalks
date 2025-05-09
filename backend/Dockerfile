# Use Node.js image as base
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the backend port (e.g., 5000)
EXPOSE 5000

# Command to run the app
CMD ["npm", "start"]
