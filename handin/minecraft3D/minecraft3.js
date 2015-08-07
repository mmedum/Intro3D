var canvas;
var gl;

var cubeProgram;
var cubeWireframeProgram;

var cubes;
var camera;

var BLOCKS_X = 64;
var BLOCKS_Y = 64;
var BLOCKS_Z = 64;
var CHUNKS_X = 4;
var CHUNKS_Y = 4;
var CHUNKS_Z = 4;
var CHUNK_SIZE_X = BLOCKS_X/CHUNKS_X;
var CHUNK_SIZE_Y = BLOCKS_Y/CHUNKS_Y;
var CHUNK_SIZE_Z = BLOCKS_Z/CHUNKS_Z;

var BlockType = {
	OFB: [0.0, 0.0, 0.0, 1.0], // out of bounds
	AIR: [0.0, 0.0, 1.0, 1.0],
	STONE: [0.5, 0.5, 0.5, 1.0],
	GRASS: [0.0, 1.0, 0.0, 1.0],
	DIRT: [0.7, 0.4, 0.3, 1.0],
	WOOD: [0.8901, 0.6627, 0.4352, 1.0],
	METAL: [0.8, 0.8, 0.8, 1.0],
	WATER: [0.6, 0.8509, 0.9176, 1.0],
	FIRE: [1.0, 0.0, 0.0, 1.0]
};

var worldBlocks = new Array(BLOCKS_X * BLOCKS_Y * BLOCKS_Z);
var worldChunks = new Array(CHUNKS_X * CHUNKS_Y * CHUNKS_Z);

var positions = [];

window.onload = function init() {
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);

	if (!gl) {
		alert("BACON");
	} else {
		gl = WebGLDebugUtils.makeDebugContext(gl);
		
		cubeProgram = initShaders(gl, "vertex-shader", "fragment-shader");
		cubeWireframeProgram = initShaders(gl, "wireframe-vertex-shader", "wireframe-fragment-shader");
		
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);

		// don't show vertices on back faces of cubes when not vissible with the camera
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		createWorld();
		camera = createCamera();

		setupListeners();

		render();
	}
}

function createWorld() {	
/*	for (var x = 0; x < BLOCKS_X; x++) {
		for (var y = 0; y < BLOCKS_Y; y++) {
			for (var z = 0; z < BLOCKS_Z; z++) {
				if (y > 30) {
					worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] = BlockType.AIR;
				} else if (y == 30) {
					worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] = BlockType.GRASS;
				} else {
					worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] = BlockType.DIRT;
				}
			}
		}
	}
*/
	for (var x = 0; x < BLOCKS_X; x++) {
		for (var y = 0; y < BLOCKS_Y; y++) {
			for (var z = 0; z < BLOCKS_Z; z++) {
				if(((Math.sin(x) + Math.sin(y)) * 0.5 + 0.5) > y * BLOCKS_Y / 2.0) {
					worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] = BlockType.DIRT;
				} else {
					worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] = BlockType.AIR;
				}
			}
		}
	}
	
	// Create initial chunks from the world.
	for (var x = 0; x < CHUNKS_X; x++) {
		for (var y = 0; y < CHUNKS_Y; y++) {
			for (var z = 0; z < CHUNKS_Z; z++) {
				worldChunks[x * CHUNKS_Y * CHUNKS_Z + y * CHUNKS_Z + z] = 
				createChunk(x * CHUNK_SIZE_X, y * CHUNK_SIZE_Y, z * CHUNK_SIZE_Z);
			}
		}
	}
}

function createChunk(x, y, z) {
	var blockVertices = [];
	var lineVertices = [];
	
	for (var dx = 0; dx < CHUNK_SIZE_X; dx++) {
		for (var dy = 0; dy < CHUNK_SIZE_Y; dy++) {
			for (var dz = 0; dz < CHUNK_SIZE_Z; dz++) {
				var wx = (x + dx);
				var wy = (y + dy);
				var wz = (z + dz);
				var blockType = worldBlocks[wx * BLOCKS_Y * BLOCKS_Z + wy * BLOCKS_Z + wz];
				if (blockType != BlockType.AIR 
					&& isVisible(wx, wy, wz)) {
					
					createCube(blockVertices, lineVertices, wx, wy, wz, blockType);
				}
			}
		}
	}

	var blockBufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, blockBufferId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(blockVertices), gl.STATIC_DRAW);
	
	var lineBufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, lineBufferId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(lineVertices), gl.STATIC_DRAW);

	return {
		blockBufferId : blockBufferId,
		lineBufferId : lineBufferId,
		blockVertexCount : blockVertices.length/2,
		lineVertexCount : lineVertices.length
	};
}

function isVisible(wx, wy, wz){
	var up = wy < BLOCKS_Y - 1 ? worldBlocks[(wx) * BLOCKS_Y * BLOCKS_Z + (wy + 1) * BLOCKS_Z + (wz)] : BlockType.AIR;
	var down = wy > 0 ? worldBlocks[(wx) * BLOCKS_Y * BLOCKS_Z + (wy - 1) * BLOCKS_Z + (wz)] : BlockType.AIR;
	var right = wx < BLOCKS_X - 1 ? worldBlocks[(wx + 1) * BLOCKS_Y * BLOCKS_Z + (wy) * BLOCKS_Z + (wz)] : BlockType.AIR;
	var left = wx > 0 ? worldBlocks[(wx - 1) * BLOCKS_Y * BLOCKS_Z + (wy) * BLOCKS_Z + (wz)] : BlockType.AIR;
	var front = wz > 0 ? worldBlocks[(wx) * BLOCKS_Y * BLOCKS_Z + (wy) * BLOCKS_Z + (wz - 1)] : BlockType.AIR;
	var back = wz < BLOCKS_Z - 1 ? worldBlocks[(wx) * BLOCKS_Y * BLOCKS_Z + (wy) * BLOCKS_Z + (wz + 1)] : BlockType.AIR;

	return (up == BlockType.AIR || down == BlockType.AIR || right == BlockType.AIR || 
		left == BlockType.AIR || front == BlockType.AIR || back == BlockType.AIR);
}

function createCube(blockVertices, lineVertices, x, y, z, color) {
	var cube = [
		// Front
		vec4(-0.5, 0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0),
		vec4(0.5, 0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0),
		vec4(0.5, 0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0),
		vec4(0.5, -0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0),
		
		// Back
		vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0),
		vec4(-0.5, 0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0),
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0),
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0),
		vec4(0.5, -0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0),

		// Right
		vec4(0.5, 0.5, -0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0),
		vec4(0.5, -0.5, -0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0),
		vec4(0.5, -0.5, -0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0),
		vec4(0.5, -0.5, 0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0),
		
		// Left
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0),
		vec4(-0.5, 0.5, 0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0),
		vec4(-0.5, 0.5, -0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0),
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0),
		vec4(-0.5, 0.5, 0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0),

		// Top
		vec4(-0.5, 0.5, -0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0),
		vec4(-0.5, 0.5, 0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0),
		vec4(-0.5, 0.5, -0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0),
		vec4(0.5, 0.5, -0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0),

		// Bottom
		vec4(0.5, -0.5, 0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0),
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0),
		vec4(0.5, -0.5, -0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0),
		vec4(0.5, -0.5, 0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0)
	];
	
	// move cube to correct position in world with offset 0.5
	var modelMatrix = translate(x + 0.5, y + 0.5, z + 0.5);

	for(var i = 0; i < cube.length; i++) {
		if(i % 2 == 0) {
			blockVertices.push(multVector(modelMatrix, cube[i]));
		} else {
			blockVertices.push(cube[i]);
		}
	}
	
	var cubeEdges = [
		// Back ring
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.5, -0.5, 0.5, 1.0),
		vec4(0.5, -0.5, 0.5, 1.0), vec4(0.5, 0.5, 0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(-0.5, 0.5, 0.5, 1.0),
		
		// Front ring
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.5, -0.5, -0.5, 1.0),
		vec4(0.5, -0.5, -0.5, 1.0), vec4(0.5, 0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0), vec4(-0.5, 0.5, -0.5, 1.0),
		
		// Left track
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0), vec4(-0.5, 0.5, -0.5, 1.0),
		
		// Right track
		vec4(0.5, -0.5, 0.5, 1.0), vec4(0.5, -0.5, -0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(0.5, 0.5, -0.5, 1.0)
	];
	
	for(var i = 0; i < cubeEdges.length; i++) {
		lineVertices.push(multVector(modelMatrix, cubeEdges[i]));
	}
}

function createCamera() {
	return {
		position: vec3(0.0, 0.0, -5.0),
		view: vec3(),

		pitch: -30.0, // up-down around center of camera
		yaw: 140.0, // left-right around center of camera

		forward: false,
		left: false,
		right: false,
		backward: false,

		forward_dir: vec3(0, 0, -1),
		right_dir: vec3(1, 0, 0),
		up_dir: vec3(0, 1, 0),

		refresh: function() {
			var rotation = mult(rotateY(this.yaw), rotateX(this.pitch));

			// let camera coordinates follow viewpoint
			// slice(0, 3) : from vec4 to vec3
			this.forward_dir = multVector(rotation, vec4(0, 0, -1, 0)).slice(0, 3);
			this.right_dir = multVector(rotation, vec4(1, 0, 0, 0)).slice(0, 3);
			this.up_dir = multVector(rotation, vec4(0, 1, 0, 0)).slice(0, 3);

			var translation = translate(this.position[0], this.position[1], this.position[2]);
			this.view = inverse4(mult(translation, rotation));
		}
	};
}

function setupListeners() {
	var lastMouse = null;

	canvas.addEventListener("mousemove", function(event) {
		if (lastMouse != null) {
			var newX = event.clientX;
			var newY = event.clientY;

			var deltaX = newX - lastMouse[0];
			var deltaY = newY - lastMouse[1];

			camera.yaw += deltaX * 0.2;
			camera.pitch += deltaY * 0.2;
		}

		lastMouse = vec2(event.clientX, event.clientY);
	});

	window.addEventListener("keydown", function(event) {
		var intKey = event.which || event.keyCode; // firefox or chrome
		var key = String.fromCharCode(intKey);

		switch (key.toLowerCase()) {
			case 'w':
				camera.forward = true;
				break;
			case 'a':
				camera.left = true;
				break;
			case 's':
				camera.backward = true;
				break;
			case 'd':
				camera.right = true;
				break;

		}
	});

	window.addEventListener("keyup", function(event) {
		var intKey = event.which || event.keyCode; // firefox or chrome
		var key = String.fromCharCode(intKey);

		switch (key.toLowerCase()) {
			case 'w':
				camera.forward = false;
				break;
			case 'a':
				camera.left = false;
				break;
			case 's':
				camera.backward = false;
				break;
			case 'd':
				camera.right = false;
				break;
		}
	});
}

function render() {
	update();

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	drawCubes();
	drawCubeWireframes();

	requestAnimFrame(render);
}

function drawCubeWireframes() {
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(1.0, 2.0);

	gl.useProgram(cubeWireframeProgram);

	var uProjectionMatrix = gl.getUniformLocation(cubeWireframeProgram, "uProjectionMatrix"); // setup perspective settings
	var uViewMatrix = gl.getUniformLocation(cubeWireframeProgram, "uViewMatrix"); // move camera

	var projectionMatrix = perspective(75, (canvas.width / canvas.height), 0.2, 100.0);
	gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

	gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.view));	
	
	for (var x = 0; x < CHUNKS_X; x++) {
		for (var y = 0; y < CHUNKS_Y; y++) {
			for (var z = 0; z < CHUNKS_Z; z++) {
				var chunk = worldChunks[x * CHUNKS_Y * CHUNKS_Z + y * CHUNKS_Z + z];

				gl.bindBuffer(gl.ARRAY_BUFFER, chunk.lineBufferId);

				var vPosition = gl.getAttribLocation(cubeProgram, "vPosition");
				gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(vPosition);

				gl.drawArrays(gl.LINES, 0, chunk.lineVertexCount);
			}
		}
	}
	
	gl.disable(gl.POLYGON_OFFSET_FILL);
}

function drawCubes() {
	gl.useProgram(cubeProgram);

	var uProjectionMatrix = gl.getUniformLocation(cubeProgram, "uProjectionMatrix"); // setup perspective settings
	var uViewMatrix = gl.getUniformLocation(cubeProgram, "uViewMatrix"); // move camera

	var projectionMatrix = perspective(75, (canvas.width / canvas.height), 0.2, 100.0);
	gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

	gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.view));

	for (var x = 0; x < CHUNKS_X; x++) {
		for (var y = 0; y < CHUNKS_Y; y++) {
			for (var z = 0; z < CHUNKS_Z; z++) {
				var chunk = worldChunks[x * CHUNKS_Y * CHUNKS_Z + y * CHUNKS_Z + z];

				gl.bindBuffer(gl.ARRAY_BUFFER, chunk.blockBufferId);

				var vPosition = gl.getAttribLocation(cubeProgram, "vPosition");
				gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, sizeof['vec4'] * 2, 0);
				gl.enableVertexAttribArray(vPosition);

				var vNormal = gl.getAttribLocation(cubeProgram, "vNormal");
				gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, sizeof['vec4'] * 2, sizeof['vec4']);
				gl.enableVertexAttribArray(vNormal);

				gl.drawArrays(gl.TRIANGLES, 0, chunk.blockVertexCount);
			}
		}
	}
}

var lastUpdate = new Date().getTime();

function update() {
	var currentTime = new Date().getTime();
	var elapsed = currentTime - lastUpdate;
	lastUpdate = currentTime;

	var dt = elapsed * 0.001;
	var speed = 10.0;
	var movement = speed * dt;

	if (camera.forward) {
		camera.position = add(camera.position, scale(movement, camera.forward_dir));
	}

	if (camera.backward) {
		camera.position = subtract(camera.position, scale(movement, camera.forward_dir));
	}

	if (camera.right) {
		camera.position = add(camera.position, scale(movement, camera.right_dir));
	}

	if (camera.left) {
		camera.position = subtract(camera.position, scale(movement, camera.right_dir));
	}

	camera.refresh();
}