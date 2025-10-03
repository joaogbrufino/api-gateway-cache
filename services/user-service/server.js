const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock database
let users = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@example.com',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@example.com',
    role: 'user',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Pedro Oliveira',
    email: 'pedro@example.com',
    role: 'user',
    createdAt: new Date().toISOString()
  }
];

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all users
app.get('/users', (req, res) => {
  const { page = 1, limit = 10, role } = req.query;
  
  let filteredUsers = users;
  
  // Filter by role if provided
  if (role) {
    filteredUsers = users.filter(user => user.role === role);
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedUsers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredUsers.length,
      pages: Math.ceil(filteredUsers.length / limit)
    }
  });
});

// Get user by ID
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: `User with ID ${id} does not exist`
    });
  }
  
  res.json({ data: user });
});

// Create new user
app.post('/users', (req, res) => {
  const { name, email, role = 'user' } = req.body;
  
  // Validation
  if (!name || !email) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Name and email are required'
    });
  }
  
  // Check if email already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'User with this email already exists'
    });
  }
  
  const newUser = {
    id: uuidv4(),
    name,
    email,
    role,
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  res.status(201).json({
    data: newUser,
    message: 'User created successfully'
  });
});

// Update user
app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({
      error: 'User not found',
      message: `User with ID ${id} does not exist`
    });
  }
  
  // Update user
  if (name) users[userIndex].name = name;
  if (email) users[userIndex].email = email;
  if (role) users[userIndex].role = role;
  users[userIndex].updatedAt = new Date().toISOString();
  
  res.json({
    data: users[userIndex],
    message: 'User updated successfully'
  });
});

// Delete user
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({
      error: 'User not found',
      message: `User with ID ${id} does not exist`
    });
  }
  
  const deletedUser = users.splice(userIndex, 1)[0];
  
  res.json({
    data: deletedUser,
    message: 'User deleted successfully'
  });
});

// Search users
app.get('/users/search/:query', (req, res) => {
  const { query } = req.params;
  const searchResults = users.filter(user => 
    user.name.toLowerCase().includes(query.toLowerCase()) ||
    user.email.toLowerCase().includes(query.toLowerCase())
  );
  
  res.json({
    data: searchResults,
    query,
    count: searchResults.length
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`User Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});