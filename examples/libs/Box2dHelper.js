//shortcut all the common stuff

B2Vec2 = Box2D.Common.Math.b2Vec2;
B2BodyDef = Box2D.Dynamics.b2BodyDef;
B2Body = Box2D.Dynamics.b2Body;
B2FixtureDef = Box2D.Dynamics.b2FixtureDef;
B2Fixture = Box2D.Dynamics.b2Fixture;
B2World = Box2D.Dynamics.b2World;
B2MassData = Box2D.Collision.Shapes.b2MassData;
B2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
B2CircleShape = Box2D.Collision.Shapes.b2CircleShape;

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

B2Vec2.prototype.DistanceTo = function (target) {
	return this.Copy().Subtract(target).Length();
};


B2Vec2.prototype.Divide = function (a) {
	if (a === undefined) a = 0;
	this.x /= a;
	this.y /= a;

	return this;
};