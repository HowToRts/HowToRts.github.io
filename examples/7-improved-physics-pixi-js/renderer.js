//This file just deals with drawing things.
//It is probably cludgy as, don't look in here for good coding advice! :)s

var stage, renderer;
var gfxResources = {};

function init() {
	stage = new PIXI.Stage(0xffffff);
	//renderer = new PIXI.CanvasRenderer(800, 448);
	renderer = PIXI.autoDetectRenderer(800, 448);
	document.body.appendChild(renderer.view);

	loadingComplete();
}

function createCenteredBitmap(filename) {
	var sprite = new createjs.Bitmap(gfxResources[filename]);
	sprite.regX = sprite.image.width / 2;
	sprite.regY = sprite.image.height / 2;
	return sprite;
}

var towerBitmaps = [];

var targetShape;
var obstaclesShape;
var weightsAndFieldShape;

function loadingComplete() {
	startGame();

	var x, y;

	//Draw a grid
	var gridShape = new PIXI.Graphics();
	gridShape.position.x = 0.5;
	gridShape.position.y = 0.5;
	gridShape.lineStyle(1, 0xbbbbbb, 1);
	for (x = 0; x < gridWidthPx; x += gridPx) {
		gridShape.moveTo(x, 0);
		gridShape.lineTo(x, gridHeightPx);
	}
	for (y = 0; y < gridHeightPx ; y += gridPx) {
		gridShape.moveTo(0, y);
		gridShape.lineTo(gridWidthPx, y);
	}
	stage.addChild(gridShape);


	targetShape = new PIXI.Graphics();
	targetShape.lineStyle(1, 0x0000ff, 1);
	targetShape.drawCircle(0, 0, 5);
	stage.addChild(targetShape);

	obstaclesShape = new PIXI.Graphics();
	obstaclesShape.position.x = 0.5;
	obstaclesShape.position.y = 0.5;
	obstaclesShape.beginFill(0xff0000);
	for (var i = 0; i < obstacles.length; i++) {
		var o = obstacles[i];
		obstaclesShape.drawRect(o.x * gridPx, o.y * gridPx, gridPx, gridPx);
	}
	stage.addChild(obstaclesShape);

	weightsAndFieldShape = new PIXI.DisplayObjectContainer();
	stage.addChild(weightsAndFieldShape);

	updateWeightsAndFieldVisuals();

	requestAnimFrame(tickFn);
}

function tickFn() {
	requestAnimFrame(tickFn);

	gameTick(1 / 60);
	rendererTick();
	renderer.render(stage);
}

function updateWeightsAndFieldVisuals() {
	for (var i = weightsAndFieldShape.children.length - 1; i >= 0; i--) {
		weightsAndFieldShape.removeChild(weightsAndFieldShape.children[i]);
	}

	//Draw the weights
	for (x = 0; x < gridWidth; x++) {
		for (y = 0; y < gridHeight; y++) {
			var d = dijkstraGrid[x][y];
			if (d == 0 || d === Number.MAX_VALUE) {
				continue;
			}
			var text = new PIXI.Text('' + d, { font: '16px Arial', fill: '#000' });
			text.updateText();
			text.position.x = ((x + 0.5) * gridPx - (text._width / 2)) | 0;
			text.position.y = ((y + 0.5) * gridPx - (text._height / 2)) | 0;
			//text.textBaseline = 'middle';
			//text.textAlign = 'center';
			weightsAndFieldShape.addChild(text);
		}
	}

	//Visualise the flow field
	var flowFieldShape = new PIXI.Graphics();
	flowFieldShape.position.x = gridPx / 2 + 0.5;
	flowFieldShape.position.y = gridPx / 2 + 0.5;
	flowFieldShape.lineStyle(1, 0x0000ff, 1);
	for (x = 0; x < gridWidth; x++) {
		for (y = 0; y < gridWidth; y++) {
			if (flowField[x][y]) {
				var f = flowField[x][y];
				flowFieldShape.moveTo(x * gridPx, y * gridPx);
				flowFieldShape.lineTo((x + 0.5 * f.x) * gridPx, (y + 0.5 * f.y) * gridPx);
			}
		}
	}
	weightsAndFieldShape.addChild(flowFieldShape);
}



var agentId = 1;
var agentBitmaps = {};
var agentForceLines = {};

//TODO: Can share the graphics object here apparently http://www.createjs.com/Docs/EaselJS/classes/Shape.html
function createAgentShape(agent) {
	var shape = new PIXI.Graphics();
	shape.lineStyle(1, 0x000000, 1);
	shape.drawCircle(0, 0, agent.radius * gridPx);

	shape.moveTo(0, 0);
	shape.lineTo(0, -agent.radius * gridPx);

	return shape;
}
function rendererTick() {

	targetShape.position.x = (destination.x + 0.5) * gridPx;
	targetShape.position.y = (destination.y + 0.5) * gridPx;

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
			bitmap = agentBitmaps[e._id] = createAgentShape(e);
			forceLine = agentForceLines[e._id] = new PIXI.Graphics();

			stage.addChild(bitmap);
			stage.addChild(forceLine);
		}

		bitmap.position.x = gridPx * (e.position().x + 0.5);
		bitmap.position.y = gridPx * (e.position().y + 0.5);
		bitmap.rotation = e.rotation * Math.PI / 180;

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