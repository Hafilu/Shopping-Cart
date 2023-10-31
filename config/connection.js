const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`connected to db ${connect.connection.host}`);
  } catch (error) {
    console.log(`Error in db connection`);
    process.exit();
  }
};

module.exports = connectDb;
