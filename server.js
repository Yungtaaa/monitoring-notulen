const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path'); // Tambahan module path untuk keamanan file

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// =======================
// 🌐 KONFIGURASI FRONTEND (PENTING UNTUK RAILWAY)
// =======================
// Baris ini membuat server bisa membaca file dashboard.html dan css/js lain di folder yang sama
app.use(express.static(__dirname)); 

// =======================
// 🗄️ KONEKSI DATABASE (SMART CONFIG)
// =======================
const dbConfig = {
    // Server akan cek: "Apakah aku sedang di Railway?"
    // Jika YA (ada process.env), pakai data Railway.
    // Jika TIDAK, pakai data Localhost (XAMPP).
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'database notulen',
    port: process.env.MYSQLPORT || 3306
};

async function queryDatabase(query, params) {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const [results, ] = await connection.execute(query, params);
        return results;
    } finally {
        connection.end();
    }
}

// =======================
// 🔐 FITUR AUTH (LOGIN)
// =======================

// 1. LOGIN CHECK
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
        const users = await queryDatabase(sql, [username, password]);

        if (users.length > 0) {
            const user = users[0];
            res.json({ 
                success: true, 
                message: 'Login Berhasil',
                data: { id: user.id, username: user.username, fullname: user.fullname, role: user.role }
            });
        } else {
            res.status(401).json({ success: false, message: 'Username atau Password salah!' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. AMBIL SEMUA USER
app.get('/api/users', async (req, res) => {
    try {
        const users = await queryDatabase("SELECT id, username, fullname, role FROM users");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. TAMBAH USER BARU
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, fullname, role } = req.body;
        const sql = "INSERT INTO users (username, password, fullname, role) VALUES (?, ?, ?, ?)";
        await queryDatabase(sql, [username, password, fullname, role]);
        res.json({ message: 'User berhasil dibuat' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. HAPUS USER
app.delete('/api/users/:id', async (req, res) => {
    try {
        await queryDatabase("DELETE FROM users WHERE id = ?", [req.params.id]);
        res.json({ message: 'User dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// =======================
// 📄 FITUR NOTULEN
// =======================

// READ
app.get('/api/documents', async (req, res) => {
    try {
        const docs = await queryDatabase('SELECT * FROM `tabel notulen` ORDER BY id_notulen DESC');
        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
app.post('/api/documents', async (req, res) => {
    try {
        const { nomor_notulen, nama_notulen, tanggal_notulen, jenis, status_notulen } = req.body;
        const sql = `INSERT INTO \`tabel notulen\` (nomor_notulen, nama_notulen, tanggal_notulen, jenis, status_notulen) VALUES (?, ?, ?, ?, ?)`;
        const result = await queryDatabase(sql, [nomor_notulen, nama_notulen, tanggal_notulen, jenis, status_notulen]);
        res.json({ message: 'Berhasil disimpan', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
app.put('/api/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nomor_notulen, nama_notulen, tanggal_notulen, jenis, status_notulen } = req.body;
        const sql = `UPDATE \`tabel notulen\` SET nomor_notulen=?, nama_notulen=?, tanggal_notulen=?, jenis=?, status_notulen=? WHERE id_notulen=?`;
        await queryDatabase(sql, [nomor_notulen, nama_notulen, tanggal_notulen, jenis, status_notulen, id]);
        res.json({ message: 'Data berhasil diupdate' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
app.delete('/api/documents/:id', async (req, res) => {
    try {
        const sql = 'DELETE FROM `tabel notulen` WHERE id_notulen = ?';
        await queryDatabase(sql, [req.params.id]);
        res.json({ message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =======================
// 🚀 ROUTING HALAMAN UTAMA (PENYELESAI MASALAH "Cannot GET /")
// =======================
// Jika user membuka halaman utama ('/'), kirim file dashboard.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// =======================
// 🔌 START SERVER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
});