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
    origin: ['http://127.0.0.1:5173', 'https://bazikalo.vercel.app'],
  }));
app.use(express.json());
app.use(express.static("public"));
app.options('*', cors());

app.get('/test', (req,res) => {
  res.json('test ok');
});

app.post('/auth', async (req, res) => {
    const {userName} = req.body;
    const createdUser = await User.create({userName});
    jwt.sign({createdUser}, jwtSecret, {}, (err, token)=>{
        if(err) throw err;
        res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json(createdUser);
    });
});

app.put('/user/:userId', async (req, res) => {
    const {userId} = req.params;
    const result = await User.findByIdAndUpdate(userId, req.body, {new: true});
    if(!result) {
        throw new Error('User is not found');
      };
    res.json(result);
});

const server = app.listen(4000);

// const wss = new ws.WebSocketServer({server});
// wss.on('connection', (connection, req) => {
//     console.log('front connected');
//     connection.send('hello');
//     const cookies = req.headers.cookie;
//     if(cookies)  {
//         const tokenCookieString = cookies.split(';').find(string => string.startsWith('token='));
//         if (tokenCookieString) {
//             const token = tokenCookieString.split('=')[1];
//             if (token) {
//                 jwt.verify(token, jwtSecret, {}, (err, userData)=>{
//                     if (err) throw err;
//                     // connection.userId = userData.createdUser._id;
//                     // connection.userData = userData.createdUser;
//                 })
//             }
//         }
//     }
// });

const { Server } = require("socket.io");

const io = new Server(server, {
    cors: {
        origin: ['http://127.0.0.1:5173', 'https://bazikalo.vercel.app'],
      }
});

io.on("connection", (socket) => {

    socket.on("userConnect", async (user) => {
        socket.broadcast.emit('userConnect', user)
        const userInDataBase = await User.findById(user._id);
        if(!userInDataBase) {
            console.log('create');
            User.create(user);
        } else {
            User.findByIdAndUpdate(user._id, user, {new: true});
        }
    });

    socket.on("messages", message => {
        io.emit("messages", message);
    });

    socket.on("userDisconnect", async (user) => {
        socket.broadcast.emit('userDisconnect', user)
        const userInDataBase = await User.findById(user._id);
        if(userInDataBase) {
            const result = await User.findOneAndRemove({_id: user._id});
        }
        const userrInDataBase = await User.findById(user._id);
        // console.log(userrInDataBase);
    });

    User.watch().on('change', async () => {
        const onlineUsers = await User.find();
        io.emit("onlineUsers", onlineUsers);
    });
});



