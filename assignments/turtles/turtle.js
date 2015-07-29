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
		gl.clearColor(0.5, 0.5, 0.5, 1.0);

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
	//gasket(2.0, 6);
	
	init(-0.5, -0.5, 0);
	//drawRandomTriangle(1.0, 25, 0.2);
	gasketMountainNice(5, [vec2(-0.5, -0.5), vec2(0.5, -0.5), vec2(0, 0.5)]);
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

function moveTo(point) {
	var dx = point[0] - turtleX;
	var dy = point[1] - turtleY;
	
	if(Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
		return;
	}

	var dist = Math.sqrt(dx * dx + dy * dy);
	var angle = toDegrees(Math.acos(dx / dist));
	if(dy < 0) {
		angle *= -1;
	}
	console.log(angle);
	console.log(turtleTheta);
	
	right(turtleTheta - angle);
	forward(dist);
}

function gasketMountain(depth, corners) {
	if (depth > 0) {
		var rollA = 0.3 + Math.random() * 0.4;
		var rollB = 0.3 + Math.random() * 0.4;
		var rollC = 0.3 + Math.random() * 0.4;
	
		var midpointA = mix(corners[1], corners[0], rollA);
		var midpointB = mix(corners[2], corners[1], rollB);
		var midpointC = mix(corners[0], corners[2], rollC);
	
		drawTriangle2([corners[0], midpointA, midpointC]);
		gasketMountain(depth - 1, [corners[0], midpointA, midpointC]);
	
		drawTriangle2([midpointA, corners[1], midpointB]);
		gasketMountain(depth - 1, [midpointA, corners[1], midpointB]);
			
		drawTriangle2([midpointC, midpointB, corners[2]]);
		gasketMountain(depth - 1, [midpointC, midpointB, corners[2]]);
	}
}

function noise() {
	return Math.random() - 0.5;
}

function distance(u, v) {
	return length(subtract(u, v));
}

function gasketMountainNice(depth, corners) {
	if (depth > 0) {
		var factorA = distance(corners[1], corners[0]) * 0.2;
		var factorB = distance(corners[2], corners[1]) * 0.2;
		var factorC = distance(corners[0], corners[2]) * 0.2;
		
		var midpointA = add(mix(corners[1], corners[0], 0.5), vec2(noise() * factorA, noise() * factorA));
		var midpointB = add(mix(corners[2], corners[1], 0.5), vec2(noise() * factorB, noise() * factorB));
		var midpointC = add(mix(corners[0], corners[2], 0.5), vec2(noise() * factorC, noise() * factorC));
	
		if(depth == 1) {
			drawTriangle2([corners[0], midpointA, midpointC]);
		}		
		gasketMountainNice(depth - 1, [corners[0], midpointA, midpointC]);
	
		if(depth == 1) {
			drawTriangle2([midpointA, corners[1], midpointB]);
		}
		gasketMountainNice(depth - 1, [midpointA, corners[1], midpointB]);
		
		if(depth == 1) {
			drawTriangle2([midpointC, midpointB, corners[2]]);
		}		
		gasketMountainNice(depth - 1, [midpointC, midpointB, corners[2]]);
	}
}

function drawTriangle2(corners) {
	penUp();
	moveTo(corners[0]);
	penDown();

	moveTo(corners[1]);
	moveTo(corners[2]);
	moveTo(corners[0]);
}

function drawRandomTriangle(length, angleVariation, distanceVariation) {
	var a1 = 120.0 - 0.5 * angleVariation + Math.random() * angleVariation;
	var d1 = length - 0.5 * distanceVariation * length + Math.random() * distanceVariation * length;

	var a2 = 120.0 - 0.5 * angleVariation + Math.random() * angleVariation;
	var d2 = length - 0.5 * distanceVariation + Math.random() * distanceVariation;

	var dx = Math.cos(toRadians(a1)) * d1 + Math.cos(toRadians(a1 + a2)) * d2;
	var dy = Math.sin(toRadians(a1)) * d1 + Math.sin(toRadians(a1 + a2)) * d2;

	var d3 = Math.sqrt(dx * dx + dy * dy);
	var a3 = toDegrees(Math.acos(dx / d3));
	if(dy < 0) {
		a3 *= -1;
	}
	a3 = a3 - a1 - a2 + 180;

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
