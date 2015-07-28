var gl;
var program;
var points;

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

		maze(6,6);

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

function maze(n, m){
	points = [];

	//i = m
	//j = n
	for(var i=0; i<n; i++){
		for(var j=0; j<m; j++){
			points.push(scale(0.1, vec2(i,j)));
			points.push(scale(0.1, vec2(i,j+1)));
			points.push(scale(0.1, vec2(i,j)));
			points.push(scale(0.1, vec2(i+1,j)));	
		}
	}
	for(var i=0; i<n; i++){
		points.push(scale(0.1, vec2(i,m)));
		points.push(scale(0.1, vec2(i+1,m)));
	}	
	for(var j=0; j<m; j++){
		points.push(scale(0.1, vec2(n,j)));
		points.push(scale(0.1, vec2(n,j+1)));	
	}
}
