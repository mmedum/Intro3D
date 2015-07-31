var canvas;
var gl;

var programBoard;
var boardBufferId;
var crossBufferId;
var circleBufferId;

var BOARD_X = 3;
var BOARD_Y = 3;

var crossBufferIndex = 0;
var circleBufferIndex = 0;

var noVerticesCross = 4;
var noVerticesCircle = 8;

var scaleOfPieces = 0.2;

var stateOfBoard = new Array(BOARD_X);
var currentPlayer = 1;
var foundWinner = false;

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
		crossBufferId = initCrossBuffer(); // init buffer
		circleBufferId = initCircleBuffer(); // init buffer

		render();
	}
}

function setListeners() {
	//click function	
	canvas.addEventListener("click", function(event) {
		var tileX = parseInt(((event.clientX - canvas.offsetLeft) / canvas.width) * 3);
		var tileY = parseInt(BOARD_Y - (((event.clientY - canvas.offsetTop) / canvas.height) * 3));

		var selectedSquare = vec2(tileX, tileY);

		insertAt(selectedSquare);

		if (!foundWinner) {
			changePlayer();
		}
	});
}

function insertAt(selectedSquare) {
	var tileX = selectedSquare[0];
	var tileY = selectedSquare[1];

	if (stateOfBoard[tileX][tileY] > 0) {
		// selected square is occupied by a piece
		return;
	}

	// insert piece at selected square
	if (currentPlayer == 1) {
		stateOfBoard[tileX][tileY] = 1; // cross
		addCrossToBuffer(selectedSquare);
	} else {
		stateOfBoard[tileX][tileY] = 2; // circle
		addCircleToBuffer(selectedSquare);
	}

	// if three in a row the player win
	if (threeInARow()) {
		foundWinner = true;
		document.getElementById("info").innerHTML = "Player " + currentPlayer + " win!";
	}
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);

	drawBoard();
	drawPieces();

	window.requestAnimFrame(render);
}

function initCrossBuffer() {
	var bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	// init buffer for cross, "worst-case" is 3*3 cross
	gl.bufferData(gl.ARRAY_BUFFER, (noVerticesCross * (sizeof['vec2'] + sizeof['vec4'])) * BOARD_X * BOARD_Y, gl.STATIC_DRAW);

	return bufferId;
}

function addCrossToBuffer(selectedSquare) {
	var tileX = selectedSquare[0];
	var tileY = selectedSquare[1];

	var points = new Float32Array([
		tileX + scaleOfPieces, tileY + scaleOfPieces, 1.0, 0.0, 0.0, 1.0, // x, y, r, g, b, a
		tileX + 1 - scaleOfPieces, tileY + 1 - scaleOfPieces, 1.0, 0.0, 0.0, 1.0,
		tileX + scaleOfPieces, tileY + 1 - scaleOfPieces, 1.0, 0.0, 0.0, 1.0,
		tileX + 1 - scaleOfPieces, tileY + scaleOfPieces, 1.0, 0.0, 0.0, 1.0
	]);

	gl.bindBuffer(gl.ARRAY_BUFFER, crossBufferId);
	gl.bufferSubData(gl.ARRAY_BUFFER, (noVerticesCross * (sizeof['vec2'] + sizeof['vec4'])) * crossBufferIndex, points);

	crossBufferIndex++;
}

function initCircleBuffer() {
	var bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	// init buffer for circle, "worst-case" is 3*3 circle
	gl.bufferData(gl.ARRAY_BUFFER, (noVerticesCircle * (sizeof['vec2'] + sizeof['vec4'])) * BOARD_X * BOARD_Y, gl.STATIC_DRAW);

	return bufferId;
}

function addCircleToBuffer(selectedSquare) {
	var tileX = selectedSquare[0];
	var tileY = selectedSquare[1];

	var points = new Float32Array([
		tileX + 0.5, tileY + scaleOfPieces, 0.0, 0.0, 1.0, 1.0, // x, y, r, g, b, a
		tileX + 1 - scaleOfPieces, tileY + 0.5, 0.0, 0.0, 1.0, 1.0,
		tileX + 1 - scaleOfPieces, tileY + 0.5, 0.0, 0.0, 1.0, 1.0,
		tileX + 0.5, tileY + 1 - scaleOfPieces, 0.0, 0.0, 1.0, 1.0,
		tileX + 0.5, tileY + 1 - scaleOfPieces, 0.0, 0.0, 1.0, 1.0,
		tileX + scaleOfPieces, tileY + 0.5, 0.0, 0.0, 1.0, 1.0,
		tileX + scaleOfPieces, tileY + 0.5, 0.0, 0.0, 1.0, 1.0,
		tileX + 0.5, tileY + scaleOfPieces, 0.0, 0.0, 1.0, 1.0
	]);

	gl.bindBuffer(gl.ARRAY_BUFFER, circleBufferId);
	gl.bufferSubData(gl.ARRAY_BUFFER, (noVerticesCircle * (sizeof['vec2'] + sizeof['vec4'])) * circleBufferIndex, points);

	circleBufferIndex++;
}

function drawPieces() {
	var vPosition = gl.getAttribLocation(programBoard, "vPosition");
	gl.enableVertexAttribArray(vPosition);

	gl.lineWidth(5);

	// draw cross
	gl.bindBuffer(gl.ARRAY_BUFFER, crossBufferId);
	gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 6 * 4, 0); // one float is 4 byte

	var rColor = gl.getAttribLocation(programBoard, "vColor");
	gl.vertexAttribPointer(rColor, 4, gl.FLOAT, false, 6 * 4, 2 * 4); // one float is 4 byte
	gl.enableVertexAttribArray(rColor);

	gl.drawArrays(gl.LINES, 0, noVerticesCross * crossBufferIndex);

	// draw circle
	gl.bindBuffer(gl.ARRAY_BUFFER, circleBufferId);
	gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 6 * 4, 0); // one float is 4 byte

	var bColor = gl.getAttribLocation(programBoard, "vColor");
	gl.vertexAttribPointer(bColor, 4, gl.FLOAT, false, 6 * 4, 2 * 4); // one float is 4 byte
	gl.enableVertexAttribArray(bColor);

	gl.drawArrays(gl.LINES, 0, noVerticesCircle * circleBufferIndex);

	gl.lineWidth(1);
}

function createBoard() {
	for (var k = 0; k < BOARD_X; k++) {
		stateOfBoard[k] = new Array(BOARD_Y);
	}

	for (var i = 0; i < BOARD_X; i++) {
		for (var j = 0; j < BOARD_Y; j++) {
			stateOfBoard[i][j] = 0;
		}
	}

	var points = new Float32Array([
		1.0, 0.0, 0.0, 0.0, 0.0, 1.0, // x, y, r, g, b, a
		1.0, 3.0, 0.0, 0.0, 0.0, 1.0,
		2.0, 0.0, 0.0, 0.0, 0.0, 1.0,
		2.0, 3.0, 0.0, 0.0, 0.0, 1.0,
		0.0, 1.0, 0.0, 0.0, 0.0, 1.0,
		3.0, 1.0, 0.0, 0.0, 0.0, 1.0,
		0.0, 2.0, 0.0, 0.0, 0.0, 1.0,
		3.0, 2.0, 0.0, 0.0, 0.0, 1.0
	]);

	var bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

	return bufferId;
}

function drawBoard() {
	gl.bindBuffer(gl.ARRAY_BUFFER, boardBufferId);

	gl.useProgram(programBoard);

	var vPosition = gl.getAttribLocation(programBoard, "vPosition");
	gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 6 * 4, 0); // one float is 4 byte
	gl.enableVertexAttribArray(vPosition);

	var vColor = gl.getAttribLocation(programBoard, "vColor");
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 6 * 4, 2 * 4); // one float is 4 byte
	gl.enableVertexAttribArray(vColor);

	gl.drawArrays(gl.LINES, 0, 8);
}

function changePlayer() {
	if (currentPlayer == 1) {
		currentPlayer = 2;
	} else {
		currentPlayer = 1;
	}

	document.getElementById("info").innerHTML = "Current player is Player " + currentPlayer;
}

function threeInARow() {
	// check for columns
	for (var i = 0; i < BOARD_X; i++) {
		var column = true;

		for (var j = 0; j < BOARD_Y; j++) {
			if (stateOfBoard[i][j] != currentPlayer) {
				column = false;
			}
		}

		if (column) {
			return true;
		}
	}


	// check for rows
	for (var j = 0; j < BOARD_Y; j++) {
		var row = true;

		for (var i = 0; i < BOARD_X; i++) {
			if (stateOfBoard[i][j] != currentPlayer) {
				row = false;
			}
		}

		if (row) {
			return true;
		}
	}

	// check for diagonals: (0,0), (1,1), (2,2)
	var diagonalA = true;

	for (var i = 0; i < BOARD_X; i++) {
		if (stateOfBoard[i][i] != currentPlayer) {
			diagonalA = false;
		}
	}

	if (diagonalA) {
		return true;

	}

	// check for diagonals: (0,2), (1,1), (2, 0)
	var diagonalB = true;

	for (var i = 0; i < BOARD_X; i++) {
		if (stateOfBoard[i][(BOARD_Y - i - 1)] != currentPlayer) {
			diagonalB = false;
		}
	}

	if (diagonalB) {
		return true;
	}


	return false;
}
