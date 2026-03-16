const express = require("express");
const Database = require("better-sqlite3");
const session = require("express-session");

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
app.post("/contact", (req, res) => {

    const { name, email, message } = req.body;

    try {

        db.prepare(
            "INSERT INTO leads (name,email,message) VALUES (?,?,?)"
        ).run(name, email, message);

        res.send(`
            <h2>Thank you ${name}!</h2>
            <p>Your message has been saved.</p>
            <a href="/">Return Home</a>
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