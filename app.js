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

var users = ["Spencer", "James", "Sri", "Rob", "Gavin" ];

comments = [];



// -----------------------------------------------------------------------------
//
// netcode
// -----------------------------------------------------------------------------

io.sockets.on('connection', function (socket) {

	socket.emit('allComments', comments);
	socket.emit('allUsers', users);

  socket.on('login', function(username)
  {
	users.push(username);
	io.sockets.emit('newuser', username);
  });

  socket.on('comment', function(comment)
  {
		comments.push(comment);
		io.sockets.emit('comment', comment);
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
