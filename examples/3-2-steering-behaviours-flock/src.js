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

	this.maxForce = 5; //rate of acceleration
	this.maxSpeed = 4; //grid squares / second

	this.radius = 0.5;
	this.minSeparation = 1; // We'll move away from anyone nearer than this

	this.maxCohesion = 5.5; //We'll move closer to anyone within this bound
};

var destination = new Vector2(gridWidth - 2, gridHeight / 2); //middle right

//Called to start the game
function startGame() {
	agents.push(new Agent(new Vector2(1, gridHeight - 2)));
	agents.push(new Agent(new Vector2(1, gridHeight - 3)));
	agents.push(new Agent(new Vector2(1, gridHeight - 4)));
	agents.push(new Agent(new Vector2(1, gridHeight - 5)));

	agents.push(new Agent(new Vector2(2, gridHeight - 3)));
	agents.push(new Agent(new Vector2(2, gridHeight - 4)));
	agents.push(new Agent(new Vector2(2, gridHeight - 5)));

	stage.addEventListener('stagemouseup', function (ev) {
		destination.x = ev.stageX / gridPx - 0.5;
		destination.y = ev.stageY / gridPx - 0.5;
	});
}

function round(val) {
	return Math.round(val * 10) / 10;
}

//called periodically to update the game
//dt is the change of time since the last update (in seconds)
function gameTick(dt) {
	var i, agent;

	//Calculate steering and flocking forces for all agents
	for (i = agents.length - 1; i >= 0; i--) {
		agent = agents[i];

		//Work out our behaviours
		var seek = steeringBehaviourSeek(agent, destination);
		var separation = steeringBehaviourSeparation(agent);
		var cohesion = steeringBehaviourCohesion(agent);
		var alignment = steeringBehaviourAlignment(agent);

		if (i == 0) {
			console.log(round(seek.length()) + ' ' + round(separation.length()) + ' ' + round(cohesion.length()) + ' ' + round(alignment.length()) + ' : ' + round(agent.velocity.length()));
		}

		//If there is significant separation going on, don't apply cohesion as they'll just fight each other
		if (separation.length() > 3) {
			cohesion = Vector2.zero;
		}

		agent.forceToApply = seek.plus(separation).plus(cohesion).plus(alignment).mul(dt);
	}

	//Move agents based on forces being applied (aka physics)
	for (i = agents.length - 1; i >= 0; i--) {
		agent = agents[i];

		//Apply the force
		agent.velocity = agent.velocity.plus(agent.forceToApply);

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
	var force = desired.minus(agent.velocity);
	//Convert to a force
	return force.mul(agent.maxForce / agent.maxSpeed);
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


//TODO: This is taken from skooter500 and is different to the GDC presentation, it has a weird formula
function steeringBehaviourSeparation2(agent) {
	var steeringForce = Vector2.zero;

	for (var i = 0; i < agents.length; i++) {
		var a = agents[i];
		if (a != agent) {
			var distance = agent.position.distanceTo(a.position);
			if (distance < agent.minSeparation && distance > 0) {
				//Vector to other agent
				var toAgent = agent.position.minus(a.position);
				steeringForce = steeringForce.plus(toAgent.normalize().div(toAgent.length()));
			}
		}
	}

	return steeringForce;
}

function steeringBehaviourCohesion(agent) {
	var centerOfMass = Vector2.zero;
	var neighboursCount = 0;

	for (var i = 0; i < agents.length; i++) {
		var a = agents[i];
		if (a != agent) {
			var distance = agent.position.distanceTo(a.position);
			if (distance < agent.maxCohesion) {
				centerOfMass = centerOfMass.plus(a.position);
				neighboursCount++;
			}
		}
	}

	if (neighboursCount == 0) {
		return Vector2.zero;
	}

	centerOfMass = centerOfMass.div(neighboursCount);

	return steeringBehaviourSeek(agent, centerOfMass);
}

function steeringBehaviourAlignment(agent) {
	var averageHeading = agent.velocity.length() == 0 ? Vector2.zero : agent.velocity.normalize();
	var neighboursCount = 0;

	for (var i = 0; i < agents.length; i++) {
		var a = agents[i];
		if (a != agent) {
			var distance = agent.position.distanceTo(a.position);
			if (distance < agent.maxCohesion) {
				averageHeading = averageHeading.plus(a.velocity.length() == 0 ? Vector2.zero : a.velocity.normalize());
				neighboursCount++;
			}
		}
	}

	if (neighboursCount == 0) {
		return Vector2.zero;
	}

	averageHeading = averageHeading.div(neighboursCount);

	var desired = averageHeading.mul(agent.maxSpeed);
	var force = desired.minus(agent.velocity);
	return force.mul(agent.maxForce / agent.maxSpeed);
}