const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - Using PascalCase to match C# frontend expectations
app.use('/api/Students', require('./routes/students'));
app.use('/api/Problem', require('./routes/problems'));
app.use('/api/Attendance', require('./routes/attendance'));
app.use('/api/Download', require('./routes/download'));
app.use('/api/UpdatingLevel', require('./routes/updatingLevel'));
app.use('/api/Warning', require('./routes/warning'));


// New problems route for centralized problem management
app.use('/api/problems', require('./routes/problems-new'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Student Problems Management System API',
        version: '1.0.0',
        endpoints: {
            students: '/api/students',
            problems: '/api/problem',
            attendance: '/api/attendance',
            download: '/api/download',
            updatingLevel: '/api/updatinglevel',
            warning: '/api/warning'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API available at http://0.0.0.0:${PORT}/api`);
});

module.exports = app;

