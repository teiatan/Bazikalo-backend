const mongoose = require('mongoose');

const UserSchems = new mongoose.Schema({
    userName: String,
    colors: {
        text: {type: String, default: '#000000'},
        background: {type: String, default: '#ffffff'}
    }
}, {timestamps:true});

const UserModal = mongoose.model('User', UserSchems);

module.exports = UserModal;