var canvas;
var gl;

var program;
var bufferId;

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

	var theata = 10; // degrees
	var d = vec3(1.0, 0.0, 0.0); // axis
	var ctm = rotateAxis(theata, d);

	var modelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
	//gl.uniformMatrix4fv(modelViewMatrix, false, flatten(ctm));
	gl.uniformMatrix4fv(modelViewMatrix, false, flatten(mat4()));

	gl.drawArrays(gl.TRIANGLES, 0, vertices.length);
}

function rotateAxis(theta, d) {
	// float theta, vec3 d
	// rotate by theta degrees about the axis d with a fixed point at the origin
	// R = R_x(-theta_x) R_y(-theta_y) R_z(theta) R_y(theta_y) R_x(theta_x)
	// M = T(p_0) R T(-p_0)

	var R = mat4(); // init identity matrix
	var ctm = mat4(); // init identity matrix
	var origin = mat4();


	ctm = mult(ctm, translate(origin));
	ctm = mult(ctm, R);
	ctm = mult(ctm, translate(negate(origin)));

	return ctm;
}