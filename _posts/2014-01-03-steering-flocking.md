---
layout: post
title:  "Steering Behaviours: Flocking"
description: "Getting our agents to move as a group"
date:   2014-01-03
---

Flocking behaviours are a subset of steering behaviours where we consider the locations of our neighbouring agents to decide our forces. They are modelled of how flocks of birds work.
Again, a great reference from these is [this video] of Graham Penthenys GDC2013 presentation, or [grab the slides].

[this video]: http://gdcvault.com/play/1018262/The-Next-Vector-Improvements-in
[grab the slides]: http://grahampentheny.com/wp-content/uploads/2013/03/The-Next-Vector.pdf


We are going to implement the following:

- Separation - Move away from those entities we are too close too
- Cohesion - Move nearer to those entities we are near but not near enough to
- Alignment - Change our direction to be closer to our neighbours

These will get our entities moving around grouped together. Check out the [Completed Example]

[Completed Example]: /examples/3-2-steering-behaviours-flock/index.html

Let's look at each of these behaviours individually first.

### Separation

Separation calculates a force to move away from all of our neighbours. We do this by calculating a force from them to us and scaling it so the force is greater the nearer they are.

{% highlight javascript %}
function steeringBehaviourSeparation(agent) {
	var totalForce = Vector2.zero;
	var neighboursCount = 0;

	//for each agent
	for (var i = 0; i < agents.length; i++) {
		var a = agents[i];
		//that is not us
		if (a != agent) {
			var distance = agent.position.distanceTo(a.position);
			//that is within the distance we want to separate from
			if (distance < agent.minSeparation && distance > 0) {
				//Calculate a Vector from the other agent to us
				var pushForce = agent.position.minus(a.position);
				//Scale it based on how close they are compared to our radius
				// and add it to the sum
				totalForce = totalForce.plus(pushForce.div(agent.radius));
				neighboursCount++;
			}
		}
	}

	if (neighboursCount == 0) {
		return Vector2.zero;
	}

	//Normalise the force back down and then back up based on the maximum force
	totalForce = totalForce.div(neighboursCount);
	return totalForce.mul(agent.maxForce);
}
{% endhighlight %}


### Cohesion

Cohesion calculates a force that will bring us closer to our neighbours, so we move together as a group rather than individually. This is the opposite of what separation is trying to do, using them together is important but can tricky. We cover this later.

Cohesion calculates the average position of our neighbours and ourself, and steers us towards it

{% highlight javascript %}
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
{% endhighlight %}

### Alignment

Alignment calculates a force so that our direction is closer to our neighbours. It does this similar to cohesion, but by summing up the direction vectors (normalised velocities) of ourself and our neighbours and working out the average direction.

{% highlight javascript %}
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
{% endhighlight %}

### Cohesion vs Separation and other behaviours

As mentioned under cohesion above, in a situation such as this:<br />
<img src="/images/flocking.png" /><br/>
The agents at the front of the pack (far right) will have a cohesion force pulling them away from their seek target. This can mean that they do not reach their top speed as there is always a force slowing them down.

The solution I've decided upon is to scale down the effect of cohesion. For our purposes cohesion is not super important. So long as our units don't spread apart too much while moving then we are doing good.

To implement this and to combine our steering behaviours together, we change our main loop as follows

{% highlight javascript %}
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

		//Combine them to come up with a total force to apply, decreasing the effect of cohesion
		agent.forceToApply = seek.plus(separation).plus(cohesion.mul(0.1)).plus(alignment);
	}

	//Move agents based on forces being applied (aka physics)
	for (i = agents.length - 1; i >= 0; i--) {
		agent = agents[i];

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
{% endhighlight %}

You can see we have split our loop in two: First we calculate the forces on all of the agents, then we apply them. We must do it in two steps so that all agents see a consistent view of the world when calculating their behaviours.

### Using this in a real RTS

I haven't done this yet, but here are some notes.

Cohesion and Alignment probably only want to be concerned with other agents going to a similar location as us, otherwise we'll get caught up when other agents move past.

#### Performance considerations

Each of our behaviours works out the agents neighbours in a very inefficient way, and it is done multiple times every tick.
Instead we should store our agents in a data structure that provides efficient spatial searching ([Quadtree], [Cell Binning], [Wikipedia: Spatial index]).
We also don't need to calculate the neighbours every tick, we should be able to just recalculate them every couple and still have a good looking simulation.

[Quadtree]: http://en.wikipedia.org/wiki/Quadtree
[Cell Binning]: http://www.slac.stanford.edu/cgi-wrap/getdoc/slac-r-186.pdf
[Wikipedia: Spatial index]: http://en.wikipedia.org/wiki/Spatial_database#Spatial_index

#### Better than seek

For a real RTS there will probably be obstacles in the way that we need to path around. We'll need to avoid these when we are close to them, and we'll need to work out an efficient path to our target. We'll come back to these in future articles!
