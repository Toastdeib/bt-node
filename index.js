var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');
var https = require('https');
var currentPlayer = null;


function getMediaLocation(url,callback){
	
	var cmd = 'youtube-dl -g "'+url+'"';
	console.log(cmd);
	exec(cmd, function(error, stdout, stderr) {
		// command output is in stdout
		if(callback)callback(stdout.trim());
	});
	
}

function rawPlay(url,time){
	console.log("starting new player");
	killPlayer();
	var child = spawn('omxplayer', ['-b','-o','hdmi','-l',time,url]);
	currentPlayer = child;
	currentPlayer.on("exit",function(){
		currentPlayer = false;
		console.log("killed self!");
	});
}

function killPlayer(){
	if(currentPlayer) {
		currentPlayer.stdin.write('q');
		currentPlayer.kill();
		console.log("killed player");
	} else {
		console.log("skipped kill");
	}
}

function playMedia(url,time){
	getMediaLocation(url,function(path){
		rawPlay(path,time);
	});
}

function playVimeo(id,time){

	function parseBody(body){
		try {
			var obj = JSON.parse(body);
			var files = obj.request.files; //console.log(obj.request.files);
			rawPlay(files.h264.sd.url,time);
		} catch(e) {
			console.error(e);
		}
	}

	var options = {
		hostname: 'player.vimeo.com',
		port: 443,
		path: '/video/'+id+'/config',
		method: 'GET'
	};
	
	var buffer = "";
	var req = https.request(options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			buffer += chunk;
		});
		res.on('end', function() {
			parseBody(buffer);
		});
	});
	
	req.end();

}

function handleVideo(data){
	if(data.video.videotype == "yt"){
		playMedia("https://www.youtube.com/watch?v="+data.video.videoid, data.time);
	}
	if(data.video.videotype == "vimeo"){
		playVimeo(data.video.videoid, data.time);
	}
}

var stdin = process.stdin;
stdin.setRawMode( true );
stdin.resume();
stdin.setEncoding( 'utf8' );
stdin.on( 'data', function( key ){
  // ctrl-c ( end of text )
  if ( key === '\u0003' ) {
    process.exit();
  }
  // write the key to stdout all normal like
  if(currentPlayer){
    currentPlayer.stdin.write( key );
  }
});

var io = require('socket.io-client');
var socket = io.connect('http://berrytube.tv:8344');

socket.on('createPlayer', function(obj){
	handleVideo(obj);
});
socket.on("forceVideoChange",function(obj){
	handleVideo(obj);
});
socket.on("connect",function(){
	socket.emit("myPlaylistIsInited");
});

//playMedia("https://soundcloud.com/wasteland_wailers/fly-like-you");
//playMedia("https://vimeo.com/38668282");
//playMedia("https://www.youtube.com/watch?v=pAvonbFAKvQ&feature=youtu.be");
