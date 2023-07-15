const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const TypingUser = require('./models/TypingUser');
const Room = require('./models/Room');
const jwt = require('jsonwebtoken');
const cors = require('cors');

require('dotenv').config();

mongoose.connect(process.env.MONGO_URL);

const jwtSecret = process.env.JWT_SECRET;

const app = express();

app.use(cors({
    credentials: true,
    origin: ['http://127.0.0.1:5173', 'https://bazikalo.vercel.app', 'http://localhost:5173'],
}));
app.use(express.json());
app.use(express.static("public"));
app.options('*', cors());

app.get('/test', (req, res) => {
    res.json('test ok');
});

app.post('/auth', async (req, res) => {
    const { userName } = req.body;
    const createdUser = await User.create({ userName });
    jwt.sign({ createdUser }, jwtSecret, {}, (err, token) => {
        if (err) throw err;
        res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json(createdUser);
    });
});

app.put('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const result = await User.findByIdAndUpdate(userId, req.body, { new: true });
    if (!result) {
        throw new Error('User is not found');
    };
    res.json(result);
});

app.post('/rooms', async (req, res) => {
    const { newRoom } = req.body;
    const createdRoom = await Room.create(newRoom);
    const roomId = createdRoom._id.toString();
    res.json(createdRoom).status(201);
    newRoom.activeUsers.forEach(async (userId) => {
        try {
            const user = await User.findById(userId);
            if (user) {
                const result = await User.findByIdAndUpdate(userId, { rooms: [...user.rooms, roomId] }, { new: true });
            }
        } catch {
            console.log('error id');
        }

    })
})

// покинути кімнату
app.put('/rooms/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const { userId } = req.body;
    const room = await Room.findById(roomId);
    if (!room) {
        res.json("bad request, wrong room id").status(400);
        return
    };
    const activeUsers = room.activeUsers.filter(id => id !== userId);
    await Room.findByIdAndUpdate(roomId, { activeUsers }, { new: true });
    if (room.activeUsers.length < 2 && roomId !== '64a99b9d5dca528b9636b96b') {
        await Room.findOneAndRemove({ _id: roomId })
    };
    const user = await User.findById(userId);
    if (!user) {
        res.json("bad request, wrong user id").status(400);
        return;
    }
    const newRooms = user.rooms.filter(room => room !== roomId);
    await User.findByIdAndUpdate(userId, { rooms: newRooms }, { new: true });
    res.json('room successfully left').status(201);
});

// ввійти в існуючу кімнату
app.patch('/rooms/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const { userId } = req.body;
    let room = await Room.findById(roomId);
    if (!room) {
        res.json("bad request, wrong room id").status(400);
        return
    };
    if (!room.activeUsers.includes(roomId)) {
        const activeUsers = [...room.activeUsers, userId];
        room = await Room.findByIdAndUpdate(roomId, { activeUsers }, { new: true });
    }
    const user = await User.findById(userId);
    if (!user) {
        res.json("bad request, wrong user id").status(400);
        return;
    }
    const newRooms = [...user.rooms, roomId];
    await User.findByIdAndUpdate(userId, { rooms: newRooms }, { new: true });
    res.json(room).status(201);
});

const server = app.listen(4000);


const { Server } = require("socket.io");

const io = new Server(server, {
    cors: {
        origin: ['http://127.0.0.1:5173', 'https://bazikalo.vercel.app', 'http://localhost:5173'],
    }
});

io.on("connection", (socket) => {

    socket.on("messages", message => {
        io.emit("messages", message);
    });

    socket.on("userConnect", async (user) => {
        if (user._id === '') {
            return;
        }
        socket.broadcast.emit('userConnect', user)
        const userInDataBase = await User.findById(user._id);
        if (!userInDataBase) {
            User.create(user);
        } else {
            User.findByIdAndUpdate(user._id, user, { new: true });
        }
        const generalRoom = await Room.findById('64a99b9d5dca528b9636b96b');
        if (generalRoom.activeUsers.includes(user._id)) {
            return;
        }
        const activeUsers = [...generalRoom.activeUsers, user._id];
        await Room.findByIdAndUpdate('64a99b9d5dca528b9636b96b', { activeUsers }, { new: true });
    });

    socket.on("userDisconnect", async (user) => {
        if (user._id === '') {
            return;
        }
        socket.broadcast.emit('userDisconnect', user)
        const userInDataBase = await User.findById(user._id);
        if (userInDataBase) {
            await User.findByIdAndDelete(userInDataBase._id);
            userInDataBase.rooms.forEach(async (roomId) => {
                const room = await Room.findById(roomId);
                if (!room) { return };
                const activeUsers = room.activeUsers.filter(id => id !== user._id);
                await Room.findByIdAndUpdate(roomId, { activeUsers }, { new: true });
                if (room.activeUsers.length < 2 && roomId !== '64a99b9d5dca528b9636b96b') {
                    await Room.findOneAndRemove({ _id: roomId })
                }
            })
        }
    });

    socket.on("startTyping", async (user) => {
        if (user._id === '') {
            return;
        }
        socket.broadcast.emit('startTyping', user)
        const userInDataBase = await TypingUser.findById(user._id);
        if (!userInDataBase) {
            TypingUser.create(user);
        } else {
            TypingUser.findByIdAndUpdate(user._id, user, { new: true });
        }
    });

    socket.on("stopTyping", async (user) => {
        if (user._id === '') {
            return;
        }
        socket.broadcast.emit('stopTyping', user)
        const userInDataBase = await TypingUser.findById(user._id);
        if (userInDataBase) {
            await TypingUser.findByIdAndDelete(userInDataBase._id);
        }
    });

    User.watch().on('change', async () => {
        const onlineUsers = await User.find();
        io.emit("onlineUsers", onlineUsers);
    });

    TypingUser.watch().on('change', async () => {
        const typingUsers = await TypingUser.find();
        io.emit("typingUsers", typingUsers);
    });

    Room.watch().on('change', async () => {
        const allRooms = await Room.find();
        io.emit("allRooms", allRooms);
    });

});




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