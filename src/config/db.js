const { config } = require('dotenv')
const mongoose=require('mongoose')
config()

const connectDb = ()=>{
 mongoose.connect(process.env.DB_LOCAL_URI).then(d=>{
    console.log(`Database is connected to the host : ${d.connection.host}`) 
}).catch(e => {
    console.log("testing :",process.env.DB_LOCAL_URI)
    console.log(e.message)   
})
}

module.exports=connectDb