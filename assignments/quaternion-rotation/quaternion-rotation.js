var canvas;
var gl;

var program;
var bufferId;

var vTheta = 0.0; // define rotation degree

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

		program = initShaders(gl, "vertex-board-shader", "fragment-board-shader");
		gl.useProgram(program);

		// draw on canvans
		render();
	}
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);

	if(vTheta == 360) {
		vTheta = 0;
	}

	var vertices = [
		vec4(-0.3, -0.3, 0.0, 1.0), // vec4(x, y, z, w)
		vec4(0.3, -0.3, 0.0, 1.0),
		vec4(0.0, 0.3, 0.0, 1.0)
	];

	bufferId = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation(program, "vPosition");
	gl.enableVertexAttribArray(vPosition);
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

	//var vTheta = 0.0; // define rotation degree
	var thetaLoc = gl.getUniformLocation(program, "vTheta");
	gl.uniform1f(thetaLoc, vTheta);

	var vUnit = normalize(vec3(0.0, 0.8, 1.0)); // define rotation axis 
	var unitLoc = gl.getUniformLocation(program, "vUnit");
	gl.uniform3fv(unitLoc, vUnit);

	gl.drawArrays(gl.TRIANGLES, 0, 3);

	vTheta += 2.0;

	requestAnimFrame(render);
}