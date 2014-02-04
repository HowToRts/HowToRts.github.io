var outlineWidth = 4;

var rangeRings = [
	{ x: 50, y: 50, size: 40 },
	{ x: 80, y: 50, size: 40 }
];

var canvas, ctx;

function init() {
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');

	//When the user clicks, record the click position as a place to draw a range ring
	canvas.onclick = function (e) {
		rangeRings.push({ x: e.clientX, y: e.clientY, size: 40 });
		draw();
	};

	draw();
}


function draw() {
	var i, r;

	//Reset the canvas
	ctx.globalCompositeOperation = 'source-over';
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	//Draw all our range areas to the main canvas.
	//Increase them by half the outline width, this gives us filled in circles over the whole area we want
	ctx.fillStyle = '#f00';
	for (i = rangeRings.length - 1; i >= 0; i--) {
		r = rangeRings[i];

		ctx.beginPath();
		ctx.arc(r.x, r.y, r.size + outlineWidth / 2, 0, 2 * Math.PI, false);
		ctx.closePath();
		ctx.fill();
	}

	//Now we have big red circles

	//Set a composite operation that says "Clear all of the areas we draw"
	ctx.globalCompositeOperation = 'destination-out';
	ctx.fillStyle = 'rgba(0,0,0,1)';

	//Draw the range circles, draw just the area inside the range ring we want to clear
	for (i = rangeRings.length - 1; i >= 0; i--) {
		r = rangeRings[i];

		ctx.beginPath();
		ctx.arc(r.x, r.y, r.size - outlineWidth / 2, 0, 2 * Math.PI, false);
		ctx.closePath();
		ctx.fill();
	}
}