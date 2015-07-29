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

var walkX = 20;
var walkY = 16;

var selectedBlock = BlockType.DIRT;

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

		blockProgram = initShaders(gl, "vertex-block-shader", "fragment-block-shader");
		wireProgram = initShaders(gl, "vertex-wire-shader", "fragment-wire-shader");
		stickmanProgram = initShaders(gl, "vertex-stickman-shader", "fragment-stickman-shader");

		world = createWorld();
		worldBufferId = gl.createBuffer();

		wireBufferId = createWireFrame();
		stickmanBufferId = createStickman();

		render();
	}
}

function setListeners() {
	//click function	
	canvas.addEventListener("click", function(event) {
		var tileX = Math.floor((event.clientX - canvas.offsetLeft) / 20);
		var tileY = BLOCKS_Y - Math.floor((event.clientY - canvas.offsetTop) / 20) - 1;
		setBlock(tileX, tileY, selectedBlock);
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
			case 'a':
				walkX--;
				break;
			case 'd':
				walkX++;
				break;
			case 'w':
				walkY++;
				break;
			case 's':
				walkY--;
				break;
		}
	});
}

function render() {
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

	if (current == BlockType.AIR) {
		if (up == BlockType.AIR && down == BlockType.AIR &&
			left == BlockType.AIR && right == BlockType.AIR) {
			return false;
		} else {
			return true;
		}
	} else {
		return false;
	}
}

function drawStickman() {
	gl.bindBuffer(gl.ARRAY_BUFFER, stickmanBufferId);

	var vPosition = gl.getAttribLocation(stickmanProgram, "vPosition");
	gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	gl.useProgram(stickmanProgram);

	var uPosition = gl.getUniformLocation(stickmanProgram, "uPosition");
	gl.uniform2f(uPosition, walkX, walkY);

	gl.drawArrays(gl.LINES, 0, 10);
}

function createStickman() {
	var points = new Float32Array([
		0.5, 0.0,
		1.0, 1.0,
		1.5, 0.0,
		1.0, 1.0,
		1.0, 1.0,
		1.0, 2.0,
		0.5, 1.0,
		1.0, 2.0,
		1.5, 1.0,
		1.0, 2.0
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
	gl.drawArrays(gl.TRIANGLES, 0, vertexWorld.length / 5);
}

function createWorld() {
	var result = {
		data: new Array((BLOCKS_X + 2) * (BLOCKS_Y + 2))
	};

	//out of bounds setup
	for (var y = 0; y < BLOCKS_Y + 1; y++) {
		result.data[0 + y * BLOCKS_X] = BlockType.OFB;
		result.data[BLOCKS_X + y * BLOCKS_X] = BlockType.OFB;
	}

	for (var x = 0; x < BLOCKS_X + 1; x++) {
		result.data[x + 0 * BLOCKS_X] = BlockType.OFB;
		result.data[x + BLOCKS_Y * BLOCKS_X] = BlockType.OFB;
	}

	//world setup	
	for (var y = 0; y < BLOCKS_Y; y++) {
		for (var x = 0; x < BLOCKS_X; x++) {
			if (y > 15) {
				result.data[(x + 1) + (y + 1) * BLOCKS_X] = BlockType.AIR;
			} else if (y == 15) {
				result.data[(x + 1) + (y + 1) * BLOCKS_X] = BlockType.GRASS;
			} else {
				result.data[(x + 1) + (y + 1) * BLOCKS_X] = BlockType.DIRT;
			}
		}
	}
	return result;
}

function getBlock(x, y) {
	return world.data[(x + 1) + (y + 1) * BLOCKS_X];
}

function setBlock(x, y, type) {
	if (canPlaceBlock()) {
		world.data[(x + 1) + (y + 1) * BLOCKS_X] = type;
	} else {
		world.data[(x + 1) + (y + 1) * BLOCKS_X] = BlockType.AIR;
	}

}