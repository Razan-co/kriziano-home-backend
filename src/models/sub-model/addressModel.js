const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        required: [true, "Provide user ID"],
        ref: "user"
    },
    buildingOrHouseNo: {
        type: String,
        required: [true, 'Building or House Number is required'],
        trim: true
    },
    street: {
        type: String,
        required: [true, 'Street is required'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
    },
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
    },
    pinCode: {
        type: String,
        required: [true, 'Postal code is required'],
        trim: true
    },
    country: {
        type: String,
        default: 'India',
        trim: true
    },
    type: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
    },
    isDefault: {
        type: Boolean,
        default: false
    }
})


const AdressModel=mongoose.model('address',addressSchema)

module.exports = {addressSchema,AdressModel}