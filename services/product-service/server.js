const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock database
let products = [
  {
    id: '1',
    name: 'Smartphone Galaxy',
    description: 'Smartphone Android com 128GB de armazenamento',
    price: 899.99,
    category: 'electronics',
    stock: 50,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Notebook Dell',
    description: 'Notebook Dell Inspiron 15 com Intel i5',
    price: 2499.99,
    category: 'electronics',
    stock: 25,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Camiseta Básica',
    description: 'Camiseta 100% algodão, várias cores',
    price: 29.99,
    category: 'clothing',
    stock: 100,
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Livro JavaScript',
    description: 'Guia completo de JavaScript moderno',
    price: 59.99,
    category: 'books',
    stock: 30,
    createdAt: new Date().toISOString()
  }
];

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'product-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all products
app.get('/products', (req, res) => {
  const { page = 1, limit = 10, category, minPrice, maxPrice } = req.query;
  
  let filteredProducts = products;
  
  // Filter by category
  if (category) {
    filteredProducts = filteredProducts.filter(product => product.category === category);
  }
  
  // Filter by price range
  if (minPrice) {
    filteredProducts = filteredProducts.filter(product => product.price >= parseFloat(minPrice));
  }
  
  if (maxPrice) {
    filteredProducts = filteredProducts.filter(product => product.price <= parseFloat(maxPrice));
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedProducts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredProducts.length,
      pages: Math.ceil(filteredProducts.length / limit)
    }
  });
});

// Get product by ID
app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({
      error: 'Product not found',
      message: `Product with ID ${id} does not exist`
    });
  }
  
  res.json({ data: product });
});

// Create new product
app.post('/products', (req, res) => {
  const { name, description, price, category, stock = 0 } = req.body;
  
  // Validation
  if (!name || !description || !price || !category) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Name, description, price, and category are required'
    });
  }
  
  if (price <= 0) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Price must be greater than 0'
    });
  }
  
  const newProduct = {
    id: uuidv4(),
    name,
    description,
    price: parseFloat(price),
    category,
    stock: parseInt(stock),
    createdAt: new Date().toISOString()
  };
  
  products.push(newProduct);
  
  res.status(201).json({
    data: newProduct,
    message: 'Product created successfully'
  });
});

// Update product
app.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, stock } = req.body;
  
  const productIndex = products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({
      error: 'Product not found',
      message: `Product with ID ${id} does not exist`
    });
  }
  
  // Update product
  if (name) products[productIndex].name = name;
  if (description) products[productIndex].description = description;
  if (price) products[productIndex].price = parseFloat(price);
  if (category) products[productIndex].category = category;
  if (stock !== undefined) products[productIndex].stock = parseInt(stock);
  products[productIndex].updatedAt = new Date().toISOString();
  
  res.json({
    data: products[productIndex],
    message: 'Product updated successfully'
  });
});

// Delete product
app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  const productIndex = products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({
      error: 'Product not found',
      message: `Product with ID ${id} does not exist`
    });
  }
  
  const deletedProduct = products.splice(productIndex, 1)[0];
  
  res.json({
    data: deletedProduct,
    message: 'Product deleted successfully'
  });
});

// Search products
app.get('/products/search/:query', (req, res) => {
  const { query } = req.params;
  const searchResults = products.filter(product => 
    product.name.toLowerCase().includes(query.toLowerCase()) ||
    product.description.toLowerCase().includes(query.toLowerCase()) ||
    product.category.toLowerCase().includes(query.toLowerCase())
  );
  
  res.json({
    data: searchResults,
    query,
    count: searchResults.length
  });
});

// Get categories
app.get('/categories', (req, res) => {
  const categories = [...new Set(products.map(product => product.category))];
  res.json({
    data: categories,
    count: categories.length
  });
});

// Update stock
app.patch('/products/:id/stock', (req, res) => {
  const { id } = req.params;
  const { quantity, operation = 'set' } = req.body;
  
  const productIndex = products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({
      error: 'Product not found',
      message: `Product with ID ${id} does not exist`
    });
  }
  
  if (quantity === undefined) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Quantity is required'
    });
  }
  
  const product = products[productIndex];
  
  switch (operation) {
    case 'add':
      product.stock += parseInt(quantity);
      break;
    case 'subtract':
      product.stock = Math.max(0, product.stock - parseInt(quantity));
      break;
    case 'set':
    default:
      product.stock = parseInt(quantity);
      break;
  }
  
  product.updatedAt = new Date().toISOString();
  
  res.json({
    data: product,
    message: 'Stock updated successfully'
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
  console.log(`Product Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});