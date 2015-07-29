var BLOCKS_X = 40;
var BLOCKS_Y = 30;

var BlockType = {
	OFB		: {},	// out of bounds
	AIR		: {},
	STONE 	: {},
	GRASS	: {},
	DIRT 	: {},
	WOOD 	: {},
	METAL 	: {},
	WATER 	: {},
	FIRE 	: {}
};

var gl;
var program;
var world;

function createWorld() {
	var result = {
		data : new Array((BLOCKS_X + 1) * (BLOCKS_Y + 1))		
	};
	
	for(var y = 0; y < BLOCKS_Y + 1; y++) {
		result.data[0 + y * BLOCKS_X] = BlockType.OFB;
		result.data[BLOCKS_X + y * BLOCKS_X] = BlockType.OFB;
	}
	
	for(var x = 0; x < BLOCKS_X + 1; x++) {
		result.data[x + 0 * BLOCKS_X] = BlockType.OFB;
		result.data[x + BLOCKS_Y * BLOCKS_X] = BlockType.OFB;
	}
	
	for(var y = 0; y < BLOCKS_Y; y++) {
		for(var x = 0; x < BLOCKS_X; x++) {
			if(y > 15) {
				result.data[(x + 1) + (y + 1) * BLOCKS_X] = BlockType.AIR;
			} else if(y == 15) {
				result.data[(x + 1) + (y + 1) * BLOCKS_X] = BlockType.GRASS;
			} else {
				result.data[(x + 1) + (y + 1) * BLOCKS_X] = BlockType.DIRT;
			}			
		}
	}
	
	//result.draw = function 
	
	return result;
}

function getBlock(x, y) {
	return world[(x + 1) + (y + 1) * BLOCKS_X];
}

window.onload = function init() {
	var canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);

	if (!gl) {
		alert("gl not working");
	} else {
		// Gief debug
		gl = WebGLDebugUtils.makeDebugContext(gl);

		//start spot 0,0 and canvas width and height
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(1.0, 1.0, 1.0, 1.0);

		program = initShaders(gl, "vertex-shader", "fragment-shader");
		gl.useProgram(program);
		
		world = createWorld();
		
		//render();
/*
		var bufferId = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

		var vPosition = gl.getAttribLocation(program, "vPosition");
		gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		render();*/
	}
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);
	//gl.drawArrays(gl.LINES, 0, points.length);
	
	requestAnimFrame(render());
}
