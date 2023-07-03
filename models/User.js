const mongoose = require('mongoose');

const UserSchems = new mongoose.Schema({
    userName: String
}, {timestamps:true});

const UserModal = mongoose.model('User', UserSchems);

module.exports = UserModal;