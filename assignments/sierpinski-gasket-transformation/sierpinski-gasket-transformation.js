var canvas;
var gl;

var program;
var bufferId;

var bufferIndex;

var numberOfVerticesInTriangle = 3;
var numberOfTriangles = 4;

window.onload = function init() {
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);

	if (!gl) {
		alert("gl not working");
	} else {
		// debug
		gl = WebGLDebugUtils.makeDebugContext(gl);

		// start spot 0,0 and canvas width and height
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.5, 0.5, 0.5, 1.0);

		program = initShaders(gl, "vertex-board-shader", "fragment-board-shader");

		// init buffer and define the buffer size
		initTriangleBuffer();

		//add triangles to buffer
		bufferIndex = 0;
		addTriangleToBuffer("white");
		addTriangleToBuffer("black");
		addTriangleToBuffer("black");
		addTriangleToBuffer("black");

		// draw on canvans
		render();
	}
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.useProgram(program);

	// drawTriangle(translateX, translateY, scaleXY)
	bufferIndex = 0;
	drawTriangle(0.0, 0.0, 1.0); // main triangle
	drawTriangle(-0.8, -0.8, 0.5); // sub triangle
	drawTriangle(0.8, -0.8, 0.5); // sub triangle
	drawTriangle(0.0, 0.8, 0.5); // sub triangle
}

function initTriangleBuffer() {
	var bufferSize = (numberOfVerticesInTriangle * (sizeof['vec4'] + sizeof['vec4'])) * numberOfTriangles;

	bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, bufferSize, gl.STATIC_DRAW); // init buffer for numberOfTriangles triangles
}

function addTriangleToBuffer(color) {
	var bufferSize = (numberOfVerticesInTriangle * (sizeof['vec4'] + sizeof['vec4'])) * bufferIndex;
	var vertices;

	if (color == "black") {
		vertices = [
			vec4(-0.8, -0.8, 0.0, 1.0), vec4(0.0, 0.0, 0.0, 1.0), // vec4(x, y, z, w), vec4(r, g, b, a)
			vec4(0.8, -0.8, 0.0, 1.0), vec4(0.0, 0.0, 0.0, 1.0),
			vec4(0.0, 0.8, 0.0, 1.0), vec4(0.0, 0.0, 0.0, 1.0)
		];
	} else { // white
		vertices = [
			vec4(-0.8, -0.8, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0), // vec4(x, y, z, w), vec4(r, g, b, a)
			vec4(0.8, -0.8, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0),
			vec4(0.0, 0.8, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0)
		];
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferSubData(gl.ARRAY_BUFFER, bufferSize, flatten(vertices));

	bufferIndex++;
}

function drawTriangle(translateX, translateY, scaleXY) {
	var vPosition = gl.getAttribLocation(program, "vPosition");
	gl.enableVertexAttribArray(vPosition);

	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	// every vertex is 8 floats of 4 bytes (8 * 4) and the vertex starts at index 0
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 8 * 4, 0); // one float is 4 byte

	var ctm = transformationOfMatrix(translateX, translateY, scaleXY);
	var modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
	gl.uniformMatrix4fv(modelViewMatrix, false, flatten(ctm));

	var vColor = gl.getAttribLocation(program, "vColor");
	// every vertex is 8 floats of 4 bytes (8 * 4) and the color starts at index 4 (4 * 4)
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 8 * 4, 4 * 4); // one float is 4 byte
	gl.enableVertexAttribArray(vColor);

	gl.drawArrays(gl.TRIANGLES, numberOfVerticesInTriangle * bufferIndex, 3);

	bufferIndex++;
}

function transformationOfMatrix(x, y, s) {
	var ctm = mat4(); // init identity matrix

	ctm = mult(ctm, scalem(vec3(s, s, 1.0)));
	ctm = mult(ctm, translate(vec3(x, y, 1.0)));

	return ctm;
}