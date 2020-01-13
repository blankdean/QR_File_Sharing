const path = require('path');
const multer = require('multer');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const api = require('./api');
const db = require('./database');

const app = express();
const upload = multer({ dest: 'uploads' }); 
const server = app.listen(8080, () => console.log(`Server is running on port ${server.address().port}!`));

app.use('/login', express.static('frontend'));
app.use('/register', express.static('frontend'));
app.use('/', express.static('frontend'));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    key: 'user_sid',
    secret: 'cs275final',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));

db.connectToDb();
db.eventEmitter.once('failed-con', () => server.close());

/* GENERAL  */
app.get('/', requiresLogin, (req, res) => res.sendFile(path.join(__dirname + '/frontend/dashboard.html')));

/* USER ACCOUNT  */
app.post('/user', api.addUser);
app.get('/register', (req, res) => {
  if(req.session.user && req.cookies.user_sid) {
    return res.redirect('/');
  }
  return res.sendFile(path.join(__dirname + '/frontend/register.html'))
});
app.get('/logout', requiresLogin, (req, res) => {
  res.cookie('username', '');
  res.cookie('user_sid', '');
  req.session.destroy();
  res.sendStatus(200);
});
app.post('/login', api.userLogin);
app.get('/login', (req, res) => {
  if(req.session.user && req.cookies.user_sid) {
    return res.redirect('/');
  }
  return res.sendFile(path.join(__dirname + '/frontend/login.html'))
});
function requiresLogin(req, res, next) {
  if(req.session.user && req.cookies.user_sid) {
    return next();
  }
  return res.redirect('/login');
}

/* DOCUMENTS  */
app.get('/file/:fileName', api.getStaticFile);
app.get('/:username/files', requiresLogin, api.getFiles);
app.post('/:username', requiresLogin, upload.single('file'), api.addFile);
app.patch('/:username/:fileID', requiresLogin, api.renameFile);
app.delete('/:username/:fileID', requiresLogin, api.deleteFile);
