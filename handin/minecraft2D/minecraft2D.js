var BLOCKS_X = 40;
var BLOCKS_Y = 30;

var BlockType = {
	OFB		: [0.0, 0.0, 0.0],	// out of bounds
	AIR		: [0.0, 0.0, 1.0],
	STONE 	: [0.5, 0.5, 0.5],
	GRASS		: [0.0, 1.0, 0.0],
	DIRT		: [0.7, 0.4, 0.3],
	WOOD		: [0.8, 0.4, 0.4],
	METAL 	: [0.8, 0.8, 0.8],
	WATER 	: [0.2, 0.2, 1.0],
	FIRE		: [1.0, 0.0, 0.0]
};

var gl;
var blockProgram;
var wireProgram;
var world;
var worldBufferId;

var mouseX;
var mouseY;

window.onload = function init() {
	var canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);

	if (!gl) {
		alert("gl not working");
	} else {
		canvas.addEventListener("click", function() {
			var tileX = Math.floor((event.x - canvas.offsetLeft)/20);
			var tileY = BLOCKS_Y-Math.floor((event.y - canvas.offsetTop)/20)-1;	
			setBlock(tileX, tileY, BlockType.AIR);
		});
		canvas.addEventListener("mousemove", function() {
			mouseX = Math.floor((event.x - canvas.offsetLeft)/20);
			mouseY = BLOCKS_Y-Math.floor((event.y - canvas.offsetTop)/20)-1;	
		});	
		// Gief debug
		gl = WebGLDebugUtils.makeDebugContext(gl);

		//start spot 0,0 and canvas width and height
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(1.0, 1.0, 1.0, 1.0);

		blockProgram = initShaders(gl, "vertex-block-shader", "fragment-block-shader");
		wireProgram = initShaders(gl, "vertex-wire-shader", "fragment-wire-shader");

		world = createWorld();

		worldBufferId = gl.createBuffer();
		
		render();
	}
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);
	drawWorld();
	drawWireFrame();	
	window.requestAnimFrame(render);
}

function drawWireFrame(){

}

function drawWorld(){
	gl.bindBuffer(gl.ARRAY_BUFFER, worldBufferId);
	var vertexWorld = new Float32Array(BLOCKS_X*BLOCKS_Y*5*6);
	var index = 0;
	//world setup	
	for(var y = 0; y < BLOCKS_Y; y++) {
		for(var x = 0; x < BLOCKS_X; x++) {
			var block = getBlock(x,y);
			vertexWorld[index++] = x;	
			vertexWorld[index++] = y;	
			vertexWorld[index++] = block[0];	
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];
		
			vertexWorld[index++] = x+1;	
			vertexWorld[index++] = y+1;	
			vertexWorld[index++] = block[0];	
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];
	
			vertexWorld[index++] = x;	
			vertexWorld[index++] = y+1;	
			vertexWorld[index++] = block[0];	
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];	
		
			vertexWorld[index++] = x;	
			vertexWorld[index++] = y;	
			vertexWorld[index++] = block[0];	
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];
			
			vertexWorld[index++] = x+1;	
			vertexWorld[index++] = y;	
			vertexWorld[index++] = block[0];	
			vertexWorld[index++] = block[1];
			vertexWorld[index++] = block[2];
			
			vertexWorld[index++] = x+1;	
			vertexWorld[index++] = y+1;	
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
	gl.drawArrays(gl.TRIANGLES, 0, vertexWorld.length/5);
}

function createWorld() {
	var result = {
		data : new Array((BLOCKS_X + 2) * (BLOCKS_Y + 2))	
	};
	
	//out of bounds setup
	for(var y = 0; y < BLOCKS_Y + 1; y++) {
		result.data[0 + y * BLOCKS_X] = BlockType.OFB;
		result.data[BLOCKS_X + y * BLOCKS_X] = BlockType.OFB;
	}
	
	for(var x = 0; x < BLOCKS_X + 1; x++) {
		result.data[x + 0 * BLOCKS_X] = BlockType.OFB;
		result.data[x + BLOCKS_Y * BLOCKS_X] = BlockType.OFB;
	}
	
	//world setup	
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
	
	return result;
}

function getBlock(x, y) {
	return world.data[(x + 1) + (y + 1) * BLOCKS_X];
}

function setBlock(x, y, type) {
	world.data[(x + 1) + (y + 1) * BLOCKS_X] = type;
}
