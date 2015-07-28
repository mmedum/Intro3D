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
	//init(-1, -1, 0);
	//gasketMountain(2.0, 6);
	
	init(0.5, -0.5, 0.0);
	drawRandomTriangle(1.0, 25, 0);
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
		drawTriangle(length / 2);
		gasketMountain(length / 2, depth - 1);

		penUp();
		forward(length / 2);
		penDown();

		drawTriangle(length / 2);
		gasketMountain(length / 2, depth - 1);

		left(120);
		penUp();
		forward(length / 2);
		penDown();
		right(120);

		drawTriangle(length / 2);
		gasketMountain(length / 2, depth - 1);

		right(120);
		penUp();
		forward(length / 2);
		penDown();
		left(120);
	}
}

function drawRandomTriangle(length, angleVariation, distanceVariation) {
	var a1 = 120.0 - 0.5 * angleVariation + Math.random() * angleVariation;
	var d1 = length - 0.5 * distanceVariation + Math.random() * distanceVariation;

	console.log(a1);
	console.log(d1);

	var a2 = 120.0 - 0.5 * angleVariation + Math.random() * angleVariation;
	var d2 = length - 0.5 * distanceVariation + Math.random() * distanceVariation;

	console.log(a2);
	console.log(d2);

	var dx = Math.cos(toRadians(a1)) * d1 + Math.cos(toRadians(a1 + a2)) * d2;
	var dy = Math.sin(toRadians(a1)) * d1 + Math.sin(toRadians(a1 + a2)) * d2;

	var a3 = 360 - a1 - a2;
	var d3 = Math.sqrt(dx * dx + dy * dy);

	console.log(a3);
	console.log(d3);

	left(a1);
	forward(d1);

	left(a2);
	forward(d2);

	left(a3);
	forward(d3);
}

function drawTriangle(length) {
	for (var i = 0; i < 3; i++) {
		forward(length);
		left(120);
	}

}