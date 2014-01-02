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

	this.radius = 0.4;
	this.minSeparation = 0.8; // We'll move away from anyone nearer than this

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
		var seek = steeringBehaviourSeek(agent, destination);
		var separation = steeringBehaviourSeparation(agent);
		var cohesion = steeringBehaviourCohesion(agent);
		var alignment = steeringBehaviourAlignment(agent);

		//if (i == 0) {
		//	console.log(round(seek.length()) + ' ' + round(separation.length()) + ' ' + round(cohesion.length()) + ' ' + round(alignment.length()) + ' : ' + round(agent.velocity.length()));
		//}

		//Combine them to come up with a total force to apply, decreasing the effect of cohesion
		agent.forceToApply = seek.plus(separation).plus(cohesion.mul(0.1)).plus(alignment);
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