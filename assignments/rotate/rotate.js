var canvas;
var gl;

var program;
var bufferId;

var theta = 0.0; // degrees

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
		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.enable(gl.DEPTH_TEST); // Enable depth testing
		gl.depthFunc(gl.LEQUAL); // Near things obscure far things

		program = initShaders(gl, "vertex-board-shader", "fragment-board-shader");
		gl.useProgram(program);

		// draw on canvans
		render();
	}
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color as well as the depth buffer.

	if (theta == 360) {
		theta = 0;
	}

	var vertices = [
		vec4(-0.5, -0.5, 0.0, 1.0), // vec4(x, y, z, w)
		vec4(0.5, -0.5, 0.0, 1.0),
		vec4(0.0, 0.5, 0.0, 1.0)
	];

	bufferId = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation(program, "vPosition");
	gl.enableVertexAttribArray(vPosition);
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

	//var theta = 75.0; // degrees
	var d = normalize(vec3(0.0, 0.1, 1.0)); // axis
	var ctm = rotateAxis(theta, d);

	var modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
	gl.uniformMatrix4fv(modelViewMatrix, false, flatten(ctm));
	//gl.uniformMatrix4fv(modelViewMatrix, false, flatten(mat4()));

	gl.drawArrays(gl.TRIANGLES, 0, vertices.length);

	theta += 5.0;

	requestAnimFrame(render);
}

function rotateAxis(theta, alpha) {
	// float theta, vec3 alpha
	// rotate by theta degrees about the axis d
	// R = R_x(-theta_x) R_y(-theta_y) R_z(theta) R_y(theta_y) R_x(theta_x)

	if (Math.abs(alpha[1]) < 0.0001) {
		console.log("if");
		var ry = mat4(
			vec4(0.0, 0.0, -alpha[0], 0.0),
			vec4(0.0, 1.0, 0.0, 0.0),
			vec4(alpha[0], 0.0, 0.0, 0.0),
			vec4(0.0, 0.0, 0.0, 1.0)
		);

		var rz = rotateZ(theta);

		return mult(mult(transpose(ry), rz), ry);
	} else {
		var d = Math.sqrt((alpha[1] * alpha[1]) + (alpha[2] * alpha[2]));

		var rx = mat4(
			vec4(1.0, 0.0, 0.0, 0.0),
			vec4(0.0, alpha[2] / d, -alpha[1] / d, 0.0),
			vec4(0.0, alpha[1] / d, alpha[2] / d, 0.0),
			vec4(0.0, 0.0, 0.0, 1.0)
		);

		var ry = mat4(
			vec4(d, 0.0, -alpha[0], 0.0),
			vec4(0.0, 1.0, 0.0, 0.0),
			vec4(alpha[0], 0.0, d, 0.0),
			vec4(0.0, 0.0, 0.0, 1.0)
		);

		var rz = rotateZ(theta);

		return mult(mult(mult(mult(transpose(rx), transpose(ry)), rz), ry), rx);
	}
}