//How big the grid is in pixels
var gridWidthPx = 800, gridHeightPx = 448;
var gridPx = 32;

//Grid size in actual units
var gridWidth = gridWidthPx / gridPx;
var gridHeight = gridHeightPx / gridPx;

//Storage for the current towers and enemies
var towers = new Array();
var enemies = new Array();

//Defines a tower that shoots
Tower = function (x, y) {
	this.x = x;
	this.y = y;
};

//Defines an enemy that moves
Enemy = function (pos) {
	this.position = pos;
	this.rotation = 0;

	this.health = 100;
	this.speed = 4; //grid squares / second

	this.pathIndex = 1;
};

var pathStart = new Vector2(0, parseInt(gridHeight / 2));
var pathEnd = new Vector2(gridWidth - 1, parseInt(gridHeight / 2));

var path = [];

//Called to start the game
function startGame() {
	//Create some initial towers
	for (var i = 0; i < 50; i++) {
		towers.push(new Tower(parseInt(Math.random() * gridWidth), parseInt(Math.random() * gridHeight)));
	}

	generateDijkstraGrid();
	generatePathFromDijkstraGrid();
}

//called periodically to update the game
//dt is the change of time since the last update (in seconds)

var timeBetweenSpawns = 1;
var timeToNextSpawn = 0;

function gameTick(dt) {

	//move enemies
	for (var i = enemies.length - 1; i >= 0; i--) {
		var e = enemies[i];

		var distanceToMove = dt * e.speed;
		var vectorToTarget = path[e.pathIndex].minus(e.position);
		var distanceToTarget = vectorToTarget.length();

		//We assume you'll never move more than one path point in a game tick
		if (distanceToTarget < distanceToMove) {
			e.position = path[e.pathIndex];
			e.pathIndex++;

			if (e.pathIndex == path.length) {
				enemies.splice(i, 1);
				continue;
			}

			//recalculate for the new destination
			distanceToMove -= distanceToTarget;
			vectorToTarget = path[e.pathIndex].minus(e.position);
			distanceToTarget = vectorToTarget.length();
		}

		e.position = e.position.plus(vectorToTarget.normalize().mul(distanceToMove));
		e.rotation = vectorToTarget.angle();
	}

	timeToNextSpawn -= dt;
	if (timeToNextSpawn <= 0) {
		timeToNextSpawn += timeBetweenSpawns;
		enemies.push(new Enemy(path[0]));
	}
}

var dijkstraGrid;

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

	for (i = 0; i < toVisit.length; i++) {
		var neighbours = neighboursOf(toVisit[i]);

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

function generatePathFromDijkstraGrid() {
	//if the start point has a weight, we can path there, 

	var currentWeight = dijkstraGrid[pathStart.x][pathStart.y];
	if (currentWeight === null || currentWeight === Number.MAX_VALUE) {
		return;
	}

	path.push(pathStart);

	var at = pathStart;
	while (at.x != pathEnd.x || at.y != pathEnd.y) {
		 currentWeight = dijkstraGrid[at.x][at.y];

		var neighbours = neighboursOf(at);
		var next = null;
		var nextWeight = currentWeight;

		//We are going to take the first neighbour that has lower weight than our current position
		//Randomly chosing between them or rotating which one you choose may give me pleasing results
		for (var i = 0; i < neighbours.length; i++) {
			var neighbour = neighbours[i];
			var neighbourWeight = dijkstraGrid[neighbour.x][neighbour.y];
			if (neighbourWeight < nextWeight) {
				next = neighbour;
				nextWeight = neighbourWeight;
			}
		}

		path.push(next);
		at = next;
	}
}

function neighboursOf(v) {
	var res = [];
	if (v.x > 0) {
		res.push(new Vector2(v.x - 1, v.y));
	}
	if (v.y > 0) {
		res.push(new Vector2(v.x, v.y - 1));
	}

	if (v.x < gridWidth - 1) {
		res.push(new Vector2(v.x + 1, v.y));
	}
	if (v.y < gridHeight - 1) {
		res.push(new Vector2(v.x, v.y + 1));
	}

	return res;
}