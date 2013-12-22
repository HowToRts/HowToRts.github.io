Vector2 = function (x, y) {
	this.x = x;
	this.y = y;
};
Vector2.zero = new Vector2(0, 0);

Vector2.prototype.length = function () {
	return this.distanceTo(Vector2.zero);
};

Vector2.prototype.distanceTo = function (target) {
	var xDif = this.x - target.x;
	var yDif = this.y - target.y;

	return Math.sqrt((xDif * xDif) + (yDif * yDif));
};

Vector2.prototype.normalize = function () {
	var length = this.length();

	return new Vector2(this.x / length, this.y / length);
};

Vector2.prototype.minus = function (other) {
	return new Vector2(this.x - other.x, this.y - other.y);
};
Vector2.prototype.plus = function (other) {
	return new Vector2(this.x + other.x, this.y + other.y);
};

Vector2.prototype.mul = function (scalar) {
	return new Vector2(this.x * scalar, this.y * scalar);
};


//Factory method
vector2 = function (x, y) {
	if (x.length) { //array
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

	this.length = this.start.distanceTo(this.end);
};

LineSegment.prototype.interpolatedPoint = function (percent) {
	var invPercent = (1 - percent);
	return new Vector2(this.start.x * invPercent + this.end.x * percent, this.start.y * invPercent + this.end.y * percent);
};


LineString = function (points) {
	var pointsSafe = [],
		i;

	this.segments = [];
	this.length = 0;

	for (i = 0; i < points.length; i++) {
		pointsSafe.push(vector2(points[i]));
	}

	for (i = 1; i < points.length; i++) {
		var segment = new LineSegment(pointsSafe[i - 1], pointsSafe[i]);
		this.segments.push(segment);
		this.length += segment.length;
	}
}