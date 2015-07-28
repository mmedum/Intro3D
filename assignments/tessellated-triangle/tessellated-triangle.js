var gl;
var program;
var points = [];
var colors = [];

var numTimesToDivide = 2;
var rotaionInDegree = 40;

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

		var vertices = [
			vec2(-0.5, -0.5),
			vec2(0.0, 0.5),
			vec2(0.5, -0.5)
		];

		colors = [
			vec4(0.0, 0.0, 0.0, 1.0),
			vec4(0.0, 0.0, 0.0, 1.0),
			vec4(0.0, 0.0, 0.0, 1.0)
		];

		tessellatedTriangles(vertices[0], vertices[1], vertices[2], numTimesToDivide);

		var vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

		var vPosition = gl.getAttribLocation(program, "vPosition");
		gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);


		var colorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

		var vColor = gl.getAttribLocation(program, "vColor");
		gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vColor);

		render();
	}
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

function tessellatedTriangles(a, b, c, count) {
	// http://www.slowlybutconstantly.org/?p=292
	// http://slowlybutconstantly.org/html/Twist.html

	// check for end of recursion

	if (count === 0) {
		triangle(a, b, c);
	} else {

		//bisect the sides

		var ab = mix(a, b, 0.5);
		var bc = mix(b, c, 0.5);
		var ca = mix(c, a, 0.5);

		/*		       a
		 *		       /\
		 *	      ab /   \ca
		 *	       /      \
		 *  	  /        \
		 *    b	/_ _ _ _ _ _\c
		 *	         bc
		 */

		--count;

		tessellatedTriangles(a, ab, ca, count);
		tessellatedTriangles(ab, bc, ca, count);
		tessellatedTriangles(ab, b, bc, count);
		tessellatedTriangles(ca, bc, c, count);
	}
}

function triangle(a, b, c) {
	points.push(rotateVertex(a), rotateVertex(b), rotateVertex(c));

	// update colors for the next triangle
	var col = vec4(Math.random(), Math.random(), Math.random(), 1.0);
	colors.push(col, col, col);
}

function rotateVertex(vertex) {
	var rotaionInRadian = (Math.PI * rotaionInDegree) / 180;

	// vertex = [x, y]
	// x = vertex[0]
	// y = vertex[1]

	// d = sqrt( x^2 + y^2 )
	var d = Math.sqrt((vertex[0] * vertex[0]) + (vertex[1] * vertex[1]));

	// x' = x * cos( d * theta ) - y * sin ( d * theta)
	// y' = x * sin( d * theta ) + y * cos ( d * theta)
	var newX = vertex[0] * Math.cos(d * rotaionInRadian) - vertex[1] * Math.sin(d * rotaionInRadian);
	var newY = vertex[0] * Math.sin(d * rotaionInRadian) + vertex[1] * Math.cos(d * rotaionInRadian);

	return vec2(newX, newY);
}