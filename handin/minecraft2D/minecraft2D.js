var BLOCKS_X = 40;
var BLOCKS_Y = 30;

var BlockType = {
	OFB: [0.0, 0.0, 0.0], // out of bounds
	AIR: [0.0, 0.0, 1.0],
	STONE: [0.5, 0.5, 0.5],
	GRASS: [0.0, 1.0, 0.0],
	DIRT: [0.7, 0.4, 0.3],
	WOOD: [0.8901, 0.6627, 0.4352],
	METAL: [0.8, 0.8, 0.8],
	WATER: [0.6, 0.8509, 0.9176],
	FIRE: [1.0, 0.0, 0.0]
};
var canvas;
var gl;

var blockProgram;
var world;
var worldBufferId;

var wireProgram;
var wireBufferId;

var stickmanProgram;
var stickmanBufferId;

var mouseX;
var mouseY;

var Stickman = {
	x: 20,
	y: 16,
	width: 2,
	left: false,
	right: false,
	jumping: false
}

var selectedBlock = BlockType.DIRT;

var clickWaveTime = 0.0;
var clickWaveRadius = 0.0;
var clickWavePositionX = 0;
var clickWavePositionY = 0;

window.onload = function init() {
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);

	if (!gl) {
		alert("gl not working");
	} else {
		setListeners();
		// Gief debug
		gl = WebGLDebugUtils.makeDebugContext(gl);

		//start spot 0,0 and canvas width and height
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(1.0, 1.0, 1.0, 1.0);

		// program for world
		blockProgram = initShaders(gl, "vertex-block-shader", "fragment-block-shader");

		// program for wire frame and stickman
		wireProgram = initShaders(gl, "vertex-wire-shader", "fragment-wire-shader");

		createWorld();
		worldBufferId = gl.createBuffer();

		wireBufferId = createWireFrame();
		stickmanBufferId = createStickman();

		render();
	}
}

function startClickWave() {
	clickWaveTime = 2.5;
	clickWaveRadius = 0.0;
	clickWavePositionX = mouseX;
	clickWavePositionY = mouseY;
}

function setListeners() {
	//click function	
	canvas.addEventListener("click", function(event) {
		var tileX = Math.floor((event.clientX - canvas.offsetLeft) / 20);
		var tileY = BLOCKS_Y - Math.floor((event.clientY - canvas.offsetTop) / 20) - 1;

		if (getBlock(tileX, tileY) != BlockType.AIR) {
			startClickWave();
			setBlock(tileX, tileY, BlockType.AIR);
		} else {
			if (canPlaceBlock()) {
				startClickWave();
				setBlock(tileX, tileY, selectedBlock);
			}
		}
	});

	//mouse movement function	
	canvas.addEventListener("mousemove", function(event) {
		mouseX = Math.floor((event.clientX - canvas.offsetLeft) / 20);
		mouseY = BLOCKS_Y - Math.floor((event.clientY - canvas.offsetTop) / 20) - 1;
	});
	//keyboard selection function
	window.addEventListener("keypress", function(event) {
		var intKey = event.which || event.keyCode; // firefox or chrome
		var key = String.fromCharCode(intKey);

		switch (key) {
			case '1':
				selectedBlock = BlockType.DIRT;
				break;
			case '2':
				selectedBlock = BlockType.GRASS;
				break;
			case '3':
				selectedBlock = BlockType.WOOD;
				break;
			case '4':
				selectedBlock = BlockType.WATER;
				break;
			case '5':
				selectedBlock = BlockType.FIRE;
				break;
			case '6':
				selectedBlock = BlockType.STONE;
				break;
			case '7':
				selectedBlock = BlockType.METAL;
				break;
		}
	});

	window.addEventListener("keydown", function(event) {
		var intKey = event.which || event.keyCode; // firefox or chrome
		var key = String.fromCharCode(intKey);

		switch (key.toLowerCase()) {
			case 'a':
				Stickman.left = true;
				break;
			case 'd':
				Stickman.right = true;
				break;
			case 'w':
				Stickman.jump = true;
				break;
		}
	});

	window.addEventListener("keyup", function(event) {
		var intKey = event.which || event.keyCode; // firefox or chrome
		var key = String.fromCharCode(intKey);

		switch (key.toLowerCase()) {
			case 'a':
				Stickman.left = false;
				break;
			case 'd':
				Stickman.right = false;
				break;
			case 'w':
				Stickman.jump = false;
				break;
		}
	});
}

var lastUpdate = new Date().getTime();

function update() {
	var currentTime = new Date().getTime();
	var elapsed = currentTime - lastUpdate;
	lastUpdate = currentTime;

	var dt = elapsed * 0.001;

	var speed = 15.0;



	if (Stickman.left) {
		var dx = speed * dt;

		var currentX = Math.floor(Stickman.x);
		var currentY = Math.floor(Stickman.y);
		var newX = Math.floor(Stickman.x + dx);
		var newY = Math.floor(Stickman.y) + 1;
		if (!checkWallCollesion(currentX, currentY, newX, newY)) {
			Stickman.x -= dx;
		} else {
			Stickman.x += dx;
		}
	}
	if (Stickman.right) {
		var dx = speed * dt;

		var currentX = Math.floor(Stickman.x) + Stickman.width;
		var currentY = Math.floor(Stickman.y);
		var newX = Math.floor(Stickman.x + dx) + Stickman.width;
		var newY = Math.floor(Stickman.y) + 1;
		if (!checkWallCollesion(currentX, currentY, newX, newY)) {
			Stickman.x += dx;
		} else {
			Stickman.x -= dx;
		}
	}

	if (clickWaveTime > 0) {
		clickWaveRadius += 25.0 * dt;
		clickWaveTime -= dt;
	}

}


function checkWallCollesion(currentX, currentY, newX, newY) {
	var currentBlock = getBlock(currentX, currentY);
	var newBlock = getBlock(newX, newY);
	if (newBlock == BlockType.OFB || newBlock == BlockType.DIRT) {
		return true;
	} else {
		return false;
	}
}

function render() {
	update();

	gl.clear(gl.COLOR_BUFFER_BIT);

	drawWorld();
	drawWireFrame();
	drawStickman();

	window.requestAnimFrame(render);
}

function canPlaceBlock() {
	var up = getBlock(mouseX, mouseY + 1);
	var down = getBlock(mouseX, mouseY - 1);
	var left = getBlock(mouseX - 1, mouseY);
	var right = getBlock(mouseX + 1, mouseY);
	var current = getBlock(mouseX, mouseY);

	if ((Math.floor(Stickman.x) == mouseX && Math.floor(Stickman.y) == mouseY) ||
		(Math.floor(Stickman.x) + 1 == mouseX && Math.floor(Stickman.y) == mouseY) ||
		(Math.floor(Stickman.x) == mouseX && Math.floor(Stickman.y) + 1 == mouseY) ||
		(Math.floor(Stickman.x) + 1 == mouseX && Math.floor(Stickman.y) + 1 == mouseY)) {
		return false;
	}

	if (current != BlockType.AIR) {
		return false;
	}

	if ((up == BlockType.AIR || up == BlockType.OFB) &&
		(down == BlockType.AIR || down == BlockType.OFB) &&
		(left == BlockType.AIR || left == BlockType.OFB) &&
		(right == BlockType.AIR || right == BlockType.OFB)) {
		return false;
	} else {
		return true;
	}
}

function drawStickman() {
	gl.bindBuffer(gl.ARRAY_BUFFER, stickmanBufferId);

	var vPosition = gl.getAttribLocation(wireProgram, "vPosition");
	gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	gl.useProgram(wireProgram);

	var uPosition = gl.getUniformLocation(wireProgram, "uPosition");
	gl.uniform2f(uPosition, Stickman.x, Stickman.y);

	gl.lineWidth(5);
	gl.drawArrays(gl.LINES, 0, 10);
	gl.lineWidth(1);
}

function createStickman() {
	var points = new Float32Array([
		0.0, 0.0,
		0.5, 1.0,
		1.0, 0.0,
		0.5, 1.0,
		0.5, 1.0,
		0.5, 2.0,
		0.0, 1.0,
		0.5, 2.0,
		1.0, 1.0,
		0.5, 2.0
	]);

	var stickmanBufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, stickmanBufferId);
	gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
	return stickmanBufferId;
}

function drawWireFrame() {
	if (canPlaceBlock()) {
		gl.bindBuffer(gl.ARRAY_BUFFER, wireBufferId);

		var vPosition = gl.getAttribLocation(wireProgram, "vPosition");
		gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		gl.useProgram(wireProgram);

		var uPosition = gl.getUniformLocation(wireProgram, "uPosition");
		gl.uniform2f(uPosition, mouseX, mouseY);

		gl.drawArrays(gl.LINE_LOOP, 0, 4);
	}
}

function createWireFrame() {
	var points = new Float32Array([
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0
	]);

	var wireBufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, wireBufferId);
	gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
	return wireBufferId;
}

function drawWorld() {
	gl.bindBuffer(gl.ARRAY_BUFFER, worldBufferId);
	var vertexWorld = new Float32Array(BLOCKS_X * BLOCKS_Y * 5 * 6);
	var index = 0;
	//world setup	
	for (var y = 0; y < BLOCKS_Y; y++) {
		for (var x = 0; x < BLOCKS_X; x++) {
			var block = getBlock(x, y);
			vertexWorld[index++] = x;
			vertexWorld[index++] = y;
			vertexWorld[index++] = block[0];
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];

			vertexWorld[index++] = x + 1;
			vertexWorld[index++] = y + 1;
			vertexWorld[index++] = block[0];
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];

			vertexWorld[index++] = x;
			vertexWorld[index++] = y + 1;
			vertexWorld[index++] = block[0];
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];

			vertexWorld[index++] = x;
			vertexWorld[index++] = y;
			vertexWorld[index++] = block[0];
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];

			vertexWorld[index++] = x + 1;
			vertexWorld[index++] = y;
			vertexWorld[index++] = block[0];
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];

			vertexWorld[index++] = x + 1;
			vertexWorld[index++] = y + 1;
			vertexWorld[index++] = block[0];
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];
		}
	}

	gl.bufferData(gl.ARRAY_BUFFER, vertexWorld, gl.DYNAMIC_DRAW);

	var vPosition = gl.getAttribLocation(blockProgram, "vPosition");
	gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 20, 0);
	gl.enableVertexAttribArray(vPosition);

	var vColor = gl.getAttribLocation(blockProgram, "vColor");
	gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 20, 8);
	gl.enableVertexAttribArray(vColor);

	gl.useProgram(blockProgram);

	var uClickWaveActive = gl.getUniformLocation(blockProgram, "uClickWaveActive");
	var uClickWaveRadius = gl.getUniformLocation(blockProgram, "uClickWaveRadius");
	var uClickWavePosition = gl.getUniformLocation(blockProgram, "uClickWavePosition");

	gl.uniform1i(uClickWaveActive, clickWaveTime > 0 ? 1 : 0);
	gl.uniform1f(uClickWaveRadius, clickWaveRadius);
	gl.uniform2f(uClickWavePosition, clickWavePositionX, clickWavePositionY);

	gl.drawArrays(gl.TRIANGLES, 0, vertexWorld.length / 5);
}

function createWorld() {
	world = {
		data: new Array((BLOCKS_X + 2) * (BLOCKS_Y + 2))
	};

	//out of bounds setup
	for (var y = -1; y < BLOCKS_Y + 1; y++) {
		setBlock(-1, y, BlockType.OFB);
		setBlock(BLOCKS_X, y, BlockType.OFB);
	}

	for (var x = -1; x < BLOCKS_X + 1; x++) {
		setBlock(x, -1, BlockType.OFB);
		setBlock(x, BLOCKS_Y, BlockType.OFB);
	}

	//world setup	
	for (var y = 0; y < BLOCKS_Y; y++) {
		for (var x = 0; x < BLOCKS_X; x++) {
			if (y > 15) {
				setBlock(x, y, BlockType.AIR);
			} else if (y == 15) {
				setBlock(x, y, BlockType.GRASS);
			} else {
				setBlock(x, y, BlockType.DIRT);
			}
		}
	}
}

function getBlock(x, y) {
	return world.data[(x + 1) + (y + 1) * (BLOCKS_X + 2)];
}

function setBlock(x, y, type) {
	world.data[(x + 1) + (y + 1) * (BLOCKS_X + 2)] = type;
}