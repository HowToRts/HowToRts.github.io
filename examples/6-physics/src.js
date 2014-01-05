//How big the grid is in pixels
var gridWidthPx = 800, gridHeightPx = 448;
var gridPx = 32;

//Grid size in actual units
var gridWidth = gridWidthPx / gridPx;
var gridHeight = gridHeightPx / gridPx;

//Storage for the current agents and obstacles
var agents = new Array();
var obstacles = new Array();

//The physics world
var world = new B2World(B2Vec2.Zero, true);

//Defines an agent that moves
Agent = function (pos) {
	this.rotation = 0;

	this.maxForce = 20; //rate of acceleration
	this.maxSpeed = 4; //grid squares / second

	this.radius = 0.4;
	this.minSeparation = 0.8; // We'll move away from anyone nearer than this

	this.maxCohesion = 3.5; //We'll move closer to anyone within this bound

	this.maxForceSquared = this.maxForce * this.maxForce;
	this.maxSpeedSquared = this.maxSpeed * this.maxSpeed;

	//Create physics objects for the agent
	var fixDef = new B2FixtureDef();
	var bodyDef = new B2BodyDef();

	fixDef.density = 1.0;
	fixDef.friction = 0.5;
	fixDef.restitution = 0.2;
	fixDef.shape = new B2CircleShape(this.radius);

	bodyDef.type = B2Body.b2_dynamicBody;
	bodyDef.position.SetV(pos);

	this.body = world.CreateBody(bodyDef);
	this.fixture = this.body.CreateFixture(fixDef);
};
Agent.prototype.position = function () {
	return this.body.GetPosition();
};
Agent.prototype.velocity = function () {
	return this.body.GetLinearVelocity();
};

var destination = new B2Vec2(gridWidth - 2, gridHeight / 2); //middle right

//Called to start the game
function startGame() {
	for (var yPos = 1; yPos < gridHeight - 1; yPos++) {
		agents.push(new Agent(new B2Vec2(0, yPos)));
	}
	for (var i = 0; i < 30; i++) {
		var x = 1 + Math.floor(Math.random() * (gridWidth - 3));
		var y = Math.floor(Math.random() * (gridHeight - 2));
		obstacles.push(new B2Vec2(x, y));
	}
	obstacles.push(new B2Vec2(gridWidth - 5, gridHeight / 2));

	generateDijkstraGrid();
	generateFlowField();

	stage.addEventListener('stagemouseup', function (ev) {
		destination.x = ev.stageX / gridPx - 0.5;
		destination.y = ev.stageY / gridPx - 0.5;
	});
}

function round(val) {
	return val.toFixed(1);
}

//called periodically to update the game
//dt is the change of time since the last update (in seconds)
function gameTick(dt) {
	var i, agent;

	//Calculate steering and flocking forces for all agents
	for (i = agents.length - 1; i >= 0; i--) {
		agent = agents[i];

		//Work out our behaviours
		var ff = steeringBehaviourFlowField(agent);
		var lc = steeringBehaviourLowestCost(agent);
		agent.forceToApply = ff.Add(lc.Multiply(0.3));

		var lengthSquared = agent.forceToApply.LengthSquared();
		if (lengthSquared > agent.maxForceSquared) {
			agent.forceToApply.Multiply(agent.maxForce / Math.sqrt(lengthSquared));
		}
	}

	//Move agents based on forces being applied (aka physics)
	for (i = agents.length - 1; i >= 0; i--) {
		agent = agents[i];

		//Apply the force
		agent.body.ApplyImpulse(agent.forceToApply.Multiply(dt), agent.position());

		//Calculate our new movement angle TODO: Should probably be done after running step
		agent.rotation = agent.velocity().Angle();
	}

	world.Step(dt, 10, 10);
	world.ClearForces();
}

function steeringBehaviourFlowField(agent) {

	//Work out the force to apply to us based on the flow field grid squares we are on.
	//we apply bilinear interpolation on the 4 grid squares nearest to us to work out our force.
	// http://en.wikipedia.org/wiki/Bilinear_interpolation#Nonlinear

	//Top left Coordinate of the 4
	var floor = agent.position().Copy().Floor();

	//The 4 weights we'll interpolate, see http://en.wikipedia.org/wiki/File:Bilininterp.png for the coordinates
	var f00 = (isValid(floor.x, floor.y) ? flowField[floor.x][floor.y] : B2Vec2.Zero).Copy();
	var f01 = (isValid(floor.x, floor.y + 1) ? flowField[floor.x][floor.y + 1] : B2Vec2.Zero).Copy();
	var f10 = (isValid(floor.x + 1, floor.y) ? flowField[floor.x + 1][floor.y] : B2Vec2.Zero).Copy();
	var f11 = (isValid(floor.x + 1, floor.y + 1) ? flowField[floor.x + 1][floor.y + 1] : B2Vec2.Zero).Copy();

	//Do the x interpolations
	var xWeight = agent.position().x - floor.x;

	var top = f00.Multiply(1 - xWeight).Add(f10.Multiply(xWeight));
	var bottom = f01.Multiply(1 - xWeight).Add(f11.Multiply(xWeight));

	//Do the y interpolation
	var yWeight = agent.position().y - floor.y;

	//This is now the direction we want to be travelling in (needs to be normalized)
	var desiredDirection = top.Multiply(1 - yWeight).Add(bottom.Multiply(yWeight));
	desiredDirection.Normalize();

	//If we are centered on a grid square with no vector this will happen
	if (isNaN(desiredDirection.LengthSquared())) {
		return desiredDirection.SetZero();
	}

	return steerTowards(agent, desiredDirection);
}

function steeringBehaviourLowestCost(agent) {

	//Do nothing if the agent isn't moving
	if (agent.velocity().LengthSquared() == 0) {
		return new B2Vec2();
	}

	//Find our 4 closest neighbours
	var floor = agent.position().Copy().Floor(); //Top left Coordinate of the 4
	var f00 = isValid(floor.x, floor.y) ? dijkstraGrid[floor.x][floor.y] : Number.MAX_VALUE;
	var f01 = isValid(floor.x, floor.y + 1) ? dijkstraGrid[floor.x][floor.y + 1] : Number.MAX_VALUE;
	var f10 = isValid(floor.x + 1, floor.y) ? dijkstraGrid[floor.x + 1][floor.y] : Number.MAX_VALUE;
	var f11 = isValid(floor.x + 1, floor.y + 1) ? dijkstraGrid[floor.x + 1][floor.y + 1] : Number.MAX_VALUE;

	//Find the position(s) of the lowest, there may be multiple
	var minVal = Math.min(f00, f01, f10, f11);
	var minCoord = [];

	if (f00 == minVal) {
		minCoord.push(floor.Copy());
	}
	if (f01 == minVal) {
		minCoord.push(floor.Copy().Add(new B2Vec2(0, 1)));
	}
	if (f10 == minVal) {
		minCoord.push(floor.Copy().Add(new B2Vec2(1, 0)));
	}
	if (f11 == minVal) {
		minCoord.push(floor.Copy().Add(new B2Vec2(1, 1)));
	}

	//Tie-break by choosing the one we are most aligned with
	var currentDirection = agent.velocity().Copy();
	currentDirection.Normalize();

	var desiredDirection;
	minVal = Number.MAX_VALUE;
	for (var i = 0; i < minCoord.length; i++) {
		minCoord[i].Subtract(agent.position()).Normalize();
		var directionTo = minCoord[i];
		var lengthSquared = directionTo.Copy().Subtract(currentDirection).LengthSquared();
		if (lengthSquared < minVal) {
			minVal = lengthSquared;
			desiredDirection = directionTo;
		}
	}

	//Steer towards it
	return steerTowards(agent, desiredDirection);
}

function steerTowards(agent, desiredDirection) {
	//Multiply our direction by speed for our desired speed
	var desiredVelocity = desiredDirection.Multiply(agent.maxSpeed);

	//The velocity change we want
	var velocityChange = desiredVelocity.Subtract(agent.velocity());
	//Convert to a force
	return velocityChange.Multiply(agent.maxForce / agent.maxSpeed);
}

var dijkstraGrid;
var flowField;

function generateDijkstraGrid() {
	//Generate an empty grid, set all places as weight null, which will stand for unvisited
	dijkstraGrid = new Array(gridWidth);
	for (var x = 0; x < gridWidth; x++) {
		var arr = new Array(gridHeight);
		for (var y = 0; y < gridHeight; y++) {
			arr[y] = null;
		}
		dijkstraGrid[x] = arr;
	}

	//Set all places where obstacles are as being weight MAXINT, which will stand for not able to go here
	for (var i = 0; i < obstacles.length; i++) {
		var t = obstacles[i];

		dijkstraGrid[t.x][t.y] = Number.MAX_VALUE;
	}

	//flood fill out from the end point
	var pathEnd = destination.Copy();
	pathEnd.Round();
	pathEnd.distance = 0;
	dijkstraGrid[pathEnd.x][pathEnd.y] = 0;

	var toVisit = [pathEnd];

	//for each node we need to visit, starting with the pathEnd
	for (i = 0; i < toVisit.length; i++) {
		var neighbours = straightNeighboursOf(toVisit[i]);

		//for each neighbour of this node (only straight line neighbours, not diagonals)
		for (var j = 0; j < neighbours.length; j++) {
			var n = neighbours[j];

			//We will only ever visit every node once as we are always visiting nodes in the most efficient order
			if (dijkstraGrid[n.x][n.y] === null) {
				n.distance = toVisit[i].distance + 1;
				dijkstraGrid[n.x][n.y] = n.distance;
				toVisit.push(n);
			}
		}
	}
}


function generateFlowField() {
	var x, y;

	//Generate an empty grid, set all places as Vector2.zero, which will stand for no good direction
	flowField = new Array(gridWidth);
	for (x = 0; x < gridWidth; x++) {
		var arr = new Array(gridHeight);
		for (y = 0; y < gridHeight; y++) {
			arr[y] = B2Vec2.Zero;
		}
		flowField[x] = arr;
	}

	//for each grid square
	for (x = 0; x < gridWidth; x++) {
		for (y = 0; y < gridHeight; y++) {

			//Obstacles have no flow value
			if (dijkstraGrid[x][y] == Number.MAX_VALUE) {
				continue;
			}

			var pos = new B2Vec2(x, y);
			var neighbours = allNeighboursOf(pos);

			//Go through all neighbours and find the one with the lowest distance
			var min = null;
			var minDist = 0;
			for (var i = 0; i < neighbours.length; i++) {
				var n = neighbours[i];
				var dist = dijkstraGrid[n.x][n.y] - dijkstraGrid[pos.x][pos.y];

				if (dist < minDist) {
					min = n;
					minDist = dist;
				}
			}

			//If we found a valid neighbour, point in its direction
			if (min != null) {
				var v = min.Copy().Subtract(pos);
				v.Normalize();
				flowField[x][y] = v;
			}
		}
	}
}

function straightNeighboursOf(v) {
	var res = [];
	if (v.x > 0) {
		res.push(new B2Vec2(v.x - 1, v.y));
	}
	if (v.y > 0) {
		res.push(new B2Vec2(v.x, v.y - 1));
	}

	if (v.x < gridWidth - 1) {
		res.push(new B2Vec2(v.x + 1, v.y));
	}
	if (v.y < gridHeight - 1) {
		res.push(new B2Vec2(v.x, v.y + 1));
	}

	return res;
}

//Helper method. Returns true if this grid location is on the grid and not impassable
function isValid(x, y) {
	return x >= 0 && y >= 0 && x < gridWidth && y < gridHeight && dijkstraGrid[x][y] != Number.MAX_VALUE;
}

//Returns the non-obstructed neighbours of the given grid location.
//Diagonals are only included if their neighbours are also not obstructed
function allNeighboursOf(v) {
	var res = [],
		x = v.x,
		y = v.y;

	var up = isValid(x, y - 1),
		down = isValid(x, y + 1),
		left = isValid(x - 1, y),
		right = isValid(x + 1, y);

	//We test each straight direction, then subtest the next one clockwise

	if (left) {
		res.push(new B2Vec2(x - 1, y));

		//left up
		if (up && isValid(x - 1, y - 1)) {
			res.push(new B2Vec2(x - 1, y - 1));
		}
	}

	if (up) {
		res.push(new B2Vec2(x, y - 1));

		//up right
		if (right && isValid(x + 1, y - 1)) {
			res.push(new B2Vec2(x + 1, y - 1));
		}
	}

	if (right) {
		res.push(new B2Vec2(x + 1, y));

		//right down
		if (down && isValid(x + 1, y + 1)) {
			res.push(new B2Vec2(x + 1, y + 1));
		}
	}

	if (down) {
		res.push(new B2Vec2(x, y + 1));

		//down left
		if (left && isValid(x - 1, y + 1)) {
			res.push(new B2Vec2(x - 1, y + 1));
		}
	}

	return res;
}