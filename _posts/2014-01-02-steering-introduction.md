---
layout: post
title:  "Steering Behaviours Introduction"
description: "To provide more realistic behaviour we'll look at driving our creeps around the grid"
date:   2014-01-02
---

For a real RTS game, we'll need units that don't walk through each other, that avoid obstacles and hopefully move as a group. For this we are going to look at steering behaviours.

There are a few good links you should go look at before we jump in to this:

If you have a GDC Vault subscription, you should go watch the first half of [this video] of Graham Penthenys GDC2013 presentation for a good introduction to steering, otherwise [grab the slides] and read through the first presentation

Another good set of slides are [available on slideshare]

[this video]: http://gdcvault.com/play/1018262/The-Next-Vector-Improvements-in
[grab the slides]: http://grahampentheny.com/wp-content/uploads/2013/03/The-Next-Vector.pdf
[available on slideshare]: http://www.slideshare.net/skooter500/introduction-to-steering-behaviours-for-autonomous-agents


The basics of steering is that we have a set of steering behaviours which we evaluate to work out a force to apply to our agent, examples of these are:

- Seek - Move towards a fixed point
- Flee - Move away from a fixed point
- Pursue - Predict the future location of an entity and seek to intercept it
- Evade - Predict the future location of an entity and flee to avoid it
- Avoidance - Avoid running in to things

Each of these behaviours looks at the current state of the system and returns a desired force to be applied to the agent.

We then have a method which applies some intelligence to combine the forces, which we then apply to the entity. The simplest way to do this is to just add them all up.


So, lets gets started. We are going to have an entity and a destination, and we'll implement the seek behaviour.

The definition of these look similar to before, which the addition of maxForce for setting our rate of acceleration
{% highlight javascript %}
//Defines an agent that moves
Agent = function (pos) {
	this.position = pos;
	this.rotation = 0;

	this.velocity = Vector2.zero;

	this.maxForce = 5; //rate of acceleration
	this.maxSpeed = 4; //grid squares / second
};

var destination = new Vector2(gridWidth - 2, 1); //Top right
{% endhighlight %}

Our update loop is now mainly physics.
{% highlight javascript %}
//called periodically to update the game
//dt is the change of time since the last update (in seconds)
function gameTick(dt) {

	//move agents
	for (var i = agents.length - 1; i >= 0; i--) {
		var agent = agents[i];

		//Work out the force for our behaviour
		var seek = steeringBehaviourSeek(agent);

		//Apply the force
		agent.velocity = agent.velocity.plus(seek.mul(dt));

		//Cap speed as required
		var speed = agent.velocity.length();
		if (speed > agent.maxSpeed) {
			agent.velocity = agent.velocity.mul(4 / speed);
		}

		//Calculate our new movement angle
		agent.rotation = agent.velocity.angle();

		//Move a bit
		agent.position = agent.position.plus(agent.velocity.mul(dt));
	}
}
{% endhighlight %}

Our initial behaviour is seek, which means we calculate a force towards our destination. Implementation of this is simple.

{% highlight javascript %}
function steeringBehaviourSeek(agent) {
	//Desired change of location
	var desired = destination.minus(agent.position);
	//Desired velocity (move there at maximum speed)
	desired = desired.mul(agent.maxSpeed / desired.length());
	//The velocity change we want
	var force = desired.minus(agent.velocity);
	//Convert to a force
	return force.mul(agent.maxForce / agent.maxSpeed);
}
{% endhighlight %}

This is a good start, but as the agents approach the target they'll move on top of each other. To help prevent this we'll use flocking behaviours. Our next post will go in to these in detail!

Check out the [Working Example] for this post.

[Working Example]: /examples/3-1-steering-behaviours-seek/
