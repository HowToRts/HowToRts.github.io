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
	//Create some initial towerss
	towers.push(new Tower(0, 0));
	towers.push(new Tower(5, 3));
}