//shortcut all the common stuff

B2Vec2 = Box2D.Common.Math.b2Vec2;

B2Vec2.Zero = Box2D.Common.Math.b2Math.b2Vec2_zero;

//Methods on box2d stuff start with capitals, so yeah...

B2Vec2.prototype.Round = function () {
	this.x = Math.round(this.x);
	this.y = Math.round(this.y);

	return this;
};

B2Vec2.prototype.Floor = function () {
	this.x = Math.floor(this.x);
	this.y = Math.floor(this.y);

	return this;
};

B2Vec2.prototype.Angle = function () {
	return Math.atan2(this.x, -this.y) * 180 / Math.PI;
};