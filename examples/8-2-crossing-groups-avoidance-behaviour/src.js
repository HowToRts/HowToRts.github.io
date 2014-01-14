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

	this.maxForce = 50; //rate of acceleration
	this.maxSpeed = 4; //grid squares / second

	this.radius = 0.23;
	this.minSeparation = this.radius * 4; // We'll move away from anyone nearer than this

	this.maxCohesion = this.radius * 10; //We'll move closer to anyone within this bound

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

	this.body.SetUserData(this);
	this.fixture.SetUserData(this);
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
	var url = document.URL;
	var hash = url.substring(url.indexOf("#")+1);

	if (hash == 'onemiddle') {
		agents.push(new Agent(new B2Vec2(0, gridHeight / 2), 0));
		agents.push(new Agent(new B2Vec2(gridWidth - 2, gridHeight / 2), 1));
	} else if (hash == 'onetop') {
		agents.push(new Agent(new B2Vec2(0, 2), 0));
		agents.push(new Agent(new B2Vec2(gridWidth - 2, 2), 1));
		destinations[0].y = gridHeight - 1;
		destinations[1].y = gridHeight - 1;
	} else if (hash == 'smallgroups') {

		for (var yPos = gridHeight / 2 - 1; yPos <= gridHeight / 2 + 1; yPos++) {
			agents.push(new Agent(new B2Vec2(0, yPos), 0));
			agents.push(new Agent(new B2Vec2(1, yPos), 0));
			agents.push(new Agent(new B2Vec2(2, yPos), 0));
			agents.push(new Agent(new B2Vec2(gridWidth - 1, yPos), 1));
			agents.push(new Agent(new B2Vec2(gridWidth - 2, yPos), 1));
			agents.push(new Agent(new B2Vec2(gridWidth - 3, yPos), 1));
		}
	} else {
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
	}


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

	for (i = agents.length - 1; i >= 0; i--) {
		agents[i].avoidanceDirection = null;
	}

	//Calculate steering and flocking forces for all agents
	for (i = agents.length - 1; i >= 0; i--) {
		agent = agents[i];

		//Work out our behaviours
		var ff = steeringBehaviourSeek(agent, destinations[agent.group]);
		var sep = steeringBehaviourSeparation(agent);
		var alg = steeringBehaviourAlignment(agent);
		var coh = steeringBehaviourCohesion(agent);
		var avd = steeringBehaviourAvoid(agent);

		agent.avd = avd.Copy();

		//For visually debugging forces agent.forces = [ff.Copy(), sep.Copy(), alg.Copy(), coh.Copy()];

		agent.forceToApply = ff.Add(sep.Multiply(2.2)).Add(alg.Multiply(0.3)).Add(coh.Multiply(0.05)).Add(avd);

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

	//Do some ray casts to work out what is in front of us
	var minFraction = 2;
	var closestFixture = null;

	var callback = function (fixture, point, normal, fraction) {
		//Ignore ourself
		if (fixture == agent.fixture) {
			return fraction;
		}
		//Only care about dynamic (moving) things
		if (fraction < minFraction && fixture.GetBody().GetType() == B2Body.b2_dynamicBody) {
			minFraction = fraction;
			closestFixture = fixture;
		}
		return 0;
	};

	//Do a straight forward cast from our center
	world.RayCast(callback, agent.position(), agent.position().Copy().Add(agent.velocity()));

	//Calculate an offset so we can do casts from our edge
	var velCopy = agent.velocity().Copy();
	velCopy.Normalize();
	var temp = velCopy.x;
	velCopy.x = velCopy.y;
	velCopy.y = -temp;
	velCopy.Multiply(agent.radius);

	//Do a raycast forwards from our right and left edge
	world.RayCast(callback, agent.position().Copy().Add(velCopy), agent.position().Copy().Add(agent.velocity()).Add(velCopy));
	world.RayCast(callback, agent.position().Copy().Subtract(velCopy), agent.position().Copy().Add(agent.velocity()).Subtract(velCopy));

	//TODO: May be faster to do a single AABB query or a shape query

	if (closestFixture == null) {
		return B2Vec2.Zero;
	}

	var resultVector = null;

	var collisionBody = closestFixture.GetBody();

	var ourVelocityLengthSquared = agent.velocity().LengthSquared();
	var combinedVelocity = agent.velocity().Copy().Add(collisionBody.GetLinearVelocity());

	var combinedVelocityLengthSquared = combinedVelocity.LengthSquared();

	//We are going in the same direction and they aren't avoiding
	if (combinedVelocityLengthSquared > ourVelocityLengthSquared && closestFixture.GetUserData().avoidanceDirection === null) {
		return B2Vec2.Zero;
	}

	//Steer to go around it
	var otherType = closestFixture.GetShape().GetType();
	if (otherType == B2Shape.e_circleShape) {

		var vectorInOtherDirection = closestFixture.GetBody().GetPosition().Copy().Subtract(agent.position());

		//Are we more left or right of them
		var isLeft;
		if (closestFixture.GetUserData().avoidanceDirection !== null) {
			//If they are avoiding, avoid with the same direction as them, so we go the opposite way
			isLeft = closestFixture.GetUserData().avoidanceDirection;
		} else {
			//http://stackoverflow.com/questions/13221873/determining-if-one-2d-vector-is-to-the-right-or-left-of-another
			var dot = agent.velocity().x * -vectorInOtherDirection.y + agent.velocity().y * vectorInOtherDirection.x;
			isLeft = dot > 0;
		}
		agent.avoidanceDirection = isLeft;

		//Calculate a right angle of the vector between us
		//http://www.gamedev.net/topic/551175-rotate-vector-90-degrees-to-the-right/#entry4546571
		resultVector = isLeft ? new B2Vec2(-vectorInOtherDirection.y, vectorInOtherDirection.x) : new B2Vec2(vectorInOtherDirection.y, -vectorInOtherDirection.x);
		resultVector.Normalize();

		//Move it out based on our radius + theirs
		resultVector.Multiply(agent.radius + closestFixture.GetShape().GetRadius());
	} else {
		//Not supported
		//otherType == B2Shape.e_polygonShape
		debugger;
	}

	//Steer torwards it, increasing force based on how close we are
	return steerTowards(agent, resultVector).Divide(minFraction);
}

function steerTowards(agent, desiredDirection) {
	//Multiply our direction by speed for our desired speed
	var desiredVelocity = desiredDirection.Multiply(agent.maxSpeed);

	//The velocity change we want
	var velocityChange = desiredVelocity.Subtract(agent.velocity());
	//Convert to a force
	return velocityChange.Multiply(agent.maxForce / agent.maxSpeed);
}