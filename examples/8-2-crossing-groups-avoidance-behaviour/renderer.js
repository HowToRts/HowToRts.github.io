//This file just deals with drawing things.
//It is probably cludgy as, don't look in here for good coding advice! :)s

var stage;
var gfxResources = {};

function init() {
	stage = new createjs.Stage('canvas');
	createjs.DisplayObject.suppressCrossDomainErrors = true;

	loadingComplete();
}

function createCenteredBitmap(filename) {
	var sprite = new createjs.Bitmap(gfxResources[filename]);
	sprite.regX = sprite.image.width / 2;
	sprite.regY = sprite.image.height / 2;
	return sprite;
}

var towerBitmaps = [];

var targetShape, targetShape2;
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

	targetShape2 = new createjs.Shape();
	targetShape2.graphics.beginStroke('#f00');
	targetShape2.graphics.drawCircle(0, 0, 5);
	stage.addChild(targetShape2);

	obstaclesShape = new createjs.Shape();
	obstaclesShape.graphics.beginFill('#f00');
	for (var i = 0; i < obstacles.length; i++) {
		var o = obstacles[i];
		obstaclesShape.graphics.rect(o.x * gridPx, o.y * gridPx, gridPx, gridPx);
	}
	stage.addChild(obstaclesShape);

	createjs.Ticker.setFPS(60);
	createjs.Ticker.addEventListener("tick", function () {
		gameTick(createjs.Ticker.getInterval() / 1000);
		rendererTick();
		stage.update();
	});
}



var agentId = 1;
var agentBitmaps = {};
var agentForceLines = {};

//TODO: Can share the graphics object here apparently http://www.createjs.com/Docs/EaselJS/classes/Shape.html
function createAgentShape(agent, firstGroup) {
	var shape = new createjs.Shape();
	shape.graphics.beginStroke(firstGroup ? '#00f' : '#f00');
	shape.graphics.drawCircle(0, 0, agent.radius * gridPx);

	shape.graphics.moveTo(0, 0);
	shape.graphics.lineTo(0, -agent.radius * gridPx);

	return shape;
}
function rendererTick() {

	targetShape.x = (destinations[0].x + 0.5) * gridPx;
	targetShape.y = (destinations[0].y + 0.5) * gridPx;

	targetShape2.x = (destinations[1].x + 0.5) * gridPx;
	targetShape2.y = (destinations[1].y + 0.5) * gridPx;

	//Create new enemy bitmaps as required
	//Update enemy positions
	//Mark bitmaps as alive
	for (var i = 0; i < agents.length; i++) {
		var e = agents[i];
		if (!e._id) {
			e._id = (agentId++);
		}

		var bitmap = agentBitmaps[e._id];
		var forceLine = agentForceLines[e._id];
		if (!bitmap) {
			bitmap = agentBitmaps[e._id] = createAgentShape(e, i < agents.length / 2);
			forceLine = agentForceLines[e._id] = new createjs.Shape();

			stage.addChild(bitmap);
			stage.addChild(forceLine);
		}

		bitmap.x = gridPx * (e.position().x + 0.5);
		bitmap.y = gridPx * (e.position().y + 0.5);
		bitmap.rotation = e.rotation;

		if (e.forces) {
			forceLine.x = bitmap.x;
			forceLine.y = bitmap.y;
			for (var j = 0; j < e.forces.length; j++) {
				e.forces[j].Multiply(4);
			}
			forceLine.graphics.clear().beginStroke('#f00').moveTo(0, 0).lineTo(e.forces[0].x, e.forces[0].y);
			forceLine.graphics.beginStroke('#0f0').moveTo(0, 0).lineTo(e.forces[1].x, e.forces[1].y);
			forceLine.graphics.beginStroke('#00f').moveTo(0, 0).lineTo(e.forces[2].x, e.forces[2].y);
		}
	}
}