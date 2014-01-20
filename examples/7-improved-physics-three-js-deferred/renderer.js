//This file just deals with drawing things.
//It is probably cludgy as, don't look in here for good coding advice! :)s

var stage;
var gfxResources = {};

var WIDTH = 800;
var HEIGHT = 448;
var VIEW_ANGLE = 45,
	ASPECT = WIDTH / HEIGHT,
	NEAR = 0.1,
	FAR = 10000;

var renderer, camera, scene;
var flatMaterial = new THREE.MeshPhongMaterial({ ambient: 0x030303, color: 0xdddddd, specular: 0x999999, shininess: 30, shading: THREE.FlatShading });
var groundMaterial = new THREE.MeshPhongMaterial({ color: 0xdddddd });
var sphereMaterial = new THREE.MeshPhongMaterial({ ambient: 0x030303, color: 0xdddddd, specular: 0xffffff, shininess: 70 });

var light;

function init() {
	renderer = new THREE.WebGLDeferredRenderer( { width: WIDTH, height: HEIGHT, scale: ASPECT });
	renderer.shadowMapEnabled = true;
	//renderer.shadowMapType = THREE.PCFShadowMap;


	renderer.shadowCameraNear = 3;
	renderer.shadowCameraFar = FAR;
	renderer.shadowCameraFov = 20;

	renderer.shadowMapBias = 0.0039;
	renderer.shadowMapDarkness = 0.1;
	renderer.shadowMapWidth = 128;
	renderer.shadowMapHeight = 128;


	camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

	scene = new THREE.Scene();
	scene.add(camera);
	camera.position.x = WIDTH / 2;
	camera.position.y = HEIGHT / 2;
	camera.position.z = 540;

	//renderer.setClearColor(0xffffff, 1);
	//renderer.autoClear = false;

	renderer.setSize(WIDTH, HEIGHT);
	document.body.appendChild(renderer.domElement);

	loadingComplete();
}

var towerBitmaps = [];

var targetShape;
var obstaclesShape;
var weightsAndFieldShape;

function loadingComplete() {
	startGame();

	// create a point light
	//var pointLight = new THREE.PointLight(0xFFFFFF);
	//pointLight.position.x = 10;
	//pointLight.position.y = 50;
	//pointLight.position.z = 130;
	//scene.add(pointLight);

	//light = new THREE.DirectionalLight(0xdddddd, 1);
	//light.position.x = -100;
	//light.position.y = 150 + HEIGHT / 2;
	//light.position.z = 400;
	//light.target.position.set(WIDTH / 2, HEIGHT / 2, 0);
	//light.castShadow = true;
	//light.shadowCameraVisible = true;
	//scene.add(light);


	//var ambient = new THREE.AmbientLight(0x222222);
	//scene.add(ambient);
    //
	//light = new THREE.SpotLight(0xffffff, 0.8, 4000, Math.PI / 2, 1);
	//light.position.set(-200, 200 + HEIGHT / 2, 600);
	//light.target.position.set(WIDTH / 2, HEIGHT / 2, 0);
    //
	//light.castShadow = true;
	//light.shadowCameraVisible = true;
    //
	//light.shadowCameraNear = 180;
	//light.shadowCameraFar = 2500;
	//light.shadowCameraFov = 50;
    //
	////light.shadowCameraVisible = true;
    //
	//light.shadowBias = 0.00001;
	//light.shadowDarkness = 0.5;
    //
	//light.shadowMapWidth = 1024;
	//light.shadowMapHeight = 1024;
    //
	//scene.add(light);

	var lineMaterial = new THREE.LineBasicMaterial({ color: 0xbbbbbb });

	var x, y;

	//Ground
	var groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, HEIGHT), groundMaterial);

	groundMesh.position.x = WIDTH / 2;
	groundMesh.position.y = HEIGHT / 2;
	groundMesh.position.z = 0;

	groundMesh.castShadow = false;
	groundMesh.receiveShadow = true;

	scene.add(groundMesh);

	//Draw a grid
	var gridGeometry = new THREE.Geometry();

	for (x = 0; x < gridWidthPx; x += gridPx) {
		if (((x / gridPx) % 2) == 1) {
			gridGeometry.vertices.push(new THREE.Vector3(x, 0));
			gridGeometry.vertices.push(new THREE.Vector3(x, gridHeightPx));
		} else {
			gridGeometry.vertices.push(new THREE.Vector3(x, gridHeightPx));
			gridGeometry.vertices.push(new THREE.Vector3(x, 0));
		}
	}
	for (y = 0; y < gridHeightPx ; y += gridPx) {
		if ((y / gridPx) % 2 == 1) {
			gridGeometry.vertices.push(new THREE.Vector3(0, y));
			gridGeometry.vertices.push(new THREE.Vector3(gridWidthPx, y));
		} else {
			gridGeometry.vertices.push(new THREE.Vector3(gridWidthPx, y));
			gridGeometry.vertices.push(new THREE.Vector3(0, y));
		}
	}
	var grid = new THREE.Line(gridGeometry, lineMaterial);
	grid.position.z = 1;
	scene.add(grid);


	for (var i = 0; i < obstacles.length; i++) {
		var o = obstacles[i];

		var cube = new THREE.Mesh(new THREE.CubeGeometry(gridPx, gridPx, gridPx), flatMaterial);
		cube.position.x = (o.x + 0.5) * gridPx;
		cube.position.y = (o.y + 0.5) * gridPx;
		cube.position.z = gridPx / 2;

		cube.castShadow = true;
		cube.receiveShadow = true;

		scene.add(cube);
	}

	rendererTick();

	return; //TODO

	targetShape = new createjs.Shape();
	targetShape.graphics.beginStroke('#00f');
	targetShape.graphics.drawCircle(0, 0, 5);
	stage.addChild(targetShape);

	weightsAndFieldShape = new createjs.Container();
	stage.addChild(weightsAndFieldShape);

	updateWeightsAndFieldVisuals();
}

function updateWeightsAndFieldVisuals() {
	return; //TODO
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



var agentId = 1;
var agentMeshes = {};
var agentForceLines = {};

//TODO: Can share the graphics object here apparently http://www.createjs.com/Docs/EaselJS/classes/Shape.html
function createAgentMesh(agent) {
	//var sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
	//`var sphereMaterial = new THREE.MeshNormalMaterial();
	var sphere = new THREE.Mesh(new THREE.SphereGeometry(agent.radius * gridPx, 16, 16), sphereMaterial);
	sphere.z = agent.radius * gridPx / 2;

	sphere.castShadow = true;
	sphere.receiveShadow = true;

	
	var light1 = new THREE.PointLight( 0xffffff, 1, 300 );

	light1.castShadow = true;

	light1.shadowCameraNear = 3;
	light1.shadowCameraFar = 500;
	light1.shadowCameraFov = 50;

	light1.shadowBias = 0.0001;
	light1.shadowDarkness = 0.8;

	light1.shadowMapWidth = 128;
	light1.shadowMapHeight = 128;
	
	sphere._light = light1;
	//TODO: Direction angle thing

	return sphere;
}
function rendererTick() {
	requestAnimationFrame(rendererTick);

	gameTick(1 / 60);


	//My code here...
	//Create new enemy bitmaps as required
	//Update enemy positions
	//Mark bitmaps as alive
	for (var i = 0; i < agents.length; i++) {
		var e = agents[i];
		if (!e._id) {
			e._id = (agentId++);
		}

		var mesh = agentMeshes[e._id];
		//var forceLine = agentForceLines[e._id];
		if (!mesh) {
			mesh = agentMeshes[e._id] = createAgentMesh(e);
			//forceLine = agentForceLines[e._id] = new createjs.Shape();

			scene.add(mesh);
			scene.add(mesh._light);
			//stage.addChild(forceLine);
		}

		mesh.position.x = gridPx * (e.position().x + 0.5);
		mesh.position.y = gridPx * (e.position().y + 0.5);
		//mesh.rotation = e.rotation;

		mesh._light.position.set( mesh.position.x, mesh.position.y, 100);

		//if (e.forces) {
		//	forceLine.x = bitmap.x;
		//	forceLine.y = bitmap.y;
		//	for (var j = 0; j < e.forces.length; j++) {
		//		e.forces[j].Multiply(4);
		//	}
		//	forceLine.graphics.clear().beginStroke('#f00').moveTo(0, 0).lineTo(e.forces[0].x, e.forces[0].y);
		//	forceLine.graphics.beginStroke('#0f0').moveTo(0, 0).lineTo(e.forces[1].x, e.forces[1].y);
		//	forceLine.graphics.beginStroke('#00f').moveTo(0, 0).lineTo(e.forces[2].x, e.forces[2].y);
		//}
	}


	renderer.render(scene, camera);
	return;
	targetShape.x = (destination.x + 0.5) * gridPx;
	targetShape.y = (destination.y + 0.5) * gridPx;
}