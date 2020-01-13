const db = require('../database');
const bcrypt = require('bcrypt');
const path = require('path');
const redis = require('redis');
const util = require('util');
const ip = require('ip');

const client = redis.createClient();
const redisGet = util.promisify(client.get).bind(client);
const serverIP = `52.14.107.193:8080`;

/* USER ACCOUNTS */
async function hashPassword(password) {
  return await bcrypt.hash(password, 5) // 5 rounds
}

async function userLogin(req, res) {
  let stat = await db.getUser(req.body.username, req.body.password);
  if(stat.status != 200) {
    return res.sendStatus(stat.status);
  }
  req.session.user = stat.username;
  res.cookie('username', stat.username, { maxAge: 600000 });
  return res.status(200).send(stat.username);
}

async function addUser(req, res) {
  let hashedPassword = await hashPassword(req.body.password);
  let user = {
    "username": req.body.username,
    "password": hashedPassword
  }
  let status = await db.addUser(user);
  return res.sendStatus(status);
}

/* DOCUMENTS  */
function isAuthorized(sessionUser, username) {
  if(sessionUser != username) {
    return false;
  }
  return true;
}

function resetPin(file) {
  let newPin = Math.floor(1000 + Math.random() * 9000);
  client.set(file, newPin);
}

async function getStaticFile(req, res) {
  if(!req.query.pin) {
    return res.sendFile(path.resolve(`${__dirname}/../frontend/fileRequest.html`));
  }
  let pin = await redisGet(req.params.fileName);
  if(pin != req.query.pin) {
    return res.status(401).send("Incorrect PIN");
  }
  resetPin(req.params.fileName);
  let q = await db.getFileName(req.params.fileName);
  return res.download(path.resolve(`${__dirname}/../uploads/${req.params.fileName}`), q.name);
}

async function getFiles(req, res) {
  if(isAuthorized(req.session.user, req.params.username)) {
    let files = await db.getFiles(req.params.username);
    const result = files.result.map(async (entry) => {
      return {
        ...entry,
        path: `http://${serverIP}/file/${entry.path.split("/")[1]}`,
        pin: await redisGet(entry.path.split("/")[1])
      }
    });
    return res.status(files.status).send(await Promise.all(result));
  }
  return res.status(403).send("You don't have the privileges to view this resource");
}

async function addFile(req, res) {
  if(isAuthorized(req.session.user, req.params.username)) {
    let status = await db.addFile(req.params.username, req.file);
    if(status == 200) {
      let pin = Math.floor(1000 + Math.random() * 9000);
      client.set(req.file.path.split("/")[1], pin);
      let rsp = {
        'pin': pin.toString(),
        'path': `${serverIP}/file/${req.file.path.split("/")[1]}`
      }
      return res.status(200).send(rsp);
    }
    return res.status(500);
  }
  return res.status(403).send("You don't have the privileges to view this resource");
}

async function renameFile(req, res) {
  if(isAuthorized(req.session.user, req.params.username)) {
    let status = await db.renameFile(req.params.username, req.params.fileID, req.query.newName);
    return res.sendStatus(status);
  }
  return res.status(403).send("You don't have the privileges to view this resource");
}

async function deleteFile(req, res) {
  if(isAuthorized(req.session.user, req.params.username)) {
    let status = await db.deleteFile(req.params.username, req.params.fileID);
    return res.sendStatus(status);
  }
  return res.status(403).send("You don't have the privileges to view this resource");
}

module.exports = { userLogin, addUser, resetPin, getStaticFile, getFiles, addFile, renameFile, deleteFile };
