var stage;
var gfx = {};

function init() {
	stage = new createjs.Stage('canvas');
	createjs.DisplayObject.suppressCrossDomainErrors = true;

	var queue = new createjs.LoadQueue(false);
	queue.addEventListener('complete', realInit);
	queue.addEventListener('fileload', function (event) {
		gfx[event.item.id.substring('../images/'.length)] = event.result;
	});

	queue.loadFile('../images/tower.png');
	queue.loadFile('../images/turret.png');

	queue.load();
}

function realInit() {
	var gridSize = 32;

	var grid = new createjs.Shape();
	grid.graphics.beginStroke('#000').setStrokeStyle(1);
	for (var x = 0; x < 800; x += gridSize) {
		grid.graphics.moveTo(x, 0);
		grid.graphics.lineTo(x, 448);
	}
	for (var y = 0; y < 448 ; y += gridSize) {
		grid.graphics.moveTo(0, y);
		grid.graphics.lineTo(800, y);
	}

	stage.addChild(grid);

	var sprite = new createjs.Bitmap(gfx['tower.png']);
	sprite.regX = sprite.image.width / 2;
	sprite.regY = sprite.image.height / 2;
	sprite.x = 16;
	sprite.y = 16;
	stage.addChild(sprite);


	sprite = new createjs.Bitmap(gfx['turret.png']);
	sprite.regX = sprite.image.width / 2;
	sprite.regY = sprite.image.height / 2;
	sprite.x = 16;
	sprite.y = 16;
	stage.addChild(sprite);



	stage.update();
}