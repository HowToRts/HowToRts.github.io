---
layout: post
title:  "Following a path"
description: "How to get enemies to follow a fixed path"
date:   2013-12-22
---

We're going to make enemies that follow a predetermined path. A lot of tower defense games get by with just this as far as enemy movement is concerned.

As this series is mainly focusing on algorithms and datastructures, I'm going to skip over anything that isn't relevant (like drawing stuff).

### Setup

We'll just keep a list of alive enemies:
{% highlight javascript tabsize=4 %}
var enemies = new Array();
{% endhighlight %}

And we need an enemy class, with a location and some bits for movement
{% highlight javascript tabsize=4 %}
Enemy = function (position) {
	this.position = position;

	this.pathIndex = 1; //The index in the path we are moving towards
	this.speed = 4; //grid squares / second
}
{% endhighlight %}

We also need a path for the enemies to follow, they will start at the first point and move along the path to the last point.
{% highlight javascript tabsize=4 %}
var path = [
	new Vector2(0, 3),
	new Vector2(3, 3),
	new Vector2(3, 5),
	new Vector2(6, 5),
	new Vector2(6, 2),
	new Vector2(4, 2)
];
{% endhighlight %}
The position x and y values are in grid units, with a integer (whole) number meaning the middle of that grid square.

### Running it

Every game tick we need to move all of our enemies, the code for moving an enemy looks as follows.

The idea is:

1. Work out how far we will travel this tick.
2. If our target is within this distance then
    1. Subtract the distance to it from the distance we are travelling this tick
    2. Move us to our target point
    3. Target the next point on the path
3. Finally, move us the (remaining) distance towards our target

_**Note:** If your enemies may arrive at multiple points in a single tick, then you need to loop the inner part._

In this code, dt is the change of time variable, it contains how much time (in seconds) has passed since the last update.
It will usually be 0.0166666s (1/60) as our game is running at 60 FPS

{% highlight javascript tabsize=4 %}
//foreach enemy
for (var i = enemies.length - 1; i >= 0; i--) {
	var e = enemies[i];

	//How far we will move in this update
	var distanceToMove = dt * e.speed;
	//A vector from ourself to our target position
	var vectorToTarget = path[e.pathIndex].minus(e.position);
	//How far away the target is
	var distanceToTarget = vectorToTarget.length();

	//We assume you'll never move more than one path point in a game tick

	//If we will arrive at the target this tick
	if (distanceToTarget < distanceToMove) {
		e.position = path[e.pathIndex]; //Arrive at the target
		e.pathIndex++;

		//If we hit the last point on the path, delete ourself
		if (e.pathIndex == path.length) {
			enemies.splice(i, 1);
			continue;
		}

		//recalculate for the new destination
		//Use up some of our movement moving to the path point
		distanceToMove -= distanceToTarget;
		//Work out the vector to our new target
		vectorToTarget = path[e.pathIndex].minus(e.position);
		//And our new distance (unused)
		distanceToTarget = vectorToTarget.length();
	}

	//Now move us along the path using our (remaining) movement
	e.position = e.position.plus(vectorToTarget.normalize().mul(distanceToMove));
	e.rotation = vectorToTarget.angle();
}
{% endhighlight %}

We will also spawn enemies periodically, this is easy
{% highlight javascript tabsize=4 %}
//How many seconds between spawning each enemy
var timeBetweenSpawns = 1;
//Time until the next spawn (start 0 so we immediately spawn one)
var timeToNextSpawn = 0;

function gameTick(dt) {

	//Count down our timer
	timeToNextSpawn -= dt;

	//If it expired
	if (timeToNextSpawn <= 0) {
		//Spawn an enemy
		enemies.push(new Enemy(path[0]));
		//Reset the timer
		timeToNextSpawn += timeBetweenSpawns;
	}
}
{% endhighlight %}

Mush these together with some code to draw the enemies, grid and path and you get something like this: [Running Example]


[Running Example]: /examples/1-follow-a-path/