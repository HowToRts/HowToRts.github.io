//How big the grid is in pixels
var gridWidthPx = 800, gridHeightPx = 448;
var gridPx = 32;

//Grid size in actual units
var gridWidth = gridWidthPx / gridPx;
var gridHeight = gridHeightPx / gridPx;

//Storage for the current agents and obstacles
var agents = new Array();
var obstacles = new Array();

//Defines an agent that moves
Agent = function (pos) {
	this.position = pos;
	this.rotation = 0;

	this.velocity = Vector2.zero;

	this.maxForce = 20; //rate of acceleration
	this.maxSpeed = 4; //grid squares / second

	this.radius = 0.4;
	this.minSeparation = 0.8; // We'll move away from anyone nearer than this

	this.maxCohesion = 3.5; //We'll move closer to anyone within this bound
};

var destination = new Vector2(gridWidth - 2, gridHeight / 2); //middle right

//Called to start the game
function startGame() {
	for (var y = 0; y < gridHeight; y++) {
		agents.push(new Agent(new Vector2(1, y)));
	}
	for (var i = 0; i < 30; i++) {
		obstacles.push(new Vector2(Math.floor(Math.random() * (gridWidth - 1)), Math.floor(Math.random() * (gridHeight - 1))));
	}

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
		var seek = steeringBehaviourFlowField(agent, destination);
		var separation = Vector2.zero;//steeringBehaviourSeparation(agent);
		var cohesion = Vector2.zero;//steeringBehaviourCohesion(agent);
		var alignment = Vector2.zero;//steeringBehaviourAlignment(agent);

		//if (i == 0) {
		//	console.log(round(seek.length()) + ' ' + round(separation.length()) + ' ' + round(cohesion.length()) + ' ' + round(alignment.length()) + ' : ' + round(agent.velocity.length()));
		//}

		//Combine them to come up with a total force to apply, decreasing the effect of cohesion
		agent.forceToApply = seek.plus(separation).plus(cohesion.mul(0.1)).plus(alignment.mul(0.5));
	}

	//Move agents based on forces being applied (aka physics)
	for (i = agents.length - 1; i >= 0; i--) {
		agent = agents[i];

		//if (i == 0) {
		//	console.log(round(agent.velocity.length()) + ' ' + round(agent.velocity.x) + ',' + round(agent.velocity.y) + '    ' + round(agent.forceToApply.x) + ',' + round(agent.forceToApply.y));
		//}

		//Apply the force
		agent.velocity = agent.velocity.plus(agent.forceToApply.mul(dt));

		//Cap speed as required
		var speed = agent.velocity.length();
		if (speed > agent.maxSpeed) {
			agent.velocity = agent.velocity.mul(agent.maxSpeed / speed);
		}

		//Calculate our new movement angle
		agent.rotation = agent.velocity.angle();

		//Move a bit
		agent.position = agent.position.plus(agent.velocity.mul(dt));
	}
}

function steeringBehaviourSeek(agent, dest) {

	//Desired change of location
	var desired = dest.minus(agent.position);
	//Desired velocity (move there at maximum speed)
	desired = desired.mul(agent.maxSpeed / desired.length());
	//The velocity change we want
	var velocityChange = desired.minus(agent.velocity);
	//Convert to a force
	return velocityChange.mul(agent.maxForce / agent.maxSpeed);
}

function steeringBehaviourSeparation(agent) {
	var totalForce = Vector2.zero;
	var neighboursCount = 0;

	for (var i = 0; i < agents.length; i++) {
		var a = agents[i];
		if (a != agent) {
			var distance = agent.position.distanceTo(a.position);
			if (distance < agent.minSeparation && distance > 0) {
				//Vector to other agent
				var pushForce = agent.position.minus(a.position);
				totalForce = totalForce.plus(pushForce.div(agent.radius));
				neighboursCount++;
			}
		}
	}

	if (neighboursCount == 0) {
		return Vector2.zero;
	}

	totalForce = totalForce.div(neighboursCount);
	return totalForce.mul(agent.maxForce);
}

function steeringBehaviourCohesion(agent) {
	//Start with just our position
	var centerOfMass = agent.position;
	var neighboursCount = 1;

	for (var i = 0; i < agents.length; i++) {
		var a = agents[i];
		if (a != agent) {
			var distance = agent.position.distanceTo(a.position);
			if (distance < agent.maxCohesion) {
				//sum up the position of our neighbours
				centerOfMass = centerOfMass.plus(a.position);
				neighboursCount++;
			}
		}
	}

	if (neighboursCount == 1) {
		return Vector2.zero;
	}

	//Get the average position of ourself and our neighbours
	centerOfMass = centerOfMass.div(neighboursCount);

	//seek that position
	return steeringBehaviourSeek(agent, centerOfMass);
}

function steeringBehaviourAlignment(agent) {
	var averageHeading = Vector2.zero;
	var neighboursCount = 0;

	//for each of our neighbours (including ourself)
	for (var i = 0; i < agents.length; i++) {
		var a = agents[i];
		var distance = agent.position.distanceTo(a.position);
		//That are within the max distance and are moving
		if (distance < agent.maxCohesion && a.velocity.length() > 0) {
			//Sum up our headings
			averageHeading = averageHeading.plus(a.velocity.normalize());
			neighboursCount++;
		}
	}

	if (neighboursCount == 0) {
		return Vector2.zero;
	}

	//Divide to get the average heading
	averageHeading = averageHeading.div(neighboursCount);

	//Steer towards that heading
	var desired = averageHeading.mul(agent.maxSpeed);
	var force = desired.minus(agent.velocity);
	return force.mul(agent.maxForce / agent.maxSpeed);
}

function steeringBehaviourFlowField(agent) {

	var floor = agent.position.floor(); //Coordinate of the top left, so 0,1

	//Apply bilinear interpolation on the flow field to work out our force.
	// http://en.wikipedia.org/wiki/Bilinear_interpolation#Nonlinear

	var f00 = flowField[floor.x][floor.y] || Vector2.zero;
	var f01 = flowField[floor.x][floor.y + 1] || Vector2.zero;
	var f10 = flowField[floor.x + 1][floor.y] || Vector2.zero;
	var f11 = flowField[floor.x + 1][floor.y + 1] || Vector2.zero;

	//Do the x interpolations
	var xWeight = agent.position.x - floor.x;

	var top = f00.mul(1 - xWeight).plus(f10.mul(xWeight));
	var bottom = f01.mul(1 - xWeight).plus(f11.mul(xWeight));

	//Do the y interpolation
	var yWeight = agent.position.y - floor.y;

	//This is now the direction we want to be travelling in
	var direction = top.mul(1 - yWeight).plus(bottom.mul(yWeight));

	var desiredVelocity = direction.mul(agent.maxSpeed);

	//The velocity change we want
	var velocityChange = desiredVelocity.minus(agent.velocity);
	//Convert to a force
	return velocityChange.mul(agent.maxForce / agent.maxSpeed);


	//TODO Calculate a change of force so we will move towards the direction we want to travel in
	return result.mul(agent.maxForce);

	//Old: just use the one we are on
	var f = floor.x < gridWidth && floor.y < gridHeight && floor.x >= 0 && floor.y >= 0 ? flowField[floor.x][floor.y] : null;

	return f ? f.mul(agent.maxForce) : Vector2.zero;
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
	var pathEnd = destination.round();
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

	//Generate an empty grid, set all places as null, which will stand for no good direction
	flowField = new Array(gridWidth);
	for (x = 0; x < gridWidth; x++) {
		var arr = new Array(gridHeight);
		for (y = 0; y < gridHeight; y++) {
			arr[y] = null;
		}
		flowField[x] = arr;
	}

	for (x = 0; x < gridWidth; x++) {
		for (y = 0; y < gridHeight; y++) {

			//Obstacles have no flow value
			if (dijkstraGrid[x][y] == Number.MAX_VALUE) {
				continue;
			}

			var pos = new Vector2(x, y);
			var neighbours = allNeighboursOf(pos);

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

			if (min != null) {
				flowField[x][y] = min.minus(pos).normalize();
			}
		}
	}
}

function straightNeighboursOf(v) {
	var res = [];
	if (v.x > 0) {
		res.push(new Vector2(v.x - 1, v.y));
	}
	if (v.y > 0) {
		res.push(new Vector2(v.x, v.y - 1));
	}

	if (v.x < gridWidth - 1) {
		res.push(new Vector2(v.x + 1, v.y));
	}
	if (v.y < gridHeight - 1) {
		res.push(new Vector2(v.x, v.y + 1));
	}

	return res;
}

function allNeighboursOf(v) {
	var res = [];

	for (var dx = -1; dx <= 1; dx++) {
		for (var dy = -1; dy <= 1; dy++) {
			var x = v.x + dx;
			var y = v.y + dy;

			//All neighbours on the grid that aren't ourself
			if (x >= 0 && y >= 0 && x < gridWidth && y < gridHeight && !(dx == 0 && dy == 0)) {
				res.push(new Vector2(x, y));
			}
		}
	}

	return res;
}