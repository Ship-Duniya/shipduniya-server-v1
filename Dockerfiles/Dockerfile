# Use official Node.js 18 image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the entire project
COPY . .

# Expose the port
EXPOSE 5000

# Start the application
CMD ["npm", "run", "start"]
