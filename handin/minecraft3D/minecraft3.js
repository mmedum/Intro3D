var canvas;
var gl;

var program;

var cubes;
var camera;

var BLOCKS_X = 128;
var BLOCKS_Y = 128;
var BLOCKS_Z = 128;
var CHUNKS_X = 2;
var CHUNKS_Y = 2;
var CHUNKS_Z = 2;

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

var worldBlocks = new Array(128 * 128 * 128);
var worldChunks = new Array(8 * 8 * 8);

var positions = [];

window.onload = function init() {
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);

	if (!gl) {
		alert("BACON");
	} else {
		program = initShaders(gl, "vertex-shader", "fragment-shader");
		gl.useProgram(program);
		gl = WebGLDebugUtils.makeDebugContext(gl);
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
	// data[128][128][128]

	for (var x = 0; x < BLOCKS_X; x++) {
		for (var y = 0; y < BLOCKS_Y; y++) {
			for (var z = 0; z < BLOCKS_Z; z++) {
				if (y > 30) {
					worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] = BlockType.AIR;
				} else if (y == 30) {
					worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z]= BlockType.GRASS;
				} else {
					worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] = BlockType.DIRT;
				}
			}
		}
	}

	for (var x = 0; x < CHUNKS_X; x++) {
		for (var y = 0; y < CHUNKS_Y; y++) {
			for (var z = 0; z < CHUNKS_Z; z++) {
				worldChunks[x * CHUNKS_Y * CHUNKS_Z + y * CHUNKS_Z + z] = createChunk(x * 16, y * 16, z * 16);
			}
		}
	}
}

function createChunk(x, y, z) {
	var vertices = [];

	for (var dx = 0; dx < 16; dx++) {
		for (var dy = 0; dy < 16; dy++) {
			for (var dz = 0; dz < 16; dz++) {
				var wx = (x + dx);
				var wy = (y + dy);
				var wz = (z + dz);
				if (worldBlocks[wx * CHUNKS_Y * CHUNKS_Z + wy * CHUNKS_Z + wz] != BlockType.AIR 
					&& isVisible(wx, wy, wz)) {
					vertices = vertices.concat(createCube(x + dx, y + dy, z + dz));
				}
			}
		}
	}

	var bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

	return {
		id: bufferId,
		size: vertices.length/2
	};
}

function isVisible(wx, wy, wz){
	
}

function createCube(x, y, z) {
	var frontFace = [
		vec4(-0.5, 0.5, -0.5, 1.0), vec4(-0.5, 0.5, 42, 42),
		vec4(0.5, 0.5, -0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.5, 0.5, 42, 42),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.5, 0.5, 42, 42),
		vec4(0.5, 0.5, -0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(0.5, -0.5, -0.5, 1.0), vec4(0.5, -0.5, 42, 42)
	];

	var backFace = [
		vec4(0.5, 0.5, 0.5, 1.0), vec4(0.5, 0.5, 42, 42),
		vec4(-0.5, 0.5, 0.5, 1.0), vec4(-0.5, 0.5, 42, 42),
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(0.5, -0.5, 0.5, 1.0), vec4(0.5, -0.5, 42, 42),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(0.5, 0.5, 42, 42)
	];

	var rightFace = [
		vec4(0.5, 0.5, -0.5, 1.0), vec4(-0.5, 0.5, 42, 42),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(0.5, -0.5, -0.5, 1.0), vec4(0.5, 0.5, 42, 42),
		vec4(0.5, -0.5, -0.5, 1.0), vec4(0.5, 0.5, 42, 42),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(0.5, -0.5, 0.5, 1.0), vec4(0.5, -0.5, 42, 42)
	];

	var leftFace = [
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(-0.5, 0.5, 0.5, 1.0), vec4(0.5, 0.5, 42, 42),
		vec4(-0.5, 0.5, -0.5, 1.0), vec4(-0.5, 0.5, 42, 42),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.5, -0.5, 42, 42),
		vec4(-0.5, 0.5, 0.5, 1.0), vec4(0.5, 0.5, 42, 42)
	];

	var topFace = [
		vec4(-0.5, 0.5, -0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(-0.5, 0.5, 0.5, 1.0), vec4(-0.5, 0.5, 42, 42),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(0.5, 0.5, 42, 42),
		vec4(-0.5, 0.5, -0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(0.5, 0.5, 0.5, 1.0), vec4(0.5, 0.5, 42, 42),
		vec4(0.5, 0.5, -0.5, 1.0), vec4(0.5, -0.5, 42, 42)
	];

	var bottomFace = [
		vec4(0.5, -0.5, 0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(-0.5, -0.5, 0.5, 1.0), vec4(-0.5, 0.5, 42, 42),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.5, 0.5, 42, 42),
		vec4(0.5, -0.5, -0.5, 1.0), vec4(0.5, -0.5, 42, 42),
		vec4(0.5, -0.5, 0.5, 1.0), vec4(-0.5, -0.5, 42, 42),
		vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.5, 0.5, 42, 42)
	];

	var cube = frontFace.concat(backFace, rightFace, leftFace, bottomFace, topFace);

	// move cube to correct position in world with offset 0.5
	var modelMatrix = translate(x + 0.5, y + 0.5, z + 0.5);

	for (var i = 0; i < cube.length; i += 2) {
		cube[i] = multVector(modelMatrix, cube[i]);
	}

	return cube;
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

	var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix"); // setup perspective settings
	var uViewMatrix = gl.getUniformLocation(program, "uViewMatrix"); // move camera

	var projectionMatrix = perspective(75, (canvas.width / canvas.height), 0.2, 100.0);
	gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

	gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.view));

	for (var x = 0; x < CHUNKS_X; x++) {
		for (var y = 0; y < CHUNKS_Y; y++) {
			for (var z = 0; z < CHUNKS_Z; z++) {
				var chunk = worldChunks[x * CHUNKS_Y * CHUNKS_Z + y * CHUNKS_Z + z];

				gl.bindBuffer(gl.ARRAY_BUFFER, chunk.id);

				var vPosition = gl.getAttribLocation(program, "vPosition");
				gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, sizeof['vec4'] * 2, 0);
				gl.enableVertexAttribArray(vPosition);

				var vOffset = gl.getAttribLocation(program, "vOffset");
				gl.vertexAttribPointer(vOffset, 4, gl.FLOAT, false, sizeof['vec4'] * 2, sizeof['vec4']);
				gl.enableVertexAttribArray(vOffset);

				gl.drawArrays(gl.TRIANGLES, 0, chunk.size);
			}
		}
	}

	requestAnimFrame(render);
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