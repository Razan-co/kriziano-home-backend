const users = require('../others/dummy-data/dummyUsers.json')
const User = require('../models/userModel')
const { config } = require('dotenv')
const connectDb = require('../config/db')
config(); connectDb()


async function seed() {
    await User.deleteMany()
    console.log('\x1b[31m%s\x1b[0m', 'users deleted succesfully')
    //await User.insertMany(users)
    // console.log("\x1b[33m%s\x1b[0m", "users added to database successfully  ✅")
    for (const user of users) {
        await User.create(user)
        console.log("\x1b[33m%s\x1b[0m", `user ${user.name} added to database successfully`)
    }
process.exit(1)
}

seed()
