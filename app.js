require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { CosmosClient } = require('@azure/cosmos');
const cors = require('cors');

const app = express();
const port = 4000;

// ตรวจสอบ Environment Variables
if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY || !process.env.COSMOS_DATABASE || !process.env.COSMOS_CONTAINER || !process.env.JWT_SECRET) {
    console.error('Missing required environment variables. Check your .env file.');
    process.exit(1); // หยุดการทำงานของแอปพลิเคชัน
}

// Middleware สำหรับอ่าน body ที่เป็น JSON และจัดการ CORS
app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500',  // อนุญาตเฉพาะโดเมนนี้
}));

// ตั้งค่า Cosmos DB สำหรับข้อมูลผู้ใช้และข้อมูลอุณหภูมิ
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE;
const containerId = process.env.COSMOS_CONTAINER;

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

// Sign up API - เก็บข้อมูลผู้ใช้ใน Cosmos DB
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    try {
        // ตรวจสอบว่า username นี้มีอยู่แล้วหรือไม่
        const query = {
            query: 'SELECT * FROM c WHERE c.username = @username',
            parameters: [{ name: '@username', value: username }]
        };

        const { resources } = await container.items.query(query).fetchAll();
        if (resources.length > 0) {
            return res.status(400).send('Username already exists');
        }

        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10);

        // สร้างผู้ใช้ใหม่
        const newUser = {
            username,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
        };

        await container.items.create(newUser);
        return res.status(201).send('User created successfully');
    } catch (error) {
        console.error('Error creating user:', error.message);
        return res.status(500).send('Error creating user');
    }
});

// Login API - ตรวจสอบข้อมูลผู้ใช้จาก Cosmos DB
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    try {
        // ตรวจสอบ username ใน Cosmos DB
        const query = {
            query: 'SELECT * FROM c WHERE c.username = @username',
            parameters: [{ name: '@username', value: username }]
        };

        const { resources } = await container.items.query(query).fetchAll();
        if (resources.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = resources[0];

        // ตรวจสอบรหัสผ่าน
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send('Invalid password');
        }

        // สร้าง JWT token
        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        return res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in:', error.message);
        return res.status(500).send('Error logging in');
    }
});

// API สำหรับดึงข้อมูลอุณหภูมิจาก Cosmos DB
app.get('/temperature', async (req, res) => {
    try {
        const query = {
            query: 'SELECT * FROM c WHERE c.deviceId = @deviceId ORDER BY c.timestamp DESC',
            parameters: [{ name: '@deviceId', value: 'Raspberry Pi Web Client' }]
        };

        const { resources } = await container.items.query(query).fetchAll();
        console.log('Temperature data fetched. Records:', resources.length);
        
        if (resources.length > 0) {
            return res.status(200).json(resources);
        } else {
            return res.status(404).send('No temperature data found');
        }
    } catch (error) {
        console.error('Error fetching temperature data:', error.message);
        return res.status(500).send('Error fetching temperature data');
    }
});

// ทดสอบการเชื่อมต่อ API
app.get('/health', (req, res) => {
    res.status(200).send('API is working');
});

// เริ่มต้น Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
