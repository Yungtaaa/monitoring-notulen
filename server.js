const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// =======================
// 🌐 KONFIGURASI FRONTEND
// =======================
app.use(express.static(__dirname));

// =======================
// 🗄️ KONEKSI DATABASE (SMART CONFIG v2 - GCP SUPPORT)
// =======================
// Kita siapkan konfigurasi dasar dulu
const dbConfig = {
    user: process.env.MYSQLUSER || 'root',
    // Gunakan password dari environment variable, atau fallback ke password yang kamu berikan
    password: process.env.MYSQLPASSWORD || 'Jakarta@2025', 
    database: process.env.MYSQLDATABASE || 'railway', // Pastikan nama DB di Cloud SQL adalah 'railway'
};

// LOGIKA PINTAR:
// Cek apakah kita punya 'INSTANCE_CONNECTION_NAME' (tanda kita ada di Google Cloud)
if (process.env.INSTANCE_CONNECTION_NAME) {
    // JIKA DI GOOGLE CLOUD: Pakai jalur Socket (Kabel Khusus)
    console.log(`🔌 Menghubungkan lewat Socket: ${process.env.INSTANCE_CONNECTION_NAME}`);
    dbConfig.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
} else {
    // JIKA DI LAPTOP/RAILWAY: Pakai jalur Host/IP biasa
    console.log('💻 Menghubungkan lewat TCP Host (Laptop/Local)');
    dbConfig.host = process.env.MYSQLHOST || 'localhost';
    dbConfig.port = process.env.MYSQLPORT || 3306;
}

async function queryDatabase(query, params) {
    // Buat koneksi baru setiap ada request (Stateless)
    const connection = await mysql.createConnection(dbConfig);
    try {
        const [results, ] = await connection.execute(query, params);
        return results;
    } finally {
        // Wajib tutup koneksi setelah selesai agar server tidak berat
        connection.end();
    }
}

// =======================
// 🔐 FITUR AUTH (LOGIN)
// =======================
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
        console.error("Login Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await queryDatabase("SELECT id, username, fullname, role FROM users");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
app.get('/api/documents', async (req, res) => {
    try {
        const docs = await queryDatabase('SELECT * FROM `tabel notulen` ORDER BY id_notulen DESC');
        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
// 🚀 ROUTING HALAMAN UTAMA
// =======================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// =======================
// 🔌 START SERVER
// =======================
const PORT = process.env.PORT || 8080; // Cloud Run default port is 8080
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
});