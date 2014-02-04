---
layout: post
title:  "Flow Fields: Line of Sight"
description: "We add Line of Sight calculations to our Flow Field to improve accuracy near the destination"
date:   2014-01-30
---

Our current Flow Fields implementation is pretty good, but when the units are near to the destination, they will exhibit behaviour that looks wrong to the player. "Why isn't he just moving straight to where I clicked!? They can walk right there!!! Stupid Robots!"

Luckily, this isn't too hard to solve, at least a little bit :)

Note: The implementation I will describe here differs from the one in Game AI Pro. This one is much simpler (and probably quicker), but lower quality.

So how can we determine if a grid cell has Line of Sight to the destination cell? There are a few simple rules we can use:
- If you are the destination cell, you have Line of Site
- If you are a direct straight line neighbour of the destination cell, you have Line of Site

We can then expand these out a bit further

- If you are a straight line from the destination and the next cell closer to the destination has Line of Site, so do we

This is the rule we will abuse a bit. We need to handle the non straight vertical or horizontal to the destination case. For this we will look at the axis that we are the furtherest from the destination on, so if we are 2 across from the exit and 1 up, we will look at our neighbour in that direction, if they have LOS and the diagonal towards the exit has LOS, we do to.

- If the grid cell in the most influential direction towards the destination has LOS and the diagonal towards the destination has LOS, so do we

We also need to have a special case, if we are an exact diagonal to the exit, we only have LOS if all of the grid cells in the direction of the destination have LOS (so the diagonal, the one horizontally closer and the one vertically closer)


With these rules we can easily work out if any grid cell has Line of Site to the destination. As we can only calculate if a grid cell has LOS if we already know whether its neighbours that are closer to the exit have LOS we need to calculate it moving out from the destination cell, so we can just plug this in to our existing dijkstra fill!

We have a new field, <code>losGrid</code> a 2D array of booleans. false: No/unknown LOS, true: has LOS. All fields are initially set to false. Upon visiting each 

So our dijkstra fill now looks as follows, new lines have a +

{% highlight javascript tabsize=4 %}
function generateDijkstraGrid() {
	//Generate an empty grid
	//set all places as weight null, which will stand for unvisited
	for (var x = 0; x < gridWidth; x++) {
		var arr = dijkstraGrid[x],
+			arr2 = losGrid[x];
		for (var y = 0; y < gridHeight; y++) {
			arr[y] = null;
+			arr2[y] = false;
		}
	}

	//Set all places where obstacles are as being weight MAXINT, which will stand for not able to go here
	for (var i = 0; i < obstacles.length; i++) {
		var t = obstacles[i];

		dijkstraGrid[t.x][t.y] = Number.MAX_VALUE;
	}

	//flood fill out from the end point
	var pathEnd = destination.Copy();
	pathEnd.Round();
	pathEnd.distance = 0;
	dijkstraGrid[pathEnd.x][pathEnd.y] = 0;
+	losGrid[pathEnd.x][pathEnd.y] = true;

	var toVisit = [pathEnd];

	//for each node we need to visit, starting with the pathEnd
	for (i = 0; i < toVisit.length; i++) {
		var at = toVisit[i];

+		//Calculate if we have LOS
+		//Only need to see if don't have LOS if we aren't the end
+		if (at !== pathEnd) {
+			calculateLos(at, pathEnd);
+		}

		var neighbours = straightNeighboursOf(at);

		//for each neighbour of this node (only straight line neighbours, not diagonals)
		for (var j = 0; j < neighbours.length; j++) {
			var n = neighbours[j];

			//We will only ever visit every node once as we are always visiting nodes in the most efficient order
			if (dijkstraGrid[n.x][n.y] === null) {
				n.distance = at.distance + 1;
				dijkstraGrid[n.x][n.y] = n.distance;
				toVisit.push(n);
			}
		}
	}
}
{% endhighlight %}

The important part is the implementation of calculateLos, which is just implemented using the rules above.

{% highlight javascript tabsize=4 %}
function calculateLos(at, pathEnd) {
	var xDif = pathEnd.x - at.x;
	var yDif = pathEnd.y - at.y;

	var xDifAbs = Math.abs(xDif);
	var yDifAbs = Math.abs(yDif);

	var hasLos = false;

	var xDifOne = Math.sign(xDif);
	var yDifOne = Math.sign(yDif);

	//Check the direction we are furtherest from the destination on (or both if equal)
	// If it has LOS then we might

	//Check in the x direction
	if (xDifAbs >= yDifAbs) {

		if (losGrid[at.x + xDifOne][at.y]) {
			hasLos = true;
		}
	}
	//Check in the y direction
	if (yDifAbs >= xDifAbs) {

		if (losGrid[at.x][at.y + yDifOne]) {
			hasLos = true;
		}
	}

	//If we are not a straight line vertically/horizontally to the exit
	if (yDifAbs > 0 && xDifAbs > 0) {
		//If the diagonal doesn't have LOS, we don't
		if (!losGrid[at.x + xDifOne][at.y + yDifOne]) {
			hasLos = false;
		} else if (yDifAbs === xDifAbs) {
			//If we are an exact diagonal and either straight direction is a wall, we don't have LOS
			if (dijkstraGrid[at.x + xDifOne][at.y] === Number.MAX_VALUE || dijkstraGrid[at.x][at.y + yDifOne] === Number.MAX_VALUE) {
				hasLos = false;
			}
		}
	}
	//It's a definite now
	losGrid[at.x][at.y] = hasLos;

	//TODO: Could replace our distance with a direct distance?
	// Might not be worth it, would need to use a priority queue for the open list.
}
{% endhighlight %}

This gives us the following [result], cells with Line of Site are highlighted in yellow

[result]: /examples/9-flow-field-improvements-again/index.html

<iframe src="/examples/9-flow-field-improvements-again/index.html" style="width:800px; height:448px; background-color: white"></iframe>