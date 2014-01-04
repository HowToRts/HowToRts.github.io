---
layout: post
title:  "Basic Flow Fields"
description: "Today we learn about the awesome pathing technique used by Supreme Commander 2 and Planetary Annihilation"
date:   2014-01-04
---

Finally, time to get to the good stuff :)

This article will go through what Flow Fields are and show a very basic implementation of them.
Everything in here was learnt from Elijah Emersons article in [Game AI Pro], Graham Penthenys article also in [Game AI Pro] and the [Continuum Crowds] Paper which also uses the technique. So a huge thank you to all of these people for doing the hard work. The [Game AI Pro] book is awesome and I wholeheartedly recommend buying it.

[Game AI Pro]: http://www.gameaipro.com/
[Continuum Crowds]: http://grail.cs.washington.edu/projects/crowd-flows/

If you haven't already, please go read the [Steering Behaviours Introduction] and [Generating a path with Dijkstra] as we'll be using these techniques.

[Steering Behaviours Introduction]: /2014/01/02/steering-introduction.html
[Generating a path with Dijkstra]: /2013/12/31/generating-a-path-dijkstra.html

Flow Fields are a technique for efficient crowd pathfinding. They are most suitable for situations where you want to move a large group of agents to a common destination, something very common in RTS games.
Flow fields are a steering behaviour, we'll be using them to replace our fixed point seek behaviour so that our agents instead follow the flow field to their destination.

Let's open up the rough [Working Example].

[Working Example]: /examples/4-basic-flow-fields/index.html

In this example, red squares are impassable areas, the blue circle at the right is the destination, the numbers are the distance of that grid square to the destination and the blue lines are the flowfield vectors which represent the path to the exit.

As you can see, the agents roughly follow a fairly efficient path from their starting position to the exit.
Sometimes they'll overlap the inpassable areas (we have no physics to prevent this) and they'll also move through each other (no physics and no flocking behaviours to prevent this). 
We'll add these in in a future article!

### Generating a Flow Field

A Flow Field is a grid where each grid square has a directional vector. This vector should be pointed in the direction of the most efficient way to get to the destination, while avoiding static obstacles.

There are many different techniques that can be used to generate a Flow Field, we are going to implement a minimal version and revisit it in a future article. Your terrain and design goals will influence how you generate your Flow Field.

#### Implementation

We will reuse our [dijkstra flood fill code from before], this generates the distance-to-destination numbers shown on the grid.

[dijkstra flood fill code from before]: /2013/12/31/generating-a-path-dijkstra.html

We then go through each grid square, look at all its neighbours (including diagonals), choose the one with the lowest distance-to-destination and set our grid square to have a vector in this direction. We do not set Vectors for impassable grid squares.

{% highlight javascript %}
function generateFlowField() {
	var x, y;

	//Generate an empty grid, set all places as Vector2.zero, which will stand for no good direction
	flowField = new Array(gridWidth);
	for (x = 0; x < gridWidth; x++) {
		var arr = new Array(gridHeight);
		for (y = 0; y < gridHeight; y++) {
			arr[y] = Vector2.zero;
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

			var pos = new Vector2(x, y);
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
				flowField[x][y] = min.minus(pos).normalize();
			}
		}
	}
}
{% endhighlight %}

This gives a grid like follows:
<img class="inline" src="/images/flowfield.png" />

You'll notice that there are grid squares which don't give the most efficient path (such as the 4 at the top right, it should be pointing directly at the destination), this happens as we only support straight lines and 45 degree diagonals. The Supreme Commander 2 implementation uses Line of Site tests to to the destination to provide better paths when nearby. We will also try and direct an agent on a diagonal between 2 impassable areas, which would not be passable.

With this grid in hand, we just need to create a new steering behaviour to follow it.

### Following the flow field

To follow the Flow Field we will implement a steering behaviour that directs the agent in the direction of the grid square it is standing on. To smooth this vector we will use [Bilinear Interpolation] so we get influenced by the 4 grid squares we are nearest to, with the closest providing the most influence.

[Bilinear Interpolation]: http://en.wikipedia.org/wiki/Bilinear_interpolation

{% highlight javascript %}
function steeringBehaviourFlowField(agent) {

	//Work out the force to apply to us based on the flow field grid squares we are on.
	//we apply bilinear interpolation on the 4 grid squares nearest to us to work out our force.
	// http://en.wikipedia.org/wiki/Bilinear_interpolation#Nonlinear

	var floor = agent.position.floor(); //Top left Coordinate of the 4

	//The 4 weights we'll interpolate, see http://en.wikipedia.org/wiki/File:Bilininterp.png for the coordinates
	var f00 = flowField[floor.x][floor.y];
	var f01 = flowField[floor.x][floor.y + 1];
	var f10 = flowField[floor.x + 1][floor.y];
	var f11 = flowField[floor.x + 1][floor.y + 1];

	//Do the x interpolations
	var xWeight = agent.position.x - floor.x;

	var top = f00.mul(1 - xWeight).plus(f10.mul(xWeight));
	var bottom = f01.mul(1 - xWeight).plus(f11.mul(xWeight));

	//Do the y interpolation
	var yWeight = agent.position.y - floor.y;

	//This is now the direction we want to be travelling in (needs to be normalized)
	var direction = top.mul(1 - yWeight).plus(bottom.mul(yWeight)).normalize();


	//If we are centered on a grid square with no vector this will happen
	if (isNaN(direction.length())) {
		return Vector2.zero;
	}

	//Multiply our direction by speed for our desired speed
	var desiredVelocity = direction.mul(agent.maxSpeed);

	//The velocity change we want
	var velocityChange = desiredVelocity.minus(agent.velocity);
	//Convert to a force
	return velocityChange.mul(agent.maxForce / agent.maxSpeed);
}
{% endhighlight %}

This steering behaviour can then be used to direct our agent as before. Easy as :)

### Future work

Above I've described the minimal essential components of Flow Fields to get our agents moving to their destination following a relatively efficient path.

To use this in a real game, we'll still need:

- **Physics** - To stop agents moving through impassable areas
- **Flocking Behaviours** - We probably want some degree of flocking behaviours so units don't get too separated.
- **Pre-emptive collision avoidance** - In SupCom2 the units will avoid running in to each other when you run 2 groups at one another. The original Continuum Crowds paper talks about this, I'm not sure what was implemented for SupCom2
- **Better Flow Field generation** - Our Flow Field does not contain optimal paths. It needs to be improved to make more efficient paths
- **Handle grid squares with some cost to traverse** - Currently we assume all grid squares are impossible to cross or free
- **Flow Field Tiling** - Generating a Flow Field for an entire game map will probably be too big to fit in memory, this is another technique used in Supreme Commander 2 and Planetary Annihilation to reduce memory usage and generation time
