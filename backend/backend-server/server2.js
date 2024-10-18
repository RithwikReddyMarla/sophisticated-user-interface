const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const app = express();
const port = 3000;  // Port for your Express server
const fs = require('fs');

// Use body-parser middleware to parse JSON data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
const upload = multer({ dest: 'uploads/' });

// Base URL of the Flask server
const FLASK_BASE_URL = 'http://localhost:5000/llm';

// Route to get table names
app.get('/tables', async (req, res) => {
    try {
        const response = await axios.get(`${FLASK_BASE_URL}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching table names:', error);
        res.status(500).json({ error: 'Error fetching table names from Flask server.' });
    }
});

// Route to get columns of a table
app.post('/get_columns', async (req, res) => {
    const { table } = req.body;
    try {
        const response = await axios.post(`${FLASK_BASE_URL}/get_columns`, { table });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching columns:', error);
        res.status(500).json({ error: 'Error fetching columns from Flask server.' });
    }
});

// Route to generate SQL query
app.post('/generate_query', async (req, res) => {
    const { table, question } = req.body;
    try {
        const response = await axios.post(`${FLASK_BASE_URL}/generate_query`, { table, question });
        res.json(response.data);
    } catch (error) {
        console.error('Error generating query:', error);
        res.status(500).json({ error: 'Error generating query from Flask server.' });
    }
});

// Route to generate a graph
app.post('/generate_graph', async (req, res) => {
    const { columns, rows, graph_type } = req.body;
    try {
        const response = await axios.post(`${FLASK_BASE_URL}/generate_graph`, { columns, rows, graph_type });
        res.json(response.data);
    } catch (error) {
        console.error('Error generating graph:', error);
        res.status(500).json({ error: 'Error generating graph from Flask server.' });
    }
});

// Route to upload a dataset

// Define allowed file type for CSV files
const allowedFileType = 'text/csv';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

app.post('/upload_dataset', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileType = req.file.mimetype;
        if (fileType !== allowedFileType) {
            fs.unlinkSync(req.file.path); // Delete the incorrect file
            return res.status(400).json({ error: 'Invalid file type. Only CSV files are allowed' });
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(req.file.path), req.file.originalname);

        const response = await axios.post(`${FLASK_BASE_URL}/upload_dataset`, form, {
            headers: {
                ...form.getHeaders(),
            },
            maxBodyLength: Infinity, 
        });

        fs.unlinkSync(req.file.path);

        res.json(response.data);
    } catch (error) {
        console.error('Error uploading dataset:', error);
        res.status(500).json({ error: 'Error uploading dataset to Flask server.' });
    }
});

// Route to always show housing.csv
app.get('/housing', (req, res) => {
    const filePath = path.join(__dirname, 'uploads/housing.csv');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.listen(port, () => {
    console.log(`Express server running on http://localhost:${port}`);
});

