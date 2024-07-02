const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  // set type of data
  fullName: { type: String },
  email: { type: String },
  password: { type: String },
  createdOn: { type: Date, default: new Date().getTime() }, // default .getTime
});

// export for use
module.exports = mongoose.model("User", userSchema);
