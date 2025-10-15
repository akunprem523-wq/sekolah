const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const initDB = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './data' }),
  secret: 'keyboard cat 123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}));

let db;
initDB().then(database => { db = database; }).catch(err => { console.error(err); process.exit(1); });

// Middleware auth
function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.redirect('/login');
}

// Routes
app.get('/', (req, res) => res.redirect('/dashboard'));

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);
  if (!admin) return res.render('login', { error: 'Username tidak ditemukan' });
  const ok = await bcrypt.compare(password, admin.password);
  if (!ok) return res.render('login', { error: 'Password salah' });
  req.session.adminId = admin.id;
  req.session.username = admin.username;
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', requireAuth, async (req, res) => {
  const studentsCount = (await db.get('SELECT COUNT(*) as cnt FROM students')).cnt;
  const teachersCount = (await db.get('SELECT COUNT(*) as cnt FROM teachers')).cnt;
  res.render('dashboard', { user: req.session.username, studentsCount, teachersCount });
});

// Students CRUD
app.get('/students', requireAuth, async (req, res) => {
  const students = await db.all('SELECT * FROM students ORDER BY id DESC');
  res.render('students', { students });
});

app.get('/students/add', requireAuth, (req, res) => res.render('student_form', { student: null }));
app.post('/students/add', requireAuth, async (req, res) => {
  const { nis, name, kelas, alamat, phone } = req.body;
  try {
    await db.run('INSERT INTO students (nis, name, kelas, alamat, phone) VALUES (?, ?, ?, ?, ?)', [nis, name, kelas, alamat, phone]);
    res.redirect('/students');
  } catch (e) {
    res.send('Error: ' + e.message);
  }
});

app.get('/students/edit/:id', requireAuth, async (req, res) => {
  const student = await db.get('SELECT * FROM students WHERE id = ?', [req.params.id]);
  res.render('student_form', { student });
});
app.post('/students/edit/:id', requireAuth, async (req, res) => {
  const { nis, name, kelas, alamat, phone } = req.body;
  await db.run('UPDATE students SET nis=?, name=?, kelas=?, alamat=?, phone=? WHERE id=?', [nis, name, kelas, alamat, phone, req.params.id]);
  res.redirect('/students');
});

app.post('/students/delete/:id', requireAuth, async (req, res) => {
  await db.run('DELETE FROM students WHERE id = ?', [req.params.id]);
  res.redirect('/students');
});

// Teachers CRUD (sederhana)
app.get('/teachers', requireAuth, async (req, res) => {
  const teachers = await db.all('SELECT * FROM teachers ORDER BY id DESC');
  res.render('teachers', { teachers });
});

app.get('/teachers/add', requireAuth, (req, res) => res.render('teacher_form', { teacher: null }));
app.post('/teachers/add', requireAuth, async (req, res) => {
  const { nidn, name, subject, phone } = req.body;
  await db.run('INSERT INTO teachers (nidn, name, subject, phone) VALUES (?, ?, ?, ?)', [nidn, name, subject, phone]);
  res.redirect('/teachers');
});

app.get('/teachers/edit/:id', requireAuth, async (req, res) => {
  const teacher = await db.get('SELECT * FROM teachers WHERE id = ?', [req.params.id]);
  res.render('teacher_form', { teacher });
});
app.post('/teachers/edit/:id', requireAuth, async (req, res) => {
  const { nidn, name, subject, phone } = req.body;
  await db.run('UPDATE teachers SET nidn=?, name=?, subject=?, phone=? WHERE id=?', [nidn, name, subject, phone, req.params.id]);
  res.redirect('/teachers');
});

app.post('/teachers/delete/:id', requireAuth, async (req, res) => {
  await db.run('DELETE FROM teachers WHERE id = ?', [req.params.id]);
  res.redirect('/teachers');
});

// Jalankan server
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
