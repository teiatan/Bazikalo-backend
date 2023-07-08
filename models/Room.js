const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    name: String,
    colors: {
        text: {type: String, default: '#000000'},
        background: {type: String, default: '#ffffff'}
    },
    activeUsers: Array,
    type: String
}, {timestamps:true});

const RoomModal = mongoose.model('Room', RoomSchema);

module.exports = RoomModal;