
const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    secret: "student-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// ================= MYSQL CONNECTION =================
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "student",
  password: process.env.DB_PASSWORD || "studentpass",
  database: process.env.DB_NAME || "studentdb",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

// ================= CREATE TABLES =================
db.query(`
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  password VARCHAR(255)
)`);

db.query(`
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  dob DATE,
  class VARCHAR(50),
  subject VARCHAR(100),
  marks INT
)`);

// ================= UI TEMPLATE =================
const pageLayout = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: linear-gradient(to right, #4facfe, #00f2fe); }
    .card { border-radius: 15px; }
  </style>
</head>
<body>
<div class="container mt-5">
  <div class="card shadow-lg p-4">
    ${content}
  </div>
</div>
</body>
</html>
`;

// ================= ROOT ROUTE (FIXED) =================
app.get("/", (req, res) => {
  res.redirect("/login");
});

// ================= HEALTH CHECK =================
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP" });
});

// ================= REGISTER =================
app.get("/register", (req, res) => {
  res.send(pageLayout("Register", `
    <h3 class="text-center">User Registration</h3>
    <form method="POST" action="/register">
      <input class="form-control mb-3" name="username" placeholder="Username" required />
      <input class="form-control mb-3" type="password" name="password" placeholder="Password" required />
      <button class="btn btn-primary w-100">Register</button>
      <a href="/login" class="d-block text-center mt-3">Login</a>
    </form>
  `));
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hash],
    (err) => {
      if (err) return res.send("User already exists");
      res.redirect("/login");
    }
  );
});

// ================= LOGIN =================
app.get("/login", (req, res) => {
  res.send(pageLayout("Login", `
    <h3 class="text-center">Login</h3>
    <form method="POST" action="/login">
      <input class="form-control mb-3" name="username" placeholder="Username" required />
      <input class="form-control mb-3" type="password" name="password" placeholder="Password" required />
      <button class="btn btn-success w-100">Login</button>
    </form>
  `));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (results.length === 0) return res.send("Invalid user");

      const match = await bcrypt.compare(password, results[0].password);
      if (!match) return res.send("Wrong password");

      req.session.user = username;
      res.redirect("/dashboard");
    }
  );
});

// ================= DASHBOARD =================
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  res.send(pageLayout("Dashboard", `
    <h3>Welcome ${req.session.user}</h3>
    <a href="/add-student" class="btn btn-primary mb-3">Add Student</a>
    <a href="/students" class="btn btn-info mb-3">View Students</a>
    <a href="/logout" class="btn btn-danger mb-3">Logout</a>
  `));
});

// ================= ADD STUDENT =================
app.get("/add-student", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  res.send(pageLayout("Add Student", `
    <h3>Add Student</h3>
    <form method="POST" action="/add-student">
      <input class="form-control mb-2" name="name" placeholder="Name" required />
      <input class="form-control mb-2" type="date" name="dob" required />
      <input class="form-control mb-2" name="class" placeholder="Class" required />
      <input class="form-control mb-2" name="subject" placeholder="Subject" required />
      <input class="form-control mb-2" type="number" name="marks" placeholder="Marks" required />
      <button class="btn btn-success w-100">Save</button>
    </form>
  `));
});

app.post("/add-student", (req, res) => {
  const { name, dob, class: studentClass, subject, marks } = req.body;

  db.query(
    "INSERT INTO students (name, dob, class, subject, marks) VALUES (?, ?, ?, ?, ?)",
    [name, dob, studentClass, subject, marks],
    () => res.redirect("/students")
  );
});

// ================= VIEW STUDENTS =================
app.get("/students", (req, res) => {
  db.query("SELECT * FROM students", (err, results) => {
    if (err) return res.send("Error fetching students");

    let rows = results.map((s) => `
      <tr>
        <td>${s.id}</td>
        <td>${s.name}</td>
        <td>${s.dob ? s.dob.toISOString().split("T")[0] : ""}</td>
        <td>${s.class}</td>
        <td>${s.subject}</td>
        <td>${s.marks}</td>
      </tr>
    `).join("");

    res.send(pageLayout("Students List", `
      <h3>Students</h3>
      <table class="table table-bordered">
        <thead class="table-dark">
          <tr>
            <th>ID</th><th>Name</th><th>DOB</th><th>Class</th><th>Subject</th><th>Marks</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <a href="/dashboard" class="btn btn-secondary">Back</a>
    `));
  });
});

// ================= LOGOUT =================
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ================= START SERVER =================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
