"use strict"
const url = "mongodb://localhost:27017/game"
const {MongoClient} = require("mongodb")
// const assert = require("assert")
//
//const Server = require('mongodb').Server
//new Server("localhost", 27017)

// connect to database
const connectDB = testing => {
    return new Promise((resolve, reject) => {
        MongoClient.connect(url, (err, db) => {

            if (err){
                console.log("resolving")
                reject(err.message)
            }

            if (testing){
                console.log("connected to db")
                db.close()
                resolve({message: "Conencted to db"})
            } else
                resolve(db)
        })
    })
}

/** AI Stuff **/
module.exports.countQ = async () => {
    const db = await connectDB()

    const q = db.collection("q")
    const result = await q.count({})
    return result
}
module.exports.getQ = async (key) => {
    const db = await connectDB()

    const q = db.collection("q")
    // const result = await q.find({key}, {value: 1, _id: 0}).toArray()
    const result = await q.find({key}, {_id: 0}).toArray()
    return result
}

module.exports.batchGetQ = async (keys) => {
    const db = await connectDB()

    const q = db.collection("q")
    const result = await q.find({key: {$in: keys}}, {_id: 0}).toArray()
    return result
}

// module.exports.setQ = async (key, value) => {
//   const db = await connectDB()

//   const q = db.collection("q")
//   const result = await q.insert({key, value})
//   return result
// }

// module.exports.updateQ = async (key, value) => {
//   const db = await connectDB()

//   const q = db.collection("q")
//   const result = await q.updateOne({key}, {$set: {value}})
//   return result
// }

module.exports.setManyQ = async (records) => {
    const db = await connectDB()

    const q = db.collection("q")
    const result = await q.insertMany(records)
    return result
}

// careful with this (millions of records)
module.exports.getAllQ = async () => {
    const db = await connectDB()

    const q = db.collection("q")
    const result = await q.find({}).toArray()
    return result
}

module.exports.deleteAllQ = async () => {
    const db = await connectDB()

    const q = db.collection("q")
    const result = q.deleteMany({})
    return result
}

// module.exports.updateQ = async (key, value) => {
//   const db = await connectDB()

//   const q = db.collection("q")
//   const result = await q.insert({key, value})
//   return result
// }
/** end AI Stuff **/


/** Room Stuff **/
module.exports.getRooms = async () => {

    const db = await connectDB()

    const room = db.collection("room")
    const result = await room.find({}).toArray()
    return result
}

module.exports.getRoom = async (id) => {
    const db = await connectDB()
    const room = db.collection("room")
    const result = await room.findOne({room: id})

    return result
}

module.exports.createRoom = async (id) => {
    const db = await connectDB()

    const room = db.collection("room")
    const result = await room.insert({room: id, gameState: ""})

    return result
}

module.exports.updateRoom = async (id, data) => {
    const db = await connectDB()

    const room = db.collection("room")
    const result = await room.updateOne({room: id}, {$set:  {gameState: data}})
    //  lessonCollection.updateOne({"_id": data._id}, data);

    return result
}
/** end room Stuff **/

/** user Stuff **/

module.exports.getUsers = async () => {

    const db = await connectDB()

    const user = db.collection("user")
    const result = await user.find({}).toArray()
    return result
}

module.exports.getUser = async (id) => {

    const db = await connectDB()

    const user = db.collection("user")
    const result = await user.find({}).toArray()
    return result
}

module.exports.createUser = async (gName, gEmail) => {
    const db = await connectDB()

    const user = db.collection("user")
    const result = await user.insert({name: gName, email: gEmail})

    return result
}


/** end user Stuff **/
