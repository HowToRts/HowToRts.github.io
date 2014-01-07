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
Agent = function (pos, group) {
	this.group = group;

	this.rotation = 0;

	//Create a physics body for the agent
	var fixDef = new B2FixtureDef();
	var bodyDef = new B2BodyDef();

	fixDef.density = 20.0;
	fixDef.friction = 0.0;
	fixDef.restitution = 0.0;
	fixDef.shape = new B2CircleShape(this.radius);

	bodyDef.type = B2Body.b2_dynamicBody;
	//bodyDef.linearDamping = 0.1;
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
Agent.prototype.maxForce = 20; //rate of acceleration
Agent.prototype.maxSpeed = 4; //grid squares / second

Agent.prototype.radius = 0.23;
Agent.prototype.minSeparation = 0.8; // We'll move away from anyone nearer than this

Agent.prototype.maxCohesion = 2; //We'll move closer to anyone within this bound

Agent.prototype.maxForceSquared = Agent.prototype.maxForce * Agent.prototype.maxForce;
Agent.prototype.maxSpeedSquared = Agent.prototype.maxSpeed * Agent.prototype.maxSpeed;



var destinations = [
	new B2Vec2(gridWidth - 2, gridHeight / 2), //middle right
	new B2Vec2(1, gridHeight / 2) //middle left
];

//Called to start the game
function startGame() {
	for (var yPos = 1; yPos < gridHeight - 1; yPos++) {
		agents.push(new Agent(new B2Vec2(0, yPos), 0));
		agents.push(new Agent(new B2Vec2(1, yPos), 0));
		agents.push(new Agent(new B2Vec2(2, yPos), 0));
	}

	for (yPos = 1; yPos < gridHeight - 1; yPos++) {
		agents.push(new Agent(new B2Vec2(gridWidth - 1, yPos), 1));
		agents.push(new Agent(new B2Vec2(gridWidth - 2, yPos), 1));
		agents.push(new Agent(new B2Vec2(gridWidth - 3, yPos), 1));
	}

	//for (var i = 0; i < gridHeight; i++) {
	//	if (i == gridHeight / 2 || i == gridHeight / 2 - 1) {
	//		continue;
	//	}
	//	obstacles.push(new B2Vec2(8, i));
	//	obstacles.push(new B2Vec2(7, i));
	//}


	//for (var i = 0; i < 30; i++) {
	//	var x = 1 + Math.floor(Math.random() * (gridWidth - 3));
	//	var y = Math.floor(Math.random() * (gridHeight - 2));
	//	obstacles.push(new B2Vec2(x, y));
	//}

	for (var i = 0; i < obstacles.length; i++) {
		var pos = obstacles[i];

		//Create a physics body for the agent
		var fixDef = new B2FixtureDef();
		var bodyDef = new B2BodyDef();

		fixDef.density = 1.0;
		fixDef.friction = 0.5;
		fixDef.restitution = 0.2;
		fixDef.shape = new B2PolygonShape();
		fixDef.shape.SetAsBox(0.5, 0.5);

		bodyDef.type = B2Body.b2_staticBody;
		bodyDef.position.SetV(pos);

		world.CreateBody(bodyDef).CreateFixture(fixDef);
	}

	stage.addEventListener('stagemouseup', function (ev) {
		destinations[0].x = Math.floor(ev.stageX / gridPx);
		destinations[0].y = Math.floor(ev.stageY / gridPx);

		destinations[1].x = gridWidth - destinations[0].x - 1;
		destinations[1].y = gridHeight - destinations[0].y - 1;
	});
}

function round(val) {
	return val.toFixed(1);
}

//called periodically to update the game
//dt is the change of time since the last update (in seconds)
function gameTick(dt) {
	var i, agent;

	updateContinuumCrowdsData();

	//Calculate steering and flocking forces for all agents
	for (i = agents.length - 1; i >= 0; i--) {
		agent = agents[i];

		//Work out our behaviours
		var ff = agent.ff;//steeringBehaviourSeek(agent, destinations[agent.group]);
		var sep = steeringBehaviourSeparation(agent);
		var alg = steeringBehaviourAlignment(agent);
		var coh = steeringBehaviourCohesion(agent);

		//For visually debugging forces agent.forces = [ff.Copy(), sep.Copy(), alg.Copy(), coh.Copy()];

		agent.forceToApply = ff.Add(sep.Multiply(1.2)).Add(alg.Multiply(0.3)).Add(coh.Multiply(0.05));

		var lengthSquared = agent.forceToApply.LengthSquared();
		if (lengthSquared > agent.maxForceSquared) {
			agent.forceToApply.Multiply(agent.maxForce / Math.sqrt(lengthSquared));
		}
	}

	//Move agents based on forces being applied (aka physics)
	for (i = agents.length - 1; i >= 0; i--) {
		agent = agents[i];

		//Apply the force
		//console.log(i + ': ' + agent.forceToApply.x + ', ' + agent.forceToApply.y);
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
	var f00 = (isValid(floor.x, floor.y) ? ccFlowField[floor.x][floor.y] : B2Vec2.Zero).Copy();
	var f01 = (isValid(floor.x, floor.y + 1) ? ccFlowField[floor.x][floor.y + 1] : B2Vec2.Zero).Copy();
	var f10 = (isValid(floor.x + 1, floor.y) ? ccFlowField[floor.x + 1][floor.y] : B2Vec2.Zero).Copy();
	var f11 = (isValid(floor.x + 1, floor.y + 1) ? ccFlowField[floor.x + 1][floor.y + 1] : B2Vec2.Zero).Copy();

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

function steeringBehaviourSeek(agent, dest) {

	if (dest.x == agent.position().x && dest.y == agent.position().y) {
		return new B2Vec2();
	}


	//Desired change of location
	var desired = dest.Copy().Subtract(agent.position());
	//Desired velocity (move there at maximum speed)
	desired.Multiply(agent.maxSpeed / desired.Length());
	//The velocity change we want
	var velocityChange = desired.Subtract(agent.velocity());
	//Convert to a force
	return velocityChange.Multiply(agent.maxForce / agent.maxSpeed);
}

function steeringBehaviourSeparation(agent) {
	var totalForce = new B2Vec2();
	var neighboursCount = 0;

	for (var i = 0; i < agents.length; i++) {
		var a = agents[i];
		if (a != agent) {
			var distance = agent.position().DistanceTo(a.position());
			if (distance < agent.minSeparation && distance > 0) {
				//Vector to other agent
				var pushForce = agent.position().Copy().Subtract(a.position());
				var length = pushForce.Normalize(); //Normalize returns the original length
				var r = (agent.radius + a.radius);

				totalForce.Add(pushForce.Multiply(1 - ((length - r) / (agent.minSeparation - r))));//agent.minSeparation)));
				//totalForce.Add(pushForce.Multiply(1 - (length / agent.minSeparation)));
				//totalForce.Add(pushForce.Divide(agent.radius));

				neighboursCount++;
			}
		}
	}

	if (neighboursCount == 0) {
		return totalForce; //Zero
	}

	return totalForce.Multiply(agent.maxForce / neighboursCount);
}

function steeringBehaviourCohesion(agent) {
	//Start with just our position
	var centerOfMass = new B2Vec2()//agent.position().Copy();
	var neighboursCount = 0;

	for (var i = 0; i < agents.length; i++) {
		var a = agents[i];
		if (a != agent && a.group == agent.group) {
			var distance = agent.position().DistanceTo(a.position());
			if (distance < agent.maxCohesion) {
				//sum up the position of our neighbours
				centerOfMass.Add(a.position());
				neighboursCount++;
			}
		}
	}

	if (neighboursCount == 0) {
		return new B2Vec2();
	}

	//Get the average position of ourself and our neighbours
	centerOfMass.Divide(neighboursCount);

	//seek that position
	return steeringBehaviourSeek(agent, centerOfMass);
}

function steeringBehaviourAlignment(agent) {
	var averageHeading = new B2Vec2();
	var neighboursCount = 0;

	//for each of our neighbours (including ourself)
	for (var i = 0; i < agents.length; i++) {
		var a = agents[i];
		var distance = agent.position().DistanceTo(a.position());
		//That are within the max distance and are moving
		if (distance < agent.maxCohesion && a.velocity().Length() > 0 && a.group == agent.group) {
			//Sum up our headings
			var head = a.velocity().Copy();
			head.Normalize();
			averageHeading.Add(head);
			neighboursCount++;
		}
	}

	if (neighboursCount == 0) {
		return averageHeading; //Zero
	}

	//Divide to get the average heading
	averageHeading.Divide(neighboursCount);

	//Steer towards that heading
	return steerTowards(agent, averageHeading);
}

function steerTowards(agent, desiredDirection) {
	//Multiply our direction by speed for our desired speed
	var desiredVelocity = desiredDirection.Multiply(agent.maxSpeed);

	//The velocity change we want
	var velocityChange = desiredVelocity.Subtract(agent.velocity());
	//Convert to a force
	return velocityChange.Multiply(agent.maxForce / agent.maxSpeed);
}

var ccDensity = new Array(gridWidth);
for (var x = 0; x < gridWidth; x++) {
	ccDensity[x] = new Array(gridHeight);
}

var ccAvgVelocity = new Array(gridWidth);
for (var x = 0; x < gridWidth; x++) {
	var arr = ccAvgVelocity[x] = new Array(gridHeight);
	for (var y = 0; y < gridHeight; y++) {
		arr[y] = new B2Vec2();
	}
}

//The directional array is always [North, East, South, West]
var ccSpeedField = new Array(gridWidth);
for (var x = 0; x < gridWidth; x++) {
	var arr = ccSpeedField[x] = new Array(gridHeight);
	for (var y = 0; y < gridHeight; y++) {
		arr[y] = [0, 0, 0, 0];
	}
}
var ccCostField = new Array(gridWidth);
for (var x = 0; x < gridWidth; x++) {
	var arr = ccCostField[x] = new Array(gridHeight);
	for (var y = 0; y < gridHeight; y++) {
		arr[y] = [0, 0, 0, 0];
	}
}
var directionVectors = [
	new B2Vec2(0, -1),
	new B2Vec2(1, 0),
	new B2Vec2(0, 1),
	new B2Vec2(-1, 0)
];

var allDirectionVectors = [
	new B2Vec2(0, -1),
	new B2Vec2(1, 0),
	new B2Vec2(0, 1),
	new B2Vec2(-1, 0),

	new B2Vec2(1, 1),
	new B2Vec2(1, -1),
	new B2Vec2(-1, -1),
	new B2Vec2(-1, 1)
];
var ccPotentialField = new Array(gridWidth);
for (var x = 0; x < gridWidth; x++) {
	ccPotentialField[x] = new Array(gridHeight);
}

var ccFlowField = new Array(gridWidth);
for (var x = 0; x < gridWidth; x++) {
	var arr = ccFlowField[x] = new Array(gridHeight);
	for (var y = 0; y < gridHeight; y++) {
		arr[y] = new B2Vec2();
	}
}


function updateContinuumCrowdsData() {
	//First, clear all buffers
	ccClearBuffers();

	//Update density field and average speed map (4.1)
	ccCalculateDensityAndAverageSpeed();

	//CC Paper says this is group dependant, but I'm not sure how...
	ccCalculateUnitCostField();

	for (var group = 0; group <= 1; group++) //foreach group
	{
		ccClearPotentialField();

		//Construct the potential
		ccPotentialFieldEikonalFill(destinations[group]);
		//Compute the gradient
		//ccCalculatePotentialFieldGradient();
		ccGenerateFlowField(); //TODO: This does not use the way of calculating described in the paper (I think)

		//(use these for steering later)
		for (var i = agents.length - 1; i >= 0; i--) {
			if (agents[i].group == group) {
				agents[i].ff = steeringBehaviourFlowField(agents[i]);
			}
		}
	}
}

function ccClearBuffers() {
	var x, y, arr;

	//Clear the density field
	for (x = 0; x < gridWidth; x++) {
		arr = ccDensity[x];
		for (y = 0; y < gridHeight; y++) {
			arr[y] = 0;
		}
	}

	//Clear the average velocity field
	for (x = 0; x < gridWidth; x++) {
		arr = ccAvgVelocity[x];
		for (y = 0; y < gridHeight; y++) {
			arr[y].SetZero();
		}
	}

}

function ccCalculateDensityAndAverageSpeed() {
	var perAgentDensity = 1;

	for (var i = agents.length - 1; i >= 0; i--) {
		var agent = agents[i];

		//Add their density onto the density field like bilinear filtering
		//TODO: This isn't the same as the paper formula, will need investigating

		var floor = agent.position().Copy().Floor();

		var xWeight = agent.position().x - floor.x;
		var yWeight = agent.position().y - floor.y;

		//top left
		if (isValid(floor.x, floor.y)) {
			ccAddDensity(floor.x, floor.y, agent.velocity(), perAgentDensity * (1 - xWeight) * (1 - yWeight));
		}
		//top right
		if (isValid(floor.x + 1, floor.y)) {
			ccAddDensity(floor.x + 1, floor.y, agent.velocity(), perAgentDensity * (xWeight) * (1 - yWeight));
		}
		//bottom left
		if (isValid(floor.x, floor.y + 1)) {
			ccAddDensity(floor.x, floor.y + 1, agent.velocity(), perAgentDensity * (1 - xWeight) * (yWeight));
		}
		//bottom right
		if (isValid(floor.x + 1, floor.y + 1)) {
			ccAddDensity(floor.x + 1, floor.y + 1, agent.velocity(), perAgentDensity * (xWeight) * (yWeight));
		}
	}

	//Fix up the average velocity to be average rather than weighted sum
	for (x = 0; x < gridWidth; x++) {
		var densityArr = ccDensity[x];
		var velocityArr = ccAvgVelocity[x];
		for (y = 0; y < gridHeight; y++) {
			if (densityArr[y] > 0) {
				velocityArr[y].Divide(densityArr[y]);
			}
		}
	}
}

function ccAddDensity(x, y, velocity, weight) {
	ccDensity[x][y] += weight;

	var v = ccAvgVelocity[x][y];
	v.x += velocity.x * weight;
	v.y += velocity.y * weight;
}

function ccCalculateUnitCostField() {
	//Tuning variables for how much the density of a grid cell influences the speed you can travel in it
	//density >= max mean your speed is decided by the average speed in the cell
	//density <= min mean your speed is the maximum speed
	// in between we interpolate between the 2
	var densityMin = 0.5;
	var densityMax = 0.8;

	//Weights for formula (4) on page 4
	var lengthWeight = 1;
	var timeWeight = 1;
	//var discomfortWeight = 1; //unused as we have no discomfort field

	//foreach grid cell
	for (var x = 0; x < gridWidth; x++) {
		var speedArr = ccSpeedField[x];
		var costsArr = ccCostField[x];
		for (var y = 0; y < gridHeight; y++) {
			var speeds = speedArr[y];
			var costs = costsArr[y];

			//foreach direction we can leave that cell
			for (var i = 0; i < 4; i++) {
				var dir = directionVectors[i];
				var targetX = x + dir.x;
				var targetY = y + dir.y;

				//If I was to move from this grid cell to the one in the given direction
				// how bad would that be

				//If we'd move off the grid, don't go that way (also if we'd walk in to a wall would go here)
				if (!isValid(targetX, targetY)) {
					speeds[i] = Number.POSITIVE_INFINITY;
					continue;
				}

				//Calculate by looking at the average velocity of the destination
				// in the direction that we'd be travelling

				var speedVecX = dir.x * ccAvgVelocity[targetX][targetY].x;
				var speedVecY = dir.y * ccAvgVelocity[targetX][targetY].y;

				//Get the only speed value as one will be zero
				// this is like speedVecX != 0 ? : speedVecX : speedVecY
				var flowSpeed = speedVecX || speedVecY;

				var targetDensity = ccDensity[targetX][targetY];

				if (targetDensity >= densityMax) {
					speeds[i] = flowSpeed;
				} else if (targetDensity <= densityMin) {
					speeds[i] = Agent.prototype.maxSpeed;
				} else {
					//medium speed
					speeds[i] = Agent.prototype.maxSpeed - (targetDensity - densityMin) / (densityMax - densityMin) * (Agent.prototype.maxSpeed - flowSpeed);
				}

				//we're going to divide by speed later, so make sure it's not zero
				speeds[i] = Math.max(0.001, speeds[i]);


				//Work out the cost to move in to the destination cell
				costs[i] = (speeds[i] * lengthWeight + timeWeight /* + weightedDiscomfort * targetDiscomfort */) / speeds[i];
			}
		}
	}
}

function ccClearPotentialField() {
	for (var x = 0; x < gridWidth; x++) {
		var arr = ccPotentialField[x];
		for (var y = 0; y < gridHeight; y++) {
			arr[y] = Number.POSITIVE_INFINITY;
		}
	}
}


var ccEikonalVisited = new Array(gridWidth);
for (x = 0; x < gridWidth; x++) {
	ccEikonalVisited[x] = new Array(gridHeight);
}

function ccPotentialFieldEikonalFill(destination) {
	//Do a dijkstra style fill out from the destination.
	//We need to do this properly with priority lists and stuff as we will be using the cost field to go between cells

	for (var x = 0; x < gridWidth; x++) {
		var arr = ccEikonalVisited[x];
		for (var y = 0; y < gridHeight; y++) {
			arr[y] = false;
		}
	}

	//TODO: The PriorityQueue we are using is probably slow. Check the jsperf:
	// http://jsperf.com/js-priority-queue-queue-dequeue
	// https://github.com/adamhooper/js-priority-queue
	//I have no idea how array implementation could be faster than the other 2 implementations

	destination = destination.Copy();

	var candidates = new PriorityQueue({
		comparator: function (a, b) { return a.ccCost - b.ccCost; }
	});

	destination.ccCost = 0;
	candidates.queue(destination);

	var candidatesCount = 0;
	var failedCount = 0;

	//debugger;

	while (candidates.length > 0) {
		candidatesCount++;
		var at = candidates.dequeue();

		//console.log('at ' + at.x + ', ' + at.y + ' @ ' + at.ccCost);

		//We've got a better path
		if (ccPotentialField[at.x][at.y] >= at.ccCost && !ccEikonalVisited[at.x][at.y]) {
			//console.log(ccPotentialField[at.x][at.y] + ' >= ' + at.ccCost);

			ccPotentialField[at.x][at.y] = at.ccCost;
			ccEikonalVisited[at.x][at.y] = true;

			for (var i = 0; i < 4; i++) {
				var dir = directionVectors[i];

				var toX = at.x + dir.x;
				var toY = at.y + dir.y;
				if (isValid(toX, toY)) {

					//Cost to go from our target cell to the start
					//Our cost + cost of moving from the target to us
					var toCost = at.ccCost + ccCostField[toX][toY][(i + 2) % 4];

					//If we present a better path, overwrite the cost and queue up going to that cell
					if (toCost < ccPotentialField[toX][toY]) {
						//console.log('Queueing ' + toX + ', ' + toY + ' @ ' + toCost);
						ccPotentialField[toX][toY] = toCost;
						ccEikonalVisited[at.x][at.y] = false;

						var toVec = at.Copy().Add(dir);
						toVec.ccCost = toCost;
						candidates.queue(toVec);
					}
				}
			}
		} else {
			failedCount++;
		}
	}

	//console.log(candidatesCount + ' - ' + failedCount + ' ' + (gridWidth * gridHeight));
}

function ccGenerateFlowField() {
	var x, y;

	//Generate an empty grid, set all places as Vector2.zero, which will stand for no good direction
	for (x = 0; x < gridWidth; x++) {
		var arr = ccFlowField[x];
		for (y = 0; y < gridHeight; y++) {
			arr[y].SetZero();
		}
	}

	//for each grid square
	for (x = 0; x < gridWidth; x++) {
		for (y = 0; y < gridHeight; y++) {

			//Obstacles have no flow value
			if (ccPotentialField[x][y] == Number.POSITIVE_INFINITY) {
				continue;
			}

			//Go through all neighbours and find the one with the lowest distance
			var minDir = null;
			var minDist = Number.POSITIVE_INFINITY;

			for (var d = 0; d < allDirectionVectors.length; d++) {
				var dir = allDirectionVectors[d];


				if (isValid(x + dir.x, y + dir.y)) {
					var dist = ccPotentialField[x + dir.x][y + dir.y];

					if (dist < minDist) {
						minDir = dir;
						minDist = dist;
					}
				}
			}

			//If we found a valid neighbour, point in its direction
			if (minDir != null) {
				ccFlowField[x][y].SetV(minDir);
				ccFlowField[x][y].Normalize();
			}
		}
	}
}

//Helper method. Returns true if this grid location is on the grid
function isValid(x, y) {
	return x >= 0 && y >= 0 && x < gridWidth && y < gridHeight;
}
