---
layout: post
title:  "Flow Fields Improvements"
description: "Lets improve our Flow Field so we get some more efficient movement"
date:   2014-01-05
---

In the last article we did some of the basic work to get a flow field generated, but the flow field we made is far from perfect. Lets take a look at some of the issues.

### Issues

#### Corners of obstacles
<img class="inline" src="/images/2014-01-05/corner.png" />
The 25 on the left and the 24 at the bottom right are suggesting that the agent walk through the impassable obstacle. These should probably point straight up and straight right respectively.

<img class="inline" src="/images/2014-01-05/tight-diagonal.png" />
A similar issue, here the 18 in the middle is suggesting we walk between 2 impassable obstacles.

To solve this we should probably only allow 45 degree movement if all 4 of the grid squares in the path are pathable.

#### Equal / Tie breaker
<img class="inline" src="/images/2014-01-05/equal.png" />
Here the destination is in the middle on the far right.
For the grid squares to the left of the obstacle going either up or down would be equally optimal, however we can only choose one for each grid square, and we've chosen up.
If any agents moving along the bottom drift close to the middle then they will have an upwards force applied and move to go around the top of the obstacle, resulting in a bad path.

Solving this is probably easiest done by increasing the resolution of our grid, discussed below.

#### Near destination
<img class="inline" src="/images/2014-01-05/near-destination.png" />
Here the 3 at the bottom right should clearly be pointing straight at the destination as it has a clear path to it.

We should integrate the Line of Site tests as recommended in Elijahs article in [Game AI Pro] to solve this one.

[Game AI Pro]: http://www.gameaipro.com/

### Solutions

#### Diagonals (Corners of obstacles)

To solve our diagonal issues above, we need to improve our flow field generation to not consider partially blocked diagonal neighbours as neighbours.

`generateFlowField` uses `allNeighboursOf` which calculates and returns all of the neighbours of a grid square.
The current implementation always returns all of them, let's instead modify it to return just those that are not obstructed.

{% highlight javascript tabsize=4 %}

//Helper method. Returns true if this grid location is on the grid and not impassable
function isValid(x, y) {
	return x >= 0 && y >= 0 && x < gridWidth && y < gridHeight && dijkstraGrid[x][y] != Number.MAX_VALUE;
}

//Returns the non-obstructed neighbours of the given grid location.
//Diagonals are only included if their neighbours are also not obstructed
function allNeighboursOf(v) {
	var res = [],
		x = v.x,
		y = v.y;

	var up = isValid(x, y - 1),
		down = isValid(x, y + 1),
		left = isValid(x - 1, y),
		right = isValid(x + 1, y);

	//We test each straight direction, then subtest the next one clockwise

	if (left) {
		res.push(new Vector2(x - 1, y));

		//left up
		if (up && isValid(x - 1, y - 1)) {
			res.push(new Vector2(x - 1, y - 1));
		}
	}

	//... Code continues as the above block going around clockwise, removed ...

	return res;
}
{% endhighlight %}

With this change the movement of our agents in tighter spaces seems much better and they walk through the impassable areas less, which will be important later when we finally have some physics that stops them from doing so.

#### Resolution of grid (Equal / Tie breaker)

The resolution of the Flow Field grid is something that I haven't seen discussed yet, so here is a brain dump of my thoughts on it.

- Your grid should be at least twice the resolution of your smallest obstacle, to help avoid issues like shown above.
- If your smallest unit is larger than a grid cell, there will be paths that should be traverable that will not be.
- A lower resolution grid is quicker to generate and uses less memory.
- A higher resolution grid will provide better pathing results, especially in congested areas.

In Planetary Annihilation it appears they currently use a grid such that the smallest unit is just under the size of one grid cell, and that the smallest building is slightly larger than one grid cell.
<img class="inline" src="/images/2014-01-05/pa.png" />
In this screenshot the white areas are impassable, green are slightly costly to go over (so units will avoid if possible). The buildings are walls (smallest structure) and the unit at the bottom is a dox (smallest unit).

You'll note that they support arbitrary rotation of buildings and make the area impassable to match. It would appear that currently walls can take up an area of 2x1, 2x2 3x1 or a triangle. I expect a 1x1 area may be possible if you place a wall perfectly.

To solve the tied directions issue in our example, I initially made the obstacles take up a 2x2 grid area, which is essentially the same as doubling the grid resolution in each axis.

This improved the pathing, but the bad behaviour can still occur in the following case:
<img class="inline" style="padding-bottom: 10px" src="/images/2014-01-05/drift.png" />
If you are at the highlighted 7 or 6, all of your neighbours are suggesting that you move up and to the right, which will push you in to a more expensive path.

Some thoughts on things that may improve our resulting flowfield:

- If our original Dijkstra fill counted diagonals correctly we may get a better result (this case wouldn't be improved).
- If we looked at all neighbours within a larger radius (shown below). we may be able to avoid this case as the numbers below the highlighted ones would be sending us further to the right than up, so any units coming out of the gap would likely take the bottom path. This will increase flow field generation time.
<img class="inline" style="padding-bottom: 10px" src="/images/2014-01-05/bigger-radius.png" />
- We could add another pass to our flow field generation. When setting directions, record all those grid cells that have multiple best directions. After setting directions for everyone, go back over these and mirror them if they have a neighbour pointing in the same direction as them. (Would help in this double resolution case, but not the general case)
- We could add multiple vectors to those grid cells with multiple best directions. Something like "Go NE or SE, whichever points the most towards you". This could be implemented by a flag.
- Similar to above, have a flag that means that the vector should be calculated to point towards the lowest distance-to-destination cell of the agents 4 closest cells.
- We could create a steering behaviour that would move agents away from grid cells with larger cost. This would improve this case as we'd move directly right from the highlighted squares.

I've implemented a variation on the last one. I've called it lowestCost. We look at the 4 closest grid cells and steer towards the one with the lowest distance-to-destination. We apply the resulting force with less weight than the Flow Field as this provides less ideal steering.

It's definitely not an ideal behaviour as it can make longer paths less optimal, however the path it makes seems more reasonable, so I'm going to use it for now. I'll keep thinking on ways to do with out it, the NE/SE flag or something similar seems favourable. Suggestions welcome!

{% highlight javascript tabsize=4 %}
function steeringBehaviourLowestCost(agent) {

	//Do nothing if the agent isn't moving
	if (agent.velocity.length() == 0) {
		return Vector2.zero;
	}

	//Find our 4 closest neighbours
	var floor = agent.position.floor(); //Top left Coordinate of the 4
	var f00 = isValid(floor.x, floor.y) ? dijkstraGrid[floor.x][floor.y] : Number.MAX_VALUE;
	var f01 = isValid(floor.x, floor.y + 1) ? dijkstraGrid[floor.x][floor.y + 1] : Number.MAX_VALUE;
	var f10 = isValid(floor.x + 1, floor.y) ? dijkstraGrid[floor.x + 1][floor.y] : Number.MAX_VALUE;
	var f11 = isValid(floor.x + 1, floor.y + 1) ? dijkstraGrid[floor.x + 1][floor.y + 1] : Number.MAX_VALUE;

	//Find the position(s) of the lowest, there may be multiple
	var minVal = Math.min(f00, f01, f10, f11);
	var minCoord = [];

	if (f00 == minVal) {
		minCoord.push(floor.plus(new Vector2(0, 0)));
	}
	if (f01 == minVal) {
		minCoord.push(floor.plus(new Vector2(0, 1)));
	}
	if (f10 == minVal) {
		minCoord.push(floor.plus(new Vector2(1, 0)));
	}
	if (f11 == minVal) {
		minCoord.push(floor.plus(new Vector2(1, 1)));
	}

	//Tie-break by choosing the one we are most aligned with
	var currentDirection = agent.velocity.normalize();
	var desiredDirection;
	minVal = Number.MAX_VALUE;
	for (var i = 0; i < minCoord.length; i++) {
		var directionTo = minCoord[i].minus(agent.position).normalize();
		var length = directionTo.minus(currentDirection).length();
		if (length < minVal) {
			minVal = length;
			desiredDirection = directionTo;
		}
	}

	//Steer towards it
	return steerTowards(agent, desiredDirection);
}
{% endhighlight %}


#### Line of Site (Near destination)

I'm going to save this for its own article as we need to do a fair bit of work to get ready for it. Coming soon!

### Conclusions and future work

We've improved the Flow Field we generate to not drive us in to walls so much, and hopefully make us get off the correct path a bit less.

We still need to implement LOS testing and probably do some more general improvements to our Flow Field such as setting cells to have vectors with better than 45 degree accuracy.

[Here is the example with the above improvements]

[Here is the example with the above improvements]: /examples/5-flow-field-improvements/index.html

