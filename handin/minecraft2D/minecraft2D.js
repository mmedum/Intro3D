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
	x : 20,
	y : 16,
	velocityY : 0.0,
	airborn : false,
	width : 1, 
	left : false,
	right : false,
	jumping : false
}

var selectedBlock = BlockType.DIRT;

var clickWaveTime = 0.0;
var clickWaveRadius = 0.0;
var clickWavePositionX = 0;
var clickWavePositionY = 0;

/*
 * init function 
 */
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

/*
 * function for very pretty wave
 */
function startClickWave() {
	clickWaveTime = 2.5;
	clickWaveRadius = 0.0;
	clickWavePositionX = mouseX;
	clickWavePositionY = mouseY;
}

/*
 * Awesome listeners setup
 */
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
				document.getElementById("selectedBlock").innerHTML = "Dirt";
				break;
			case '2':
				selectedBlock = BlockType.GRASS;
				document.getElementById("selectedBlock").innerHTML = "Grass";
				break;
			case '3':
				selectedBlock = BlockType.WOOD;
				document.getElementById("selectedBlock").innerHTML = "Wood";
				break;
			case '4':
				selectedBlock = BlockType.WATER;
				document.getElementById("selectedBlock").innerHTML = "Water";
				break;
			case '5':
				selectedBlock = BlockType.FIRE;
				document.getElementById("selectedBlock").innerHTML = "Fire";
				break;
			case '6':
				selectedBlock = BlockType.STONE;
				document.getElementById("selectedBlock").innerHTML = "Stone";
				break;
			case '7':
				selectedBlock = BlockType.METAL;
				document.getElementById("selectedBlock").innerHTML = "Metal";
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

var inWaterTimer = 0.0;
var inWater = false;
var waterOffset = 0.0;

/*
 * Calculate water offset
 * for rendering.
 */
function updateInWater(dt) {
	inWaterTimer += dt * 5.0;
	if(inWaterTimer > 2.0 * Math.PI) {
		inWaterTimer = 0.0;
	}	
	if(inWater) {
		waterOffset = (Math.sin(inWaterTimer) - 1) * 0.5 * 0.5;
	} else {
		waterOffset = 0.0;
	}
}

/*
 * Movement function for Stickman,
 * calculating logic in walking, water,
 * fire and gravity
 */
function update() {
	var currentTime = new Date().getTime();
	var elapsed = currentTime - lastUpdate;
	lastUpdate = currentTime;

	var dt = elapsed * 0.001;

	var speed = 15.0;
	
	if(Stickman.left || Stickman.right) {
		var dx = speed*dt;

		var leftLegX = Math.floor(Stickman.x);
		var rightLegX = leftLegX + 1;
		var currentY = Math.floor(Stickman.y);
		
		var newX = Math.floor(Stickman.x + dx);
		var newY = Math.floor(Stickman.y) + 1;
		if(Stickman.left){
			if(!checkWallCollesion(leftLegX, currentY, newX, newY)){
				Stickman.x -= dx;
			}else {
				Stickman.x += dx;
			}
		}
		if(Stickman.right) {
			var dx = speed * dt;

			newX = newX + Stickman.width;
			newY++;
			if(!checkWallCollesion(rightLegX, currentY, newX, newY)){
				Stickman.x += dx;
			}else {
				Stickman.x -= dx;
			}
		}
		var leftLegX = Math.floor(Stickman.x);
		var rightLegX = leftLegX + 1;
		var currentY = Math.floor(Stickman.y);
		
		var leftBlock = getBlock(leftLegX, currentY);
		var leftBlockTop = getBlock(leftLegX, currentY + 1);
		var rightBlock = getBlock(rightLegX, currentY);
		var rightBlockTop = getBlock(rightLegX, currentY + 1);
		if(leftBlock != BlockType.AIR && leftBlockTop == BlockType.AIR){
			Stickman.y = currentY + 1;
		}
		if(rightBlock != BlockType.AIR && rightBlockTop == BlockType.AIR){
			Stickman.y = currentY + 1;
		}
	}
	
	var intersectingBlocks = [];
	
	var baseX = Math.floor(Stickman.x);
	var baseY = Math.floor(Stickman.y);
	
	for(var y = 0; y < 3; y++) {
		for(var x = 0; x < 2; x++) {
			var block = getBlock(baseX + x, baseY + y);
			if(block != BlockType.AIR) {
				intersectingBlocks.push(block);
			}
		}
	}
	
	// Determine which block we stand on:
	var floorBlock = getBlock(Math.round(Stickman.x), baseY);
	if(floorBlock == BlockType.AIR) {
		if(Math.round(Stickman.x) == baseX){
			floorBlock = getBlock(baseX + 1, baseY);
		} else {
			floorBlock = getBlock(baseX, baseY);
		}
	}
	
	if(floorBlock != BlockType.AIR) {
		Stickman.airborn = false;
		Stickman.velocityY = 0.0;

		if(floorBlock == BlockType.FIRE) {
			Stickman.velocityY = 10.0;
		}
		if(floorBlock == BlockType.WATER) {
			inWater = true;
		} else {
			inWater = false;
		}
	} else {
		Stickman.airborn = true;
	}
	
	if(Stickman.airborn) {
		Stickman.velocityY -= 9.82 * dt;
	}			
	Stickman.y += Stickman.velocityY * dt;
	
	updateInWater(dt);
	
	if (clickWaveTime > 0) {
		clickWaveRadius += 25.0 * dt;
		clickWaveTime -= dt;
	}
}

function checkWallCollesion(currentX, currentY, newX, newY){
	var currentBlock = getBlock(currentX, currentY);
	var newBlock = getBlock(newX, newY);
	if(newBlock != BlockType.AIR){
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

/*
 * Check if it's possible to place a block
 */
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

/*
 * Drawing of Stickman
 */
function drawStickman() {
	gl.bindBuffer(gl.ARRAY_BUFFER, stickmanBufferId);

	var vPosition = gl.getAttribLocation(wireProgram, "vPosition");
	gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	gl.useProgram(wireProgram);

	var uPosition = gl.getUniformLocation(wireProgram, "uPosition");
	gl.uniform2f(uPosition, Stickman.x, Stickman.y + waterOffset);

	gl.lineWidth(5);
	gl.drawArrays(gl.LINES, 0, 10);
	gl.lineWidth(1);
}

/*
 * Creation of Stickman, placement and
 * buffer creation
 */
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

/*
 * Drawing of wireframe around blocks
 * and making connection to the vertex shader
 */
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

/*
 * Creation of wireframe and
 * buffer creation.
 */
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

/*
 * Drawing of world and buffer creation,
 * even more water and funny stuff
 */
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

/*
 * Creation of blocks for different types
 */
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

/*
 * get a nice block
 */
function getBlock(x, y) {
	return world.data[(x + 1) + (y + 1) * (BLOCKS_X + 2)];
}

/*
 * set a nice block
 */
function setBlock(x, y, type) {
	world.data[(x + 1) + (y + 1) * (BLOCKS_X + 2)] = type;
}
