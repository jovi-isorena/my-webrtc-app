const express = require('express');
const app = express();
let http = require('http').Server(app);

const port = process.env.PORT || 3000;

let io = require('socket.io')(http);

app.use(express.static('public'));

http.listen(port, () =>{
    console.log("listening to Port: ", port);
    console.log("Rooms:", io.sockets.adapter.rooms);
})

io.on('connection', socket => {
    console.log('A user connected.');
    socket.on('create or join', room => {
        console.log('create or join to room', room);
        const myRoom = io.sockets.adapter.rooms.get(room) || { size: 0};
        console.log("myroom:", myRoom, "typeof: ", typeof(io.sockets.adapter.rooms));
        const numClients = myRoom.size;
        console.log(room, 'has', numClients, 'clients.');

        if(numClients == 0){
            socket.join(room);
            socket.emit('created', room);
            console.log('created');
        }else if(numClients == 1){
            socket.join(room);
            socket.emit('joined', room);
            console.log('joined');
        }else{
            socket.emit('full', room);
        }
        console.log(io.sockets.adapter.rooms)

        socket.on('ready', room => {
            socket.broadcast.to(room).emit('ready');
        });
        socket.on('candidate', event => {
            socket.broadcast.to(event.room).emit('candidate', room);
        });
        socket.on('offer', event => {
            socket.broadcast.to(event.room).emit('offer', event.sdp);
        });
        socket.on('answer', event => {
            socket.broadcast.to(event.room).emit('answer', event.sdp);
        });
    })
})