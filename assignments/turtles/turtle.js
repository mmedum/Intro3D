var gl;
var program;


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

		turtle();

		var bufferId = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

		var vPosition = gl.getAttribLocation(program, "vPosition");
		gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		render();
	}
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.drawArrays(gl.LINES, 0, points.length);
}

function turtle() {
	init(-1, -1, 0);
	gasketMountain(2.0, 6);
}

function gasket(length, depth) {
	if (depth > 0) {
		drawTriangle(length / 2);
		gasket(length / 2, depth - 1);

		forward(length / 2);

		drawTriangle(length / 2);
		gasket(length / 2, depth - 1);

		left(120);
		forward(length / 2);
		right(120);

		drawTriangle(length / 2);
		gasket(length / 2, depth - 1);

		right(120);
		forward(length / 2);
		left(120);
	}
}

function gasketMountain(length, depth) {
	if (depth > 0) {
		moveRandom(length);
		drawTriangle(length / 2);
		gasketMountain(length / 2, depth - 1);

		penUp();
		forward(length / 2);
		penDown();

		moveRandom(length);
		drawTriangle(length / 2);
		gasketMountain(length / 2, depth - 1);

		left(120);
		penUp();
		forward(length / 2);
		penDown();
		right(120);

		moveRandom(length);
		drawTriangle(length / 2);
		gasketMountain(length / 2, depth - 1);

		right(120);
		penUp();
		forward(length / 2);
		penDown();
		left(120);
	}
}

function moveRandom(length) {
	var randomDegree = Math.random() * 360;
	var randomLength = Math.random() * (length / 10.0);

	left(randomDegree);
	forward(randomLength);
	right(randomDegree);


}

function drawTriangle(length) {
	for (var i = 0; i < 3; i++) {
		forward(length);
		left(120);
	}

}