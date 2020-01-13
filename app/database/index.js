const fs = require('fs');
const path = require('path');
const util = require('util');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const EventEmitter = require('events').EventEmitter;
const eventEmitter = new EventEmitter();

var con;
var query;

const unlink = util.promisify(fs.unlink);

function connectToDb() {
  const credentials = fs.readFileSync('./database/credentials.db', 'utf8').split('\n');
  con = mysql.createConnection({
    host: credentials[0],
    user: credentials[1],
    password: credentials[2],
    database: credentials[3]
  });
  con.connect(err => {
    if(err) {
      console.log(`Could not connect to the database. ${err}`);
      console.log('Stopping the server!');
      eventEmitter.emit('failed-con');
    } else {
      console.log('Successfully connected to the database');
      query = util.promisify(con.query).bind(con);
    }
  });
}

/* USER ACCOUNT */
async function getUser(username, password) {
  try {
    let q = await query(`select password from USER where username = ${mysql.escape(username)}`);
    if(!q.length) {
      return { 'status': 401 };
    }
    let hashedPassword = q[0].password;
    let match = await bcrypt.compare(password, hashedPassword);
    if(match) {
      return {
        'status': 200,
        'username': username
      }
    } else {
      return { 'status': 401 }
    }
  } catch(err) {
    console.log(`Could not check login information for user with username ${username}`);
    return { 'status': 500 };
  }
}

async function addUser(user) {
  try {
    let dup = await query(`select username from USER where username = ${mysql.escape(user.username)}`);
    if(dup.length) {
      console.log(`User with user name ${user.username} already exists`);
      return 400;
    }
    await query(`insert into USER (username, password) values (${mysql.escape(user.username)}, ${mysql.escape(user.password)})`);
    return 200;
  } catch(err) {
    console.log(`Error adding user. ${err}`);
    return 500;
  }
}

/* DOCUMENTS */
async function getFileName(file) {
  try {
    let fileName = await query(`select name from FILE where path=${mysql.escape('uploads/'+file)}`);
    return { 'status': 200, 'name': fileName[0].name };
  } catch(err) {
    console.log(`Error when getting file name. ${err}`);
    return {'status': 500 };
  }
}
async function getFiles(username) {
  try {
    let result = await query(`select fileID, name, path, type, size, upload_date from FILE where userID = (select userID from USER where username = ${mysql.escape(username)})`);
    return {
      'status': 200,
      'result': result
    };
  } catch(err) {
    console.log(`Error getting files for user ${username}. ${err}`);
    return {
      'status': 500,
      'result': `Error getting files for user ${username}. ${err}`
    };
  }
}

async function addFile(username, file) {
  try {
    let currentDate = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    await query(`insert into FILE (userID, name, path, type, size, upload_date) values ((select userID from USER where username = ${mysql.escape(username)}), ${mysql.escape(file.originalname)}, '${file.path}', '${file.mimetype.split("/")[1]}', '${file.size}', '${currentDate}')`);
    return 200;
  } catch(err) {
    console.log(`Error adding file. ${err}`);
    return 500;
  }
}

async function renameFile(username, fileID, newName) {
  try {
    let result = await query(`select * from FILE where userID = (select userID from USER where username = ${mysql.escape(username)}) and fileID = ${mysql.escape(fileID)}`);
    if(result.length == 0) {
        return 400;
    }
    await query(`update FILE set name = ${mysql.escape(newName)} where fileID = ${mysql.escape(fileID)}`);
    return 200;
  } catch(err) {
    console.log(`Error renaming file with ID ${fileID}. ${err}`);
    return 500;
  }
}

async function deleteFile(username, fileID) {
  try {
    let result = await query(`select * from FILE where userID = (select userID from USER where username = ${mysql.escape(username)}) and fileID = ${mysql.escape(fileID)}`);
    if(result.length == 0) {
        return 400;
    }
    let uri = result[0].path;
    await unlink(path.resolve(`${__dirname}/../${uri}`)); 
    await query(`delete from FILE where fileID = ${mysql.escape(fileID)}`);
    return 200;
  } catch(err) {
    console.log(`Error deleting file with ID ${fileID}. ${err}`);
    return 500;
  }
}

module.exports = { connectToDb, getUser, addUser, getFileName, getFiles, addFile, renameFile, deleteFile, eventEmitter };
