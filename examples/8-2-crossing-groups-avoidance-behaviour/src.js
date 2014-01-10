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

	this.maxForce = 20; //rate of acceleration
	this.maxSpeed = 4; //grid squares / second

	this.radius = 0.23;
	this.minSeparation = 0.8; // We'll move away from anyone nearer than this

	this.maxCohesion = 2; //We'll move closer to anyone within this bound

	this.maxForceSquared = this.maxForce * this.maxForce;
	this.maxSpeedSquared = this.maxSpeed * this.maxSpeed;

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

var destinations = [
	new B2Vec2(gridWidth - 2, gridHeight / 2), //middle right
	new B2Vec2(1, gridHeight / 2) //middle left
];

//Called to start the game
function startGame() {
	//for (var yPos = 1; yPos < gridHeight - 1; yPos++) {
	//	agents.push(new Agent(new B2Vec2(0, yPos), 0));
	//	agents.push(new Agent(new B2Vec2(1, yPos), 0));
	//	agents.push(new Agent(new B2Vec2(2, yPos), 0));
	//}

	//for (yPos = 1; yPos < gridHeight - 1; yPos++) {
	//	agents.push(new Agent(new B2Vec2(gridWidth - 1, yPos), 1));
	//	agents.push(new Agent(new B2Vec2(gridWidth - 2, yPos), 1));
	//	agents.push(new Agent(new B2Vec2(gridWidth - 3, yPos), 1));
	//}

	agents.push(new Agent(new B2Vec2(0, gridHeight / 2), 0));
	agents.push(new Agent(new B2Vec2(gridWidth - 2, gridHeight / 2), 1));

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
		destinations[0].x = ev.stageX / gridPx - 0.5;
		destinations[0].y = ev.stageY / gridPx - 0.5;

		destinations[1].x = (gridWidthPx - ev.stageX) / gridPx - 0.5;
		destinations[1].y = (gridHeightPx - ev.stageY) / gridPx - 0.5;
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
		var ff = steeringBehaviourSeek(agent, destinations[agent.group]);
		var sep = steeringBehaviourSeparation(agent);
		var alg = steeringBehaviourAlignment(agent);
		var coh = steeringBehaviourCohesion(agent);
		var avd = steeringBehaviourAvoid(agent);

		//For visually debugging forces agent.forces = [ff.Copy(), sep.Copy(), alg.Copy(), coh.Copy()];

		agent.forceToApply = ff.Add(sep.Multiply(1.2)).Add(alg.Multiply(0.3)).Add(coh.Multiply(0.05)).Add(avd.Multiply(4));

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

function steeringBehaviourAvoid(agent) {
	if (agent.velocity().LengthSquared() <= agent.radius) {
		return B2Vec2.Zero;
	}

	var minFraction = 2;
	var closestFixture = null;

	var callback = function (fixture, point, normal, fraction) {
		if (fraction < minFraction) {
			minFraction = fraction;
			closestFixture = fixture;
		}
		return 0;
	};
	world.RayCast(callback, agent.position(), agent.position().Copy().Add(agent.velocity()));
	//TODO: Offset ray casts
	var velCopy = agent.velocity().Copy();
	velCopy.Normalize();
	var temp = velCopy.x;
	velCopy.x = velCopy.y;
	velCopy.y = -temp;
	velCopy.Multiply(agent.radius);

	world.RayCast(callback, agent.position().Copy().Add(velCopy), agent.position().Copy().Add(agent.velocity()).Add(velCopy));
	world.RayCast(callback, agent.position().Copy().Subtract(velCopy), agent.position().Copy().Add(agent.velocity()).Subtract(velCopy));

	//TODO: May be faster to do a single AABB query or a shape query

	if (closestFixture == null) {
		return B2Vec2.Zero;
	}

	var resultVector = null;
	var runningInTo = null;

	var collisionBody = closestFixture.GetBody();
	var otherVelocity = collisionBody.GetLinearVelocity();

	var ourVelocity = agent.velocity().Copy();
	var ourLength = ourVelocity.LengthSquared();
	ourVelocity.Add(otherVelocity);

	var combinedVelocity = ourVelocity.LengthSquared();

	//We are going in the same direction
	if (combinedVelocity > ourLength) {
		return B2Vec2.Zero;
	}

	var otherType = closestFixture.GetShape().GetType();
	if (otherType == B2Shape.e_circleShape) {
		runningInTo = closestFixture.GetBody().GetPosition();

		//Steer to go around it
		var otherPosition = closestFixture.GetBody().GetPosition();
		var otherRadius = closestFixture.GetShape().GetRadius();

		//Vector in its direction
		var vectorInOtherDirection = otherPosition.Copy().Subtract(agent.position());

		//http://stackoverflow.com/questions/13221873/determining-if-one-2d-vector-is-to-the-right-or-left-of-another
		var dot = agent.velocity().x * -vectorInOtherDirection.y + agent.velocity().y * vectorInOtherDirection.x;//B2Math.Dot(agent.velocity(), vectorInOtherDirection);
		var isLeft = dot > 0;

		console.log(agent.group + ' ' + isLeft);
		//http://www.gamedev.net/topic/551175-rotate-vector-90-degrees-to-the-right/#entry4546571
		var rightAngle = isLeft ? new B2Vec2(-vectorInOtherDirection.y, vectorInOtherDirection.x) : new B2Vec2(vectorInOtherDirection.y, -vectorInOtherDirection.x);
		rightAngle.Normalize();

		rightAngle.Multiply(agent.radius + otherRadius);

		//Are we more left or right of them
		//Move it out based on our radius + theirs
		resultVector = rightAngle;//.Add(agent.position());
	} else if (otherType == B2Shape.e_polygonShape) {
		debugger; //TODO
	} else {
		debugger; //WTF!
	}
	//Might need to avoid them.

	return steerTowards(agent, resultVector);
}

function steerTowards(agent, desiredDirection) {
	//Multiply our direction by speed for our desired speed
	var desiredVelocity = desiredDirection.Multiply(agent.maxSpeed);

	//The velocity change we want
	var velocityChange = desiredVelocity.Subtract(agent.velocity());
	//Convert to a force
	return velocityChange.Multiply(agent.maxForce / agent.maxSpeed);
}