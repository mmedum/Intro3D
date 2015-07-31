var canvas;
var gl;

var programBoard;
var boardBufferId;

var BOARD_X = 3;
var BOARD_Y = 3;

var selectedSquare;
var stateOfBoard = new Array(BOARD_X);

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

		programBoard = initShaders(gl, "vertex-board-shader", "fragment-board-shader");

		boardBufferId = createBoard();

		render();
	}
}

function setListeners() {
	//click function	
	canvas.addEventListener("click", function(event) {
		var tileX = parseInt(((event.clientX - canvas.offsetLeft)/512)*3);
		var tileY = parseInt(BOARD_Y - (((event.clientY - canvas.offsetTop)/512)*3));
		//console.log("x="+tileX+", y="+tileY);	

		selectedSquare = vec2(tileX, tileY);

		insertAt(tileX, tileY);
	});
}

function insertAt(tileX, tileY) {
	if (stateOfBoard[tileX][tileY] == 1) {
		return;
	}

	stateOfBoard[tileX][tileY] = 1;
	
	/*if(winning) {
		console.log("Winner");
	}*/
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);

	drawBoard();
}

function drawBoard() {
	gl.bindBuffer(gl.ARRAY_BUFFER, boardBufferId);

	gl.useProgram(programBoard);

	var vPosition = gl.getAttribLocation(programBoard, "vPosition");
	gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	gl.drawArrays(gl.LINES, 0, 8);
}

function createBoard() {
	for (var k=0; k<BOARD_X; k++) {
		stateOfBoard[k] = new Array(BOARD_Y);
	}

	for (var i = 0; i < BOARD_X; i++) {
		for (var j = 0; j < BOARD_Y; j++) {
			stateOfBoard[i][j] = 0;
		}
	}

	var points = new Float32Array([
		1.0, 0.0,
		1.0, 3.0,
		2.0, 0.0,
		2.0, 3.0,
		0.0, 1.0,
		3.0, 1.0,
		0.0, 2.0,
		3.0, 2.0
	]);

	var bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

	return bufferId;
}