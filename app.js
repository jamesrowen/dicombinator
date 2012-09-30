// initialize http server and socket.io
var app = require('http').createServer(handler),
    io = require('socket.io').listen(app), 
    fs = require('fs'),
    url = require('url');
	
io.set('log level', 1);

app.listen(8080);

// -----------------------------------------------------------------------------
//
// http request server
// -----------------------------------------------------------------------------
function handler (req, res) { 

	// serve homepage
	if (req.url == '/')
	{
		var callback = function (err, data)
		{
			if (err) 
			{
				res.writeHead(500);
				return res.end('Error loading newgame.html');
			}
			res.writeHead(200);
			res.end(data);
		}

		fs.readFile(__dirname + '/index.html', callback);
	}
	// serve png
	else if (req.url[req.url.length - 2] == 'n' && req.url[req.url.length - 1] == 'g')
	{
		var img = fs.readFileSync(__dirname + req.url);
		res.writeHead(200, {'Content-Type': 'image/png' });
		res.end(img, 'binary');
	}
	// serve jpg
	else if (req.url[req.url.length - 2] == 'p' && req.url[req.url.length - 1] == 'g')
	{
		var img = fs.readFileSync(__dirname + req.url);
		res.writeHead(200, {'Content-Type': 'image/jpg' });
		res.end(img, 'binary');
	}
	// serve js
	else if (req.url[req.url.length - 2] == 'j' && req.url[req.url.length - 1] == 's')
	{
		var js = fs.readFileSync(__dirname + req.url);
		res.writeHead(200, {'Content-Type': 'text/javascript' });
		res.end(js);
	}
	// serve css
	else if (req.url[req.url.length - 2] == 's' && req.url[req.url.length - 1] == 's')
	{
		var js = fs.readFileSync(__dirname + req.url);
		res.writeHead(200, {'Content-Type': 'text/css' });
		res.end(js);
	}
}



// -----------------------------------------------------------------------------
//
// begin game code
// -----------------------------------------------------------------------------

// temporary global variables to be moved elsewhere

// database of all players
// TODO: create a permanent mongoDB
playerDB = [];
passwordDB = [];

// objects currently in the game world
objects = [];
idCount = 1;
animations = [];

stateUpdate = [];

dt = 0;					// time delta between frames
lastTimestamp = 0;		// absolute time of last frame


// -----------------------------------------------------------------------------
//
// netcode
// -----------------------------------------------------------------------------

io.sockets.on('connection', function (socket) {

  socket.on('login', function(username, password)
  {
	// if connection already has a username, dont log in
	if (socket.username)
	{
		socket.emit('personal_message', {sender:-1, text:"You are already logged in."});
	}

	// if user is not in the database, create a new account
	else if (username != "" && password != "" && !playerDB[username])
	{
		var c = 'rgba(' + Math.floor(Math.random() * 60 + 190) + ',' + Math.floor(Math.random() * 60 + 190) + ',' + Math.floor(Math.random() * 60 + 190) + ', 1)'

		var p = new S_Player(username, username, c);
		playerDB[username] = p;
		passwordDB[username] = password;
		
		socket.username = username;
		socket.join('loggedin');

		socket.emit('myPlayerData', p.id);
		var objData = [];
		for (var key in objects)
			if (objects.hasOwnProperty(key))
				objData.push(objects[key].getData());
		socket.emit('newState', objData);

		objects[username] = p;

		io.sockets.in('loggedin').emit('addObject', p.getData());
		io.sockets.in('loggedin').emit('global_message', {sender:username, text:" has created an account."});
	}

	// otherwise check password
	else if (passwordDB[username] == password)
	{
		socket.username = username;
		socket.join('loggedin');

		socket.emit('myPlayerData', playerDB[username].id);
		var objData = [];
		for (var key in objects)
			if (objects.hasOwnProperty(key))
				objData.push(objects[key].getData());
		socket.emit('newState', objData);

		objects[username] = playerDB[username];

		io.sockets.in('loggedin').emit('addObject', playerDB[username].getData());
		io.sockets.in('loggedin').emit('global_message', {sender:username, text:" has connected."});
	}
	else
		socket.emit('personal_message', { text:"Incorrect password" });
	
  });

  socket.on('message', function(message)
  {
	if (socket.username && message != "")
		io.sockets.in('loggedin').emit('global_message', {sender: socket.username, text:": " + message});
  });

  socket.on('disconnect', function()
  {
	if (socket.username)
	{
		playerDB[socket.username] = objects[socket.username];
		io.sockets.in('loggedin').emit('removeObject', socket.username);
		io.sockets.in('loggedin').emit('global_message', {sender:socket.username, text:" has disconnected."});
		delete objects[socket.username];

	}
  });

});


// -----------------------------------------------------------------------------
//
// game loop
// -----------------------------------------------------------------------------


var gameLoop = function()
{
	// update the time delta for this frame
	dt = (Date.now() - lastTimestamp) / 1000;
	lastTimestamp = Date.now();
	
	stateUpdates = [];

	for (var key in objects)
		objects[key].update(dt);

	if (stateUpdates.length > 0)
		io.sockets.emit('stateUpdate', stateUpdates);

}

setInterval(gameLoop, 1000 / 60);