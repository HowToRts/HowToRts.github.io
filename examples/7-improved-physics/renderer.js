//This file just deals with drawing things.
//It is probably cludgy as, don't look in here for good coding advice! :)s

var stage;
var gfxResources = {};

function init() {
	stage = new createjs.Stage('canvas');
	createjs.DisplayObject.suppressCrossDomainErrors = true;

	var queue = new createjs.LoadQueue(false);
	queue.addEventListener('complete', loadingComplete);
	queue.addEventListener('fileload', function (event) {

		//remove path and extension
		var filename = event.item.id.substring('../images/'.length);
		filename = filename.substr(0, filename.lastIndexOf('.'));

		gfxResources[filename] = event.result;
	});

	queue.loadFile('../images/tower.png');
	queue.loadFile('../images/turret.png');

	queue.loadFile('../images/agent.png');

	queue.load();
}

function createCenteredBitmap(filename) {
	var sprite = new createjs.Bitmap(gfxResources[filename]);
	sprite.regX = sprite.image.width / 2;
	sprite.regY = sprite.image.height / 2;
	return sprite;
}

var towerBitmaps = [];

var agentId = 1;
var agentBitmaps = {};

var targetShape;
var obstaclesShape;
var weightsAndFieldShape;

function loadingComplete() {
	startGame();

	var x, y;

	//Draw a grid
	var gridShape = new createjs.Shape();
	gridShape.x = 0.5;
	gridShape.y = 0.5;
	gridShape.graphics.beginStroke('#bbb').setStrokeStyle(1);
	for (x = 0; x < gridWidthPx; x += gridPx) {
		gridShape.graphics.moveTo(x, 0);
		gridShape.graphics.lineTo(x, gridHeightPx);
	}
	for (y = 0; y < gridHeightPx ; y += gridPx) {
		gridShape.graphics.moveTo(0, y);
		gridShape.graphics.lineTo(gridWidthPx, y);
	}
	stage.addChild(gridShape);


	targetShape = new createjs.Shape();
	targetShape.graphics.beginStroke('#00f');
	targetShape.graphics.drawCircle(0, 0, 5);
	stage.addChild(targetShape);

	obstaclesShape = new createjs.Shape();
	obstaclesShape.graphics.beginFill('#f00');
	for (var i = 0; i < obstacles.length; i++) {
		var o = obstacles[i];
		obstaclesShape.graphics.rect(o.x * gridPx, o.y * gridPx, gridPx, gridPx);
	}
	stage.addChild(obstaclesShape);

	weightsAndFieldShape = new createjs.Container();
	stage.addChild(weightsAndFieldShape);

	updateWeightsAndFieldVisuals();

	createjs.Ticker.setFPS(60);
	createjs.Ticker.addEventListener("tick", function () {
		gameTick(createjs.Ticker.getInterval() / 1000);
		rendererTick();
		stage.update();
	});
}

function updateWeightsAndFieldVisuals() {
	weightsAndFieldShape.removeAllChildren();

	//Draw the weights
	for (x = 0; x < gridWidth; x++) {
		for (y = 0; y < gridHeight; y++) {
			var d = dijkstraGrid[x][y];
			if (d == 0 || d === Number.MAX_VALUE) {
				continue;
			}
			var text = new createjs.Text('' + d, '16px Arial', '#000');
			text.x = (x + 0.5) * gridPx;
			text.y = (y + 0.5) * gridPx;
			text.textBaseline = 'middle';
			text.textAlign = 'center';
			weightsAndFieldShape.addChild(text);
		}
	}

	//Visualise the flow field
	var flowFieldShape = new createjs.Shape();
	flowFieldShape.x = gridPx / 2 + 0.5;
	flowFieldShape.y = gridPx / 2 + 0.5;
	flowFieldShape.graphics.beginStroke('#00f');
	for (x = 0; x < gridWidth; x++) {
		for (y = 0; y < gridWidth; y++) {
			if (flowField[x][y]) {
				var f = flowField[x][y];
				flowFieldShape.graphics.moveTo(x * gridPx, y * gridPx);
				flowFieldShape.graphics.lineTo((x + 0.5 * f.x) * gridPx, (y + 0.5 * f.y) * gridPx);
			}
		}
	}
	weightsAndFieldShape.addChild(flowFieldShape);
}

function rendererTick() {

	targetShape.x = (destination.x + 0.5) * gridPx;
	targetShape.y = (destination.y + 0.5) * gridPx;

	//Create new enemy bitmaps as required
	//Update enemy positions
	//Mark bitmaps as alive
	for (var i = 0; i < agents.length; i++) {
		var e = agents[i];
		if (!e._id) {
			e._id = (agentId++);
		}

		var bitmap = agentBitmaps[e._id];
		if (!bitmap) {
			bitmap = agentBitmaps[e._id] = createCenteredBitmap('agent');
			stage.addChild(bitmap);
		}

		bitmap.x = gridPx * (e.position().x + 0.5);
		bitmap.y = gridPx * (e.position().y + 0.5);
		bitmap.rotation = e.rotation;
	}
}