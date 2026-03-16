const express = require("express");
const Database = require("better-sqlite3");
const session = require("express-session");
const rateLimit = require("express-rate-limit");

const app = express();
//const PORT = 3000;

// Middleware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "gigot-ai-secret",
    resave: false,
    saveUninitialized: false
}));

const contactLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // max 5 submissions per IP
    message: "Too many messages sent. Please try again later."
});

// Database
const db = new Database("leads.db");
console.log("Connected to leads database");

// Create table
db.prepare(`
CREATE TABLE IF NOT EXISTS leads (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT,
email TEXT,
message TEXT,
date DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

// CONTACT FORM
app.post("/contact", contactLimiter, (req, res) => {

    const { name, email, message, company } = req.body;

    // Honeypot trap
    if (company) {
        return res.sendStatus(400);
    }

    // Input validation
    if (!name || !email || !message) {
        return res.send("All fields are required.");
    }

    if (message.length > 1000) {
        return res.send("Message too long.");
    }

    try {

        db.prepare(
            "INSERT INTO leads (name,email,message) VALUES (?,?,?)"
        ).run(name, email, message);

        res.send(`
<html>

<head>
<title>Message Received</title>

<style>

body{
font-family:Segoe UI,Arial;
background:radial-gradient(circle at top,#020617,#000);
color:white;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
margin:0;
}

.card{
text-align:center;
background:rgba(255,255,255,.05);
padding:40px;
border-radius:14px;
border:1px solid rgba(255,255,255,.1);
box-shadow:0 0 40px rgba(56,189,248,.25);
max-width:400px;
}

h2{
color:#38bdf8;
margin-bottom:10px;
}

p{
opacity:.9;
margin-bottom:25px;
}

a{
display:inline-block;
padding:12px 25px;
border-radius:10px;
background:linear-gradient(90deg,#38bdf8,#6366f1);
color:white;
text-decoration:none;
font-weight:bold;
box-shadow:0 0 20px rgba(56,189,248,.6);
transition:.3s;
}

a:hover{
transform:scale(1.05);
box-shadow:0 0 35px rgba(99,102,241,.9);
}

</style>

</head>

<body>

<div class="card">

<h2>🚀 Thank You ${name}!</h2>

<p>Your message has been received.<br>
We'll be in touch soon.</p>

<a href="/">Return Home</a>

</div>

</body>

</html>
`);

    } catch (err) {
        console.log(err);
        res.send("Database error");
    }

});

// LOGIN PAGE
app.get("/login", (req, res) => {

    res.send(`
    <html>
    <head>
    <title>Admin Login</title>
    </head>

    <body style="font-family:Arial;background:#0f172a;color:white;padding:40px">

    <form method="POST" action="/login">

    <h2>Admin Login</h2>

    <input type="text" name="username" placeholder="Username" required><br><br>
    <input type="password" name="password" placeholder="Password" required><br><br>

    <button type="submit">Login</button>

    </form>

    </body>
    </html>
    `);
});

// LOGIN AUTH
app.post("/login", (req, res) => {

    const { username, password } = req.body;

    if (username === "Quiggs" && password === "SecretWord!23") {
        req.session.loggedIn = true;
        return res.redirect("/leads");
    }

    res.send("Invalid login");
});

// AUTH CHECK
function requireLogin(req, res, next) {
    if (!req.session.loggedIn) {
        return res.redirect("/login");
    }
    next();
}

// LEADS DASHBOARD
app.get("/leads", requireLogin, (req, res) => {

    try {

        const rows = db.prepare(
            "SELECT * FROM leads ORDER BY date DESC"
        ).all();

        const tableRows = rows.map(lead => `
        <tr>
        <td>${lead.name}</td>
        <td>${lead.email}</td>
        <td>${lead.message}</td>
        <td>${lead.date}</td>

        <td>
        <form method="POST" action="/delete/${lead.id}" 
        onsubmit="return confirm('Delete this lead?')">

        <button type="submit">Delete</button>

        </form>
        </td>

        </tr>
        `).join("");

        res.send(`

        <html>

        <head>

        <title>Gigot AI Leads</title>

        <style>

        body{
        font-family:Arial;
        background:#0f172a;
        color:white;
        padding:40px;
        }

        h1{
        color:#38bdf8;
        }

        table{
        width:100%;
        border-collapse:collapse;
        margin-top:30px;
        }

        th, td{
        padding:12px;
        border-bottom:1px solid rgba(255,255,255,.1);
        }

        th{
        text-align:left;
        color:#38bdf8;
        }

        tr:hover{
        background:rgba(255,255,255,.05);
        }

        a{
        color:#38bdf8;
        text-decoration:none;
        margin-right:20px;
        }

        </style>

        </head>

        <body>

        <h1>Gigot AI Solutions - Lead Dashboard</h1>

        <a href="/logout">Logout</a>
        <a href="/">← Back to Homepage</a>

        <table>

        <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Message</th>
        <th>Date</th>
        <th>Delete</th>
        </tr>

        ${tableRows}

        </table>

        </body>

        </html>
        `);

    } catch (err) {
        console.log(err);
        res.send("Database error");
    }

});

app.post("/delete/:id", requireLogin, (req, res) => {

    try {

        db.prepare(
            "DELETE FROM leads WHERE id=?"
        ).run(req.params.id);

        res.redirect("/leads");

    } catch (err) {

        console.log(err);
        res.send("Error deleting lead");

    }

});

// LOGOUT
app.get("/logout", (req, res) => {

    req.session.destroy(() => {
        res.redirect("/login");
    });

});

// START SERVER
//app.listen(PORT, () => {
//    console.log(`Gigot AI Solutions running at http://localhost:${PORT}`);
//});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});