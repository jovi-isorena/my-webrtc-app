let divSelectRoom = document.getElementById('selectRoom');
let divConsultingRoom = document.getElementById('consultingRoom');
let inputRoomNumber = document.getElementById('roomNumber');
let btnGoRoom = document.getElementById('goRoom');
let localVideo = document.getElementById('localVideo');
let remoteVideo = document.getElementById('remoteVideo');
let h2CallName= document.getElementById('callName');
let inputCallName = document.getElementById('inputCallName');
let btnSetName = document.getElementById('setName');


let roomNumber, localStream, remoteStream, rtcPeerConnection, isCaller, dataChannel;

const iceServers = {
    'iceServer': [
        {'urls':'stun:stun.services.mozilla.com'},
        {'urls':'stun:stun.l.google.com:19302'},
        
    ]
}

const streamConstraints = {
    audio: true,
    video: true
}

const socket = io();

btnGoRoom.onclick = () => {
    console.log('go button clicked');
    if(inputRoomNumber.value === ''){
        alert('Enter room name');
    }else{
        roomNumber = inputRoomNumber.value;
        socket.emit('create or join', roomNumber);

        divSelectRoom.style = "display:none";
        divConsultingRoom.style = "display:block";

    }
}
btnSetName.onclick = () => {
    console.log('setName button clicked', inputCallName.value);
    if(inputCallName.value === ''){
        alert('Enter room name');
    }else{
        // dataChannel.send(inputCallName.value);
        h2CallName.innerText = inputCallName.value;
    }
}

socket.on('created', room => {
    console.log('room created', room);
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then( stream => {
            localStream = stream;
            localVideo.srcObject = stream;
            isCaller = true;
        })
        .catch(err =>{
            console.log('An error occurred.', err);
        });

});

socket.on('joined', room => {
    console.log('joined room', room);
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then( stream => {
            localStream = stream;
            localVideo.srcObject = stream;
            socket.emit('ready', roomNumber);
        })
        .catch(err =>{
            console.log('An error occurred.', err);
        });

});

socket.on('ready', () => {
    if(isCaller){
        console.log('received ready');
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.createOffer()
            .then(sessionDescription => {
                console.log('sending offer', sessionDescription);
                rtcPeerConnection.setLocalDescription(sessionDescription);
                socket.emit('offer', {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNumber
                })
            })
            .catch(err => {
                console.log(err);
            });

        
        dataChannel = rtcPeerConnection.createDataChannel(roomNumber);
        dataChannel.addEventListener('open', event => {
            btnSetName.disabled = false;
            inputCallName.focus();
            
        });
        dataChannel.onmessage = event => {
            h2CallName.innerText = event.data;
        }
    }
});

socket.on('offer', (event) => {
    if(!isCaller){
        console.log('received offer', event);
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
        rtcPeerConnection.createAnswer()
            .then(sessionDescription => {
                console.log('sending answer', sessionDescription);

                rtcPeerConnection.setLocalDescription(sessionDescription);
                socket.emit('answer', {
                    type: 'answer',
                    sdp: sessionDescription,
                    room: roomNumber
                })
            })
            .catch(err => {
                console.log(err);
            });
        rtcPeerConnection.ondatachannel = event => {
            dataChannel = event.channel;
            dataChannel.onmessage = event => {
                h2CallName.innerText = event.data;
            }
        }
    }
});

socket.on('answer', (event) => {
    console.log('received answer');
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

socket.on('candidate', event => {
    console.log('received candidate');
    const candidate = new RTCPeerConnection({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    })
    rtcPeerConnection.addIceCandidate(candidate);
    console.log('ice connection state: ', rtcPeerConnection.iceConnectionState);
    rtcPeerConnection.oniceconnectionstatechange = function(){
        console.log('ICE state: ',rtcPeerConnection.iceConnectionState);
    }
    console.log("Connection status: ", rtcPeerConnection.connectionState);

    rtcPeerConnection.addEventListener('connectionstatechange', event => {
        if (rtcPeerConnection.connectionState === 'connected') {
            // Peers connected!
        }
        console.log("Connection status: ", rtcPeerConnection.connectionState);
    });
});

socket.on('full', room => {
    alert(`Room ${room} is full`);
});
function onAddStream(event){
    console.log('on add stream');
    console.log(event.streams[0] instanceof MediaStream);
    remoteVideo.srcObject = event.streams[0];
    remoteStream = event.streams[0];
}

function onIceCandidate(event){
    console.log('on ice candidate');
    if(event.candidate){
        console.log('sending ice candidate', event.candidate);
        socket.emit('candidate', {
            type: 'candidate',
            lable: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        });
    }
}

