---
layout: post
title:  "Avoidance Behaviours"
description: "Lets try not crash in to each other"
date:   2014-01-14
---

[Here] is an example of 2 groups trying to cross without trying to avoid each other. As you can see, things don't go very well!

[Here]: /examples/8-0-crossing-groups-seek/

To try improve this, I [previously implemented Continuum Crowds], which worked somewhat, certainly better than just crashing in to each other.

[previously implemented Continuum Crowds]: /2014/01/09/continuum-crowds.html

In this article I'm going to try using basic collision avoidance (Based on [Reynolds Obstacle Avoidance steering behavior]).

[Reynolds Obstacle Avoidance steering behavior]: http://www.red3d.com/cwr/steer/Obstacle.html

The algorithm is simple:

- We perform a ray cast in front of each Agent, the length based on the velocity the agent is travelling at (The faster we are travelling, the further ahead we should look to avoid)
- If we find an obstacle, we ask it if it is turning to avoid. If it is, we turn the same way (two agents travelling in opposite direction towards each other but both turning left will avoid each other).
- If it is not turning, we work out whether we should turn left or right to avoid them and do so.
- The strength of the steering force varies depending how close the other agent is compared to our velocity (The sooner we will collide, the harder we should turn).

The code ends up being quite big, so lets jump in to it.

{% highlight javascript tabsize=4 %}
function steeringBehaviourAvoid(agent) {

	//If we aren't moving much, we don't need to try avoid
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

	//If we aren't going to collide, we don't need to avoid
	if (closestFixture == null) {
		return B2Vec2.Zero;
	}

	var resultVector = null;
	var collisionBody = closestFixture.GetBody();
	var ourVelocityLengthSquared = agent.velocity().LengthSquared();
	
	//Add our velocity and the other Agents velocity
	//If this makes the total length longer than the individual length of one of them, then we are going in the same direction
	var combinedVelocity = agent.velocity().Copy().Add(collisionBody.GetLinearVelocity());
	var combinedVelocityLengthSquared = combinedVelocity.LengthSquared();

	//We are going in the same direction and they aren't avoiding
	if (combinedVelocityLengthSquared > ourVelocityLengthSquared && closestFixture.GetUserData().avoidanceDirection === null) {
		return B2Vec2.Zero;
	}

	//We need to Steer to go around it, we assume the other shape is also a circle

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

	//Steer torwards it, increasing force based on how close we are
	return steerTowards(agent, resultVector).Divide(minFraction);
}
{% endhighlight %}

We then combine the resulting force with our other steering behaviours.

This simple collision avoidance works well for [one agent in each direction](/examples/8-2-crossing-groups-avoidance-behaviour/index.html#onemiddle)  
And it works okay for [small groups](/examples/8-2-crossing-groups-avoidance-behaviour/index.html#smallgroups)

But when the individual units are coming in on a [big angle](/examples/8-2-crossing-groups-avoidance-behaviour/index.html#onetop)  
Or the [groups are large](/examples/8-2-crossing-groups-avoidance-behaviour/index.html). Then things don't work quite as well.

_The green lines shown in these examples are the avoidance steering forces._

So, how can we improve this? Using Reciprocal Velocity Obstacles would be one way to improve, it may have a high CPU cost however. [video demonstration](http://www.youtube.com/watch?v=1Fn3Mz6f5xA).  

I think we could do some fudging of the physics which would allow our agents to slide past each other better. Currently when two agents collide head on, they are both pushed backwards (in the opposite direction than they want to go), we could instead push them sideways (the right angle), which would let them slide past each other much easier! This is probably a cheaper way for a game to go, even if the physics aren't quite real :)