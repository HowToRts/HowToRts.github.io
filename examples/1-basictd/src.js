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
Enemy = function (x, y) {
	this.position = new Vector2(x, y);
	this.rotation = 0;

	this.health = 100;
	this.speed = 4; //grid squares / second

	this.pathIndex = 1;
};

var path = [new Vector2(0, 3), new Vector2(3, 3), new Vector2(3, 5), new Vector2(6, 5), new Vector2(6, 2), new Vector2(4, 2)];

//Called to start the game
function startGame() {
	//Create some initial towers
	towers.push(new Tower(0, 0));
	towers.push(new Tower(5, 3));

	//Create a test enemy
	enemies.push(new Enemy(0, 3));
}

//called periodically to update the game
//dt is the change of time since the last update (in seconds)

var pathIndex = 0;
var percent = 0;

function gameTick(dt) {

	//move enemies
	for (var i = 0; i < enemies.length; i++) {
		var e = enemies[i];

		var distanceToMove = dt * e.speed;
		var vectorToTarget = path[e.pathIndex].minus(e.position);
		var distanceToTarget = vectorToTarget.length();

		//We assume you'll never move more than one path point in a game tick
		if (distanceToTarget < distanceToMove) {
			e.position = path[e.pathIndex];
			e.pathIndex++;

			//recalculate for the new destination
			distanceToMove -= distanceToTarget;
			vectorToTarget = path[e.pathIndex].minus(e.position);
			distanceToTarget = vectorToTarget.length();
		}

		e.position = e.position.plus(vectorToTarget.normalize().mul(distanceToMove));
		e.rotation = vectorToTarget.angle();
	}
}