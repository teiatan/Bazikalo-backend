const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const ws = require('ws');

require('dotenv').config();

mongoose.connect(process.env.MONGO_URL);

const jwtSecret = process.env.JWT_SECRET;

const app = express();

app.use(cors({
    credentials: true,
    origin: 'http://127.0.0.1:5173' /* 'https://bazikalo.vercel.app/' */,
  }));
app.use(express.json());
app.use(express.static("public"));
app.options('*', cors());

app.post('/auth', async (req, res) => {
    const {userName} = req.body;
    const createdUser = await User.create({userName});
    jwt.sign({userId:createdUser._id}, jwtSecret, {}, (err, token)=>{
        if(err) throw err;
        res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json(createdUser);
    });
});

const server = app.listen(4000);

const wss = new ws.WebSocketServer({server});
wss.on('connection', (connection, req) => {
    console.log('front connected');
    console.log(req.headers);
    connection.send('hello');
    const cookies = req.headers.cookie;
    if(cookies)  {
        const tokenCookieString = cookies.split(';').find(string => string.startsWith('token='))
    }
});