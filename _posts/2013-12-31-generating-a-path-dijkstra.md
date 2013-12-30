---
layout: post
title:  "Generating a path with Dijkstra"
description: "Rather than specifying a path, we'll use Dijkstras algorithm to work out the most efficient path"
date:   2013-12-31
---

So we know how to get enemies to follow a path, now we change that path from being hard coded, into something that we can dynamically recalculate.

First, we'll add a list of tower positions, these don't need anything more than a location, so we'll just re-use the Vector2 class.
{% highlight javascript %}
var towers = new Array();
{% endhighlight %}

And we'll populate this with a bunch of randomly placed towers so we need to path around them:
{% highlight javascript %}
//Called to start the game
function startGame() {
	//Create some initial randomly placed towers
	for (var i = 0; i < 120; i++) {
		var x = parseInt(Math.random() * gridWidth);
		var y = parseInt(Math.random() * gridHeight)
		towers.push(new Vector2(x, y));
	}

	//Generate the Dijkstra grid and find a path, explained next
	generateDijkstraGrid();
	generatePathFromDijkstraGrid();
}
{% endhighlight %}

From here we could use [A-Star] to find a path from the start to the end, and if that is all we wanted to know then that'd be perfect. However, in tower defense games such as [Desktop Tower Defense], the user can place a tower while there are creeps on the field.
This can change the best path from the start to the exit so that there are creeps on the field who are no longer on this path, so they all need new paths. Running A* for all of the creeps on the field can become expensive.

To improve this we instead do a complete Dijkstra fill on the grid so we know the distance for all locations to the exit. We can then use this to work out if placing a tower would stop a creep from being able to reach the exit (as the grid square they are on would have no distance set), and we can use it to generate new paths for all of the creeps on the grid cheaply.

Wikipedia has a great write up on [Dijkstras Algorithm], please go read that first! I'll only go into the particular implementation details of our version.

[A-Star]: http://en.wikipedia.org/wiki/A*_search_algorithm
[Desktop Tower Defense]: http://armorgames.com/play/1128/desktop-tower-defense-15
[Dijkstras Algorithm]: http://en.wikipedia.org/wiki/Dijkstra%27s_algorithm

### Implementation

Now is probably a good time to open the [Running example] so you can see it in action. If no blue line appears, then no path was found. Refresh the page to generate a new one.

[Running example]: /examples/2-dijkstra-path-building/

We start at the end node as this is the destination of all possible routes, this is the middle on the far right. The end node is pre-populated with 0 distance, meaning 0 distance to the end node. From here we perform a [breadth-first search] outwards until we have visited all nodes that we can.

[breadth-first search]: http://en.wikipedia.org/wiki/Breadth-first_search

At each node we visit, we look at all neighbouring nodes. For those that have not yet had a distance set and that do not contain a tower, we set their distance to the distance of the current node + 1 and enqueue them in the list of nodes to be visited. We continue this process for each node in the to be visited queue until we are out of nodes.

Dijkstras Algorithm relies on visiting nodes in order of lowest distance. In our implementation this is free as our breadth-first search is guaranteed to alway visit the node with the lowest distance. This is only true as the cost of traversing from any node to its neighbour is always 1.

In practice, the algorithm will run something like this:

1. We are at the starting node, it's distance is set to 0.
2. For each of our neighbour nodes that are not blocked by a tower
    1. Set their distance to 1 and add them to the list to be visited
3. For each of the nodes in the to be visited list (these all have distance 1)
    1. For each of our neighbour nodes that are not blocked by a tower and that have not already been visited (no distance is set yet)
        1. Set their distance to 2 and add them to the list to be visited
3. For each of the nodes in the to be visited list (these all have distance 2)
    1. For each of our neighbour nodes that are not blocked by a tower and that have not already been visited (no distance is set yet)
        1. Set their distance to 3 and add them to the list to be visited

And so on until no nodes remain.

Once this is completed, we have everything we need to know to directly compute a path from anywhere on the grid to the end. In fact, you may realise that we don't actually need to generate a path for each creep on the grid, we can just look at the value of the tile it is on and its neighbours and move the creep in the direction of its lowest value neighbour.

Our implementation of the Dijkstra fill follows:

{% highlight javascript %}
function generateDijkstraGrid() {
	//Generate an empty grid, set all places as weight null, which will stand for unvisited
	dijkstraGrid = new Array(gridWidth);
	for (var x = 0; x < gridWidth; x++) {
		var arr = new Array(gridHeight);
		for (var y = 0; y < gridHeight; y++) {
			arr[y] = null;
		}
		dijkstraGrid[x] = arr;
	}

	//Set all places where towers are as being weight MAXINT, which will stand for not able to go here
	for (var i = 0; i < towers.length; i++) {
		var t = towers[i];

		dijkstraGrid[t.x][t.y] = Number.MAX_VALUE;
	}

	//flood fill out from the end point
	pathEnd.distance = 0;
	dijkstraGrid[pathEnd.x][pathEnd.y] = 0;

	var toVisit = [pathEnd];

	//for each node we need to visit, starting with the pathEnd
	for (i = 0; i < toVisit.length; i++) {
		var neighbours = neighboursOf(toVisit[i]);

		//for each neighbour of this node (only straight line neighbours, not diagonals)
		for (var j = 0; j < neighbours.length; j++) {
			var n = neighbours[j];

 			//We will only ever visit every node once as we are always visiting nodes in the most efficient order
			if (dijkstraGrid[n.x][n.y] === null) {
				n.distance = toVisit[i].distance + 1;
				dijkstraGrid[n.x][n.y] = n.distance;
				toVisit.push(n);
			}
		}
	}
}
{% endhighlight %}
