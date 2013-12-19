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
Enemy = function (x, y, health) {
	this.x = x;
	this.y = y;
	this.health = health;
};

//Called to start the game
function startGame() {
	//Create some initial towers
	towers.push(new Tower(0, 0));
	towers.push(new Tower(5, 3));

	//Create a test enemy
	enemies.push(new Enemy(2, 2, 100));
}

var path = new LineString([[0, 3], [3, 3], [3, 1], [9, 1]]);

//called periodically to update the game
//dt is the change of time since the last update (in milliseconds)

var pathIndex = 0;
var percent = 0;

function gameTick(dt) {

	percent += (dt / 1000);
	if (percent > 1) {
		percent -= 1;
		pathIndex++;
		if (pathIndex >= path.segments.length) {
			pathIndex = 0;
		}
	}
	var pos = path.segments[pathIndex].interpolatedPoint(percent);
	enemies[0].x = pos.x;
	enemies[0].y = pos.y;
}