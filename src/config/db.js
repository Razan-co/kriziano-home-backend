const { config } = require('dotenv')
const mongoose = require('mongoose')
config()

const connectDb = () => {
    mongoose.connect(process.env.MONGO_DB_URL).then(d => {
        console.log(`Database is connected to the host : ${d.connection.host}`)
    }).catch(e => {
        console.log(e.message)
    })
}

module.exports = connectDb