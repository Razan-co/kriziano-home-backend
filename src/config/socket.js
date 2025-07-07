// orderSocket.js

const Order = require('../models/orderModel')
const Product = require('../models/productModel')
const { Server } = require('socket.io')

function orderSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT']
    }
  })

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id)

    // Join buyer or seller room based on userId
    socket.on('joinRoom', (userId) => {
      socket.join(userId)
      console.log(`👤 User joined room: ${userId}`)
    })

    // Emit real-time order update
    socket.on('orderStatusUpdate', async ({ orderId, buyerId, status }) => {
      // Notify buyer
      io.to(buyerId).emit('orderUpdate', { orderId, status })

      // Optionally notify seller room if needed (not shown here)
    })

    // Emit cancel approval/rejection to buyer
    socket.on('cancelResponse', async ({ buyerId, response }) => {
      io.to(buyerId).emit('cancelStatus', response)
    })

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id)
    })
  })
}

module.exports = orderSocketServer