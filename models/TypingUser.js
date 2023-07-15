const mongoose = require('mongoose');

const TypingUserSchema = new mongoose.Schema({
    userName: String,
    colors: {
        text: { type: String, default: '#000000' },
        background: { type: String, default: '#ffffff' }
    },
    rooms: String
}, { timestamps: true });

const TypingUserModal = mongoose.model('User', TypingUserSchema);

module.exports = TypingUserModal;