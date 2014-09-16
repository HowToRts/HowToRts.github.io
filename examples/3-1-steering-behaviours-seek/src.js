//How big the grid is in pixels
var gridWidthPx = 800, gridHeightPx = 448;
var gridPx = 32;

//Grid size in actual units
var gridWidth = gridWidthPx / gridPx;
var gridHeight = gridHeightPx / gridPx;

//Storage for the current agents and obstacles
var agents = new Array();
var obstacles = new Array();

//Defines an agent that moves
Agent = function (pos) {
	this.position = pos;
	this.rotation = 0;

	this.velocity = Vector2.zero;

	this.maxForce = 5; //rate of acceleration
	this.maxSpeed = 4; //grid squares / second
};

var destination = new Vector2(gridWidth - 2, 1); //Top right

//Called to start the game
function startGame() {
	for (var i = 0; i < 5; i++) {
		agents.push(new Agent(new Vector2(Math.random() * gridWidth, Math.random() * gridHeight)));
	}

	stage.addEventListener('stagemouseup', function (ev) {
		destination.x = ev.stageX / gridPx - 0.5;
		destination.y = ev.stageY / gridPx - 0.5;
	});
}

//called periodically to update the game
//dt is the change of time since the last update (in seconds)
function gameTick(dt) {

	//move agents
	for (var i = agents.length - 1; i >= 0; i--) {
		var agent = agents[i];

		//Work out the force for our behaviour
		var seek = steeringBehaviourSeek(agent);

		//Apply the force
		agent.velocity = agent.velocity.plus(seek.mul(dt));

		//Cap speed as required
		var speed = agent.velocity.length();
		if (speed > agent.maxSpeed) {
			agent.velocity = agent.velocity.mul(4 / speed);
		}

		//Calculate our new movement angle
		agent.rotation = agent.velocity.angle();

		//Move a bit
		agent.position = agent.position.plus(agent.velocity.mul(dt));
	}
}

function steeringBehaviourSeek(agent) {

	//Desired change of location
	var desired = destination.minus(agent.position);
	//Desired velocity (move there at maximum speed)
	desired = desired.mul(agent.maxSpeed / desired.length());
	//The velocity change we want
	var velocityChange = desired.minus(agent.velocity);
	//Convert to a force
	return velocityChange.mul(agent.maxForce / agent.maxSpeed);
}