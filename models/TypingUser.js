const mongoose = require('mongoose');

const TypingUserSchema = new mongoose.Schema({
    userName: String,
    colors: {
        text: { type: String, default: '#000000' },
        background: { type: String, default: '#ffffff' }
    },
    room: String
}, { timestamps: true });

const TypingUserModal = mongoose.model('TypingUser', TypingUserSchema);

module.exports = TypingUserModal;