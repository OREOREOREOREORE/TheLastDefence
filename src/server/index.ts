import express from 'express';
import ViteExpress from 'vite-express';
import fs from 'fs';
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import argon2 from 'argon2'


import { Server } from 'socket.io';
import { createServer } from 'node:http';

import process from 'node:process';

const app = express();
const httpServer = createServer(app);
const websocketServer = new Server(httpServer);

app.use(express.static('frontend'));
app.use(express.json())
app.use(cookieParser());

const secretKey = crypto.randomBytes(48).toString('hex');

ViteExpress.config({
  mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
});

app.get('/message', (_, res) => res.send('Hello from express!'));

websocketServer.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

/*Login System*/
function containWordCharsOnly(text: string) {
    return /^\w+$/.test(text);
}


app.post('/login', async (req, res)=>{
  const {username, password} = req.body;
  const users = JSON.parse(String(fs.readFileSync("data/users.json")))

  if (!(username in users)) {res.json({error: "username not registered"});return;}

  const user = users[username];

  const verified = await argon2.verify(user.password, password);
  if (verified){
    const token = jwt.sign({name: username}, secretKey, {expiresIn: '30m'});
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false, //true
      maxAge: 30 * 60 * 10000
    })
    return res.json({success: true, user: {username}} );
  }
  res.json({error: "incorrect password or username"});
  // console.log(typeof users);
})

app.get('/validate', (req, res)=>{
  const token = req.cookies.auth_token;
  if(!token) {res.json({error:"cookie expired!"}); return;};

  try {
    const verified = jwt.verify(token, secretKey) as {name: string};
    res.json({success: true, user: {username: verified.name}});
  } catch {
    res.json({error: "Invalid or expired token"});
  }
})

app.get('/signout', (_, res)=>{
  res.clearCookie('auth_token');
  res.json({success: true});
})

app.post('/register', async (req, res) => {
  const {username, password} = req.body;

  const users = JSON.parse(String(fs.readFileSync("data/users.json")))
  // console.log(req.body);
  // console.log(users);
  // console.log(username, password)

  if (!username || !password) {res.json({ error: "Username/password cannot be empty." }); return;}
  if (!containWordCharsOnly(username)) {res.json({ error: "username can only contain underscores, letters or numbers." }); return;}
  if (username in users){res.json({ error: "username has already been used." }); return;}

  const hashed = await argon2.hash(password);

  users[username] = {
    password: hashed
  }

  fs.writeFileSync("data/users.json",JSON.stringify(users, null, 2));


  res.json({success: true});

})


await ViteExpress.bind(app, httpServer);
httpServer.listen(8000, () => {
  console.log('Server is running on http://localhost:8000');
});
