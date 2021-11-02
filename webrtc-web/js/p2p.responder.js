'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#6
var api = "";

$("#start").click(function(){
    var napi = document.getElementById("api").value;
    if (napi != "/") {
        api = "http://" + napi;
    }
    $("#start").hide();

    new Promise(function(resolve, reject){
        navigator.webkitGetUserMedia({
            video:true,audio:true
        },function(stream){
            resolve(stream);
        }, function(error){
            reject(error);
        });
    }).then(function(stream){
        var lv = document.getElementById("local");
        try {
            lv.src = window.URL.createObjectURL(stream);
        } catch (error) {
            lv.srcObject = stream;
        }
        console.log("[navigator.webkitGetUserMedia] lv.src= " + lv.src);

        // Use a peer connection to share stream to responder.
        var conn = new window.webkitRTCPeerConnection(null);
        conn.addStream(stream);
        console.log("[conn.addStream] add stream to peer connection");
        return conn;
    }).then(function(conn){
        // Render the remote initiator stream.
        conn.onaddstream = function(e) {
            var rv = document.getElementById("remote");
	        try {
	            rv.src = window.URL.createObjectURL(e.stream);
	        } catch (error) {
	            rv.srcObject = e.stream;
	        }
            console.log("[conn.onaddstream] rv.src=remoteStream " + rv.src);
        };

        callInitiator(conn, api);
    });
});

function callInitiator(conn, api) {
    Promise.all([new Promise(function(resolve, reject){
        // Request the candidates of initiator.
        $.ajax({
            type:"GET", async:true, url:api+"/api/webrtc/icandidates", contentType:"application/json",
            success:function(data){
                data = JSON.parse(data) || [];
                resolve(data);
            }, error:function(xhr,err){
                reject(err);
            }
        });
    }), new Promise(function(resolve, reject){
        // Query the offer of initiator from signaling server.
        $.ajax({
            type:"GET", async:true, url:api+"/api/webrtc/offer", contentType:"application/json",
            success:function(data){
                var offer = unescapeOffer(JSON.parse(JSON.parse(data)[0]));
                resolve(offer);
            },
            error: function(xhr, err) {
                reject(err);
            }
        });
    })]).then(function([candidates,offer]){
        // once got the peer offer(SDP), we can generate our answer(SDP).
        conn.setRemoteDescription(offer); // trigger conn.onaddstream
        console.log("[onRemoteGotOffer] Got offer " + offer.sdp.length + "B sdp as bellow:");
        console.log(offer);

        // before addIceCandidate, we must setRemoteDescription
        for (var i = 0; i < candidates.length; i++) {
            var candidate = unescapeCandicate(JSON.parse(candidates[i]));
            conn.addIceCandidate(new window.RTCIceCandidate(candidate));
            console.log("[requestCandidates] Got initiator candidate " + JSON.stringify(candidate));
        }

        Promise.all([new Promise(function(resolve, reject){
            // Since the 'remote' side has no media stream we need
            // to pass in the right constraints in order for it to
            // accept the incoming offer of audio and video.
            conn.createAnswer(function(answer){
                conn.setLocalDescription(answer); // trigger conn.onicecandidate().
                console.log("[conn.createAnswer] answer " + answer.sdp.length + "B sdp as bellow:");
                console.log(answer);

                resolve(answer);
            }, function(error){
                reject(error);
            });
        }), new Promise(function(resolve, reject){
            // Transmit the responder candidates to signaling server.
            conn.onicecandidate = function(e) {
                if (!e.candidate) {
                    return;
                }
                resolve(e.candidate);
            };
        })]).then(function([answer,candidate]){
            var data = JSON.stringify(escapeOffer(answer));
            $.ajax({type:"POST", async:true, url:api+"/api/webrtc/answer", contentType:"application/json", data:data});

            data = JSON.stringify(escapeCandicate(candidate));
            $.ajax({type:"POST", async:true, url:api+"/api/webrtc/rcandidates", contentType:"application/json", data:data});
        });
    });
}

function escapeOffer(offer) {
    return {type:offer.type, sdp:escape(offer.sdp)};
}

function escapeCandicate(candidate) {
    return {sdpMid:candidate.sdpMid, sdpMLineIndex:candidate.sdpMLineIndex, candidate:escape(candidate.candidate)};
}

function unescapeOffer(offer) {
    return {type:offer.type, sdp:unescape(offer.sdp)};
}

function unescapeCandicate(candidate) {
    return {sdpMid:candidate.sdpMid, sdpMLineIndex:candidate.sdpMLineIndex, candidate:unescape(candidate.candidate)};
}