const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
    userid: String,
    accountname: String,
    accountnumber: String,
    accounttype: String,
    ifsc: String,
    bankname: String,
    branchname: String,
    address: String,
    timestamp: { type: Date, default: Date.now },
});

const Bank = mongoose.model('bank', bankSchema);

module.exports = Bank;