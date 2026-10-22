const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running');
});

// ---------- Create tables ----------
async function createTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES "User"(id),
      course_id INT NOT NULL REFERENCES courses(id),
      enrolled_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, course_id)
    )
  `);

  console.log('Tables are ready');
}

// ---------- Users ----------
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/users', async (req, res) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Courses ----------
app.get('/courses', async (req, res) => {
  try {
    const courses = await prisma.$queryRaw`SELECT * FROM courses`;
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/courses', async (req, res) => {
  try {
    const { title, description } = req.body;
    const course = await prisma.$queryRaw`
      INSERT INTO courses (title, description)
      VALUES (${title}, ${description})
      RETURNING *`;
    res.json(course[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Enrollments ----------
app.post('/enroll', async (req, res) => {
  try {
    const { user_id, course_id } = req.body;
    const row = await prisma.$queryRaw`
      INSERT INTO enrollments (user_id, course_id)
      VALUES (${user_id}, ${course_id})
      RETURNING *`;
    res.json(row[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/enrollments', async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT e.id, u.name AS user_name, c.title AS course_title, e.enrolled_at
      FROM enrollments e
      JOIN "User" u ON u.id = e.user_id
      JOIN courses c ON c.id = e.course_id`;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Start server ----------
createTables()
  .then(() => app.listen(5000, () => console.log('Database connected. Server running at http://localhost:5000')))
  .catch((err) => console.error('Table error:', err));