Vector2 = function (x, y) {
	this.x = x;
	this.y = y;
};

//Vector2.prototype.


//Factory method
vector2 = function (x, y) {
	if (x.length) {
		return new Vector2(x[0], x[1]);
	} /*else if (y !== undefined) {
		return new Vector2(x, y);
	}*/

	//Debug only
	if (!(x instanceof Vector2)) {
		throw "x is not a Vector2";
	}

	return x;
};


LineSegment = function (start, end) {
	this.start = vector2(start);
	this.end = vector2(end);
};

LineSegment.prototype.interpolatedPoint = function (percent) {
	var invPercent = (1 - percent);
	return new Vector2(this.start.x * invPercent + this.end.x * percent, this.start.y * invPercent + this.end.y * percent);
};