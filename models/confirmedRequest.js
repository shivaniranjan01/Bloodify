var mongoose = require("mongoose");
var confirmRequestSchema = new mongoose.Schema({
  userId: String,
  name: String,
  aadhar: String,
  units: Number,
  bloodGroup: String,
  rhFactor: String,
  date: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model("ConfirmedRequest",confirmRequestSchema);