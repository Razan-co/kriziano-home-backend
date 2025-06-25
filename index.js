const express = require('express')
const { config } = require("dotenv")
const cors=require('cors')
const error = require('./src/middlewares/error')
const routes = require('./src/routes/main')
const { swaggerUi, specs } = require('./src/config/swagger')
const connectDb = require('./src/config/db')
config()
connectDb()

const app = express()

// app.use(cors({
//   origin: 'http://localhost:4747',
//   credentials: true
// }))
app.use(express.json())

//routes
app.use('/auth',require('./src/routes/authRoute'))
app.use('/product',require('./src/routes/productRoutes'))
app.use('/order',require('./src/routes/orderRoute'))


app.use(error)// error middleware

app.listen(process.env.PORT, () => {
    console.log(`server started and running on port ${process.env.PORT} in ${process.env.NODE_ENV}`)
})


