var conversation = $('.comments .comment-stream');
var thumbs = $('.thumbnail-list');
var slice = $('#mainPic');
var markers = {};

var users = ["Spencer", "James", "Sri", "Rob", "Gavin" ];
var userID = 0;

var slices = [];
var comments = [];
var curSliceID = 0;

//
// Netcode
// 
// use this for running locally
//url = 'http://localhost:8080';
// use this to run on web
url = 'http://dicombinator.jit.su';

socket = io.connect(url);

socket.on('comment', function(data) {
	addComment(data, true);
	
	sliceSelected(comment.sliceId);
});

socket.on('newuser', function(data) {
	users.push(data);
});

socket.on('allComments', function(data) {
	for (var i = 0; i < data.length; ++i)
		addComment(data[i], true); 
	
	sliceSelected(0);
});

socket.on('allUsers', function(data) {
	users = data;
});

$(loadData);
$(loadThumbnails);

function login(){
	var name = $('#loginBox').val();
	if (name != '')
	{
		userID = users.length;
		socket.emit('login', name);
		$('.login').remove();
		$('#transparent_background').remove();
	}
}

function sliceSelected(id) {
	curSliceID = id;
  markers = {};
  $('#annotate span').remove();
  conversation.html("");
  loadSliceImage(id);
  loadComments(id);
  addMarkers();
}

function loadSliceImage(id) {
  slice.attr('src', 'img/dicomi' + id + '.jpg');
}

function loadComments(id) {
  $.each(comments, function(i, c) {
    if (c.sliceId == id || c.inReplyTo == id) {
      showComment(c);
    }
  })
}

$('.comment-stream li').live('click', function() {
  var commentId = $(this).attr('id').split("-")[1];
  var comment = findComment(commentId);

  $(".comment-stream li").removeClass("selected");
  $(this).addClass('selected');

  if (typeof(comment.inReplyTo) === "undefined") {
    var marker = $('#marker-' + parseInt(commentId));
  } else {
    var marker = $('#marker-' + parseInt(comment.inReplyTo));
  }
  $('span.marker').removeClass('marker-active').addClass('marker-inactive');
  marker.addClass('marker-active').removeClass('marker-inactive');
})

$('.thumbnail-list li').live('click', function() {
  // $('.thumbnails').scrollTop($(this).offset().top)
  // $('.thumbnails').scrollTop($(this).offset().top)

  var offset = $(this).offset().top - $('#thumb-0').offset().top - 10
  $('.thumbnails').animate({ scrollTop: offset }, 400, function() {})

})

function findComment(id) {
  var comment;

  $.each(comments, function(i, c) {
    if (c.id == id) {
      comment = c;
      return false;
    }
  })

  return comment;
}

function addComment(comment, fromNode) {
	comments.push(comment);

  slices[comment.sliceId].commentCount += 1;
  var thumb = $('#thumb-' + comment.sliceId);
  var thumbCommentCount = thumb.find("span.comment-count");
  thumbCommentCount.html(slices[comment.sliceId].commentCount);
  
  if (comment.sliceId == curSliceID)
	showComment(comment);
}

function pushComment(comment)
{
	socket.emit('comment', comment);
}

function showComment(comment) {
  user = "<span class='username'>" + users[comment.userId] + ":</span>";
  commentHtml = $("<li class='small-rounded-corners' id='comment-" + comment.id + "'>" + user + comment.text + "</li>");
  
  if (typeof(comment.inReplyTo) === "undefined") {
    conversation.append(commentHtml);

    if (comment.x && comment.y) {
      incrementMarkerCount(comment)
    }

  } else {
    commentHtml.addClass("reply");
    inReplyTo = $('#comment-' + comment.inReplyTo);
    inReplyTo.after(commentHtml);
    incrementMarkerCount(comment);
  }
}

function incrementMarkerCount(comment) {
  var markerComment; 

  if (typeof(comment.inReplyTo) === "undefined") {
    id = comment.id;
    markerComment = comment;
  } else {
    id = comment.inReplyTo;
    markerComment = findComment(id);
  }

  if (typeof(markers[id]) === "undefined") {
    markers[id] = { x: markerComment.x, y: markerComment.y, count: 1 };
  } else {
    markers[id].count += 1;
  }
}

function addMarkers() {
  $.each(markers, function(commentId, markerAttributes) {
    $('#annotate').addAnnotations(function(attributes) {
      var el = $(document.createElement('span')).addClass('marker').addClass('marker-inactive').html('<p class="number_marker">'+markerAttributes.count+'</p>');
      el.attr('id', 'marker-' + commentId);
  		return el;
    }, [markerAttributes]);
  })
}



function newMarker() {
	// var input = $(document.createElement('input')).attr('type', 'text').blur(function() {addAnnotation(this)});
	$('.hidden-top').animate({top:0}, 500, function() {
    $(this).find('textarea').focus();
  });
	return $(document.createElement('span')).addClass('marker-inactive');
}

function addAnnotation(annotation) {
  var note = $('.comment-post.hidden-top').find('textarea').val()
	var notes = $('#annotate span:last-child').seralizeAnnotations();
	pushComment({
		id: comments.length + 1,
		text: note,
		sliceId: curSliceID,
		userId: userID,
		x: notes[0].x,
		y: notes[0].y
	});
	showComment(comments[comments.length - 1]);
  $('.hidden-top').animate({top:-150}, 500, function() {}).find('textarea').val("");
  $('.comment-stream li:last-child').click();
}

function addRegularComment(input) {
	pushComment({
		id: comments.length + 1,
		text: $('#commentBox').val(),
		sliceId: curSliceID,
		userId: userID,
	});
	$('#commentBox').val();
}

function loadData(){

	$('#annotate').annotatableImage(newMarker);

  for (i=0; i<12; ++i) {
    slices.push({
      id: i,
      commentCount: 0,
      fileName: "img/dicomi" + i + ".jpg"
    });
  }
  
	$.each(slices, function(i, s){

		img = "<img src='" + s.fileName + "' style='width:80px; height:80px' />";
		commentCount = "<span class='comment-count'>0</span>";
		thumbReference = "<span class='thumb-reference'>" + (i + 1) + "</span>";

		thumbContent = img + commentCount + thumbReference;

		thumbs.append("<li class='thumb' id='thumb-" + i + "'>" + thumbContent + "</li>");
	});
	
	// add empty space
	thumbs.append("<li style='height:600px'></li>");
		
	// callback when scrolling the thumbnails
	$(".thumbnails").scroll(function()
	{
		var index = Math.floor($(this).scrollTop()/90);
		
		//$('#mainPic').attr('src', 'img/dicomi' + index + '.jpg');
		sliceSelected(index);
	});

  addComment({
    id: 1,
    text: "Sed malesuada gravida nulla quis varius. Aliquam faucibus nulla nec ante rutrum dapibus. Phasellus porttitor gravida faucibus. Nulla imperdiet pellentesque.",
    sliceId: 1,
    userId: 1,
    x: 0.23,
    y: 0.71
  })

  addComment({
    id: 2,
    text: "Quisque laoreet orci in purus vulputate aliquam. Fusce nulla nunc, faucibus sed lacinia sit amet, luctus in lacus. Maecenas ullamcorper.", 
    sliceId: 1,
    userId: 2,
    inReplyTo: 1
  })

  addComment({
    id: 3,
    text: "Aliquam erat volutpat. Ut ut sagittis mi. Mauris leo mauris, tempor vel tincidunt ut, auctor et felis. Aenean eu turpis.", 
    sliceId: 1,
    userId: 3,
    inReplyTo: 1
  })

  addComment({
    id: 4,
    text: "Phasellus nec orci non risus pulvinar euismod. Sed felis sem, mollis a porttitor nec, auctor sed libero. Nullam dignissim porta.",
    sliceId: 2,
    userId: 2,
    x: 0.76,
    y: 0.81
  })

  addComment({
    id: 5,
    text: "Donec tristique aliquet massa, accumsan porttitor magna vehicula quis. Maecenas convallis tincidunt justo ut accumsan. Etiam et blandit lacus. Cras.",
    sliceId: 2,
    userId: 4,
    inReplyTo: 4
  })

  addComment({
    id: 6,
    text: "Aliquam dolor lacus, viverra ut lobortis quis, laoreet nec elit. Suspendisse quis tortor nisi, nec commodo est. Mauris et dolor.",
    sliceId: 2,
    userId: 5,
    inReplyTo: 4
  })

  addComment({
    id: 7,
    text: "Sed nibh risus, dignissim ac blandit eget, iaculis sed sapien. Etiam at lacus nulla, id pharetra dui. Sed vulputate bibendum.",
    sliceId: 3,
    userId: 5
  })

  addComment({
    id: 8,
    text: "Etiam sollicitudin libero vel tellus condimentum hendrerit vulputate magna adipiscing. Cras tincidunt nulla a mi vulputate sit amet pellentesque lorem.",
    sliceId: 4,
    userId: 4
  })

  addComment({
    id: 9,
    text: "Pellentesque at velit sit amet dolor lacinia pellentesque. Pellentesque neque urna, iaculis in viverra quis, consequat at mauris. Suspendisse ipsum.",
    sliceId: 4,
    userId: 2
  })

  addComment({
    id: 10,
    text: "Ut vitae velit a neque faucibus consequat nec vel nisl. Vestibulum id mi sapien. Nulla nibh sem, iaculis ac dignissim.",
    sliceId: 5,
    userId: 1
  })

  addComment({
    id: 11,
    text: "Fusce fermentum commodo ipsum, at vulputate massa rutrum non. Mauris nec massa tellus, ut congue justo. Vestibulum eget lorem non.",
    sliceId: 6,
    userId: 2,
    x: 0.12,
    y: 0.37
  })

  addComment({
    id: 12,
    text: "Pellentesque porta ultricies dapibus. Duis porttitor porta lacus id cursus. Integer dignissim aliquam enim at sollicitudin. Integer vel neque dui.",
    sliceId: 6,
    userId: 3,
    inReplyTo: 11
  })

  addComment({
    id: 13,
    text: "Nullam vestibulum nisl eget odio feugiat ac posuere lacus posuere. Proin iaculis faucibus nisl. Etiam ultrices, risus a accumsan laoreet.",
    sliceId: 6,
    userId: 4,
    inReplyTo: 11
  })

  addComment({
    id: 14,
    text: "Aliquam convallis est vel risus vestibulum eget volutpat lectus facilisis. Morbi non sollicitudin urna. Curabitur faucibus, diam sit amet semper.",
    sliceId: 7,
    userId: 1,
    x: 0.51,
    y: 0.91
  })

  addComment({
    id: 15,
    text: "Pellentesque nulla est, rhoncus vel vulputate sed, tempor nec urna. Morbi luctus tellus porta lacus ultricies bibendum in at dui.",
    sliceId: 7,
    userId: 2,
    inReplyTo: 14
  })
}
