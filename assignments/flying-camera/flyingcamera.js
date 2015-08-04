var canvas;
var gl;

var program;

var square;
var camera;

function createCamera() {
	return {
		position : vec3(0.0, 0.0, -5.0),
		
		yaw : 0.0,
		pitch : 0.0,
		
		forward : false,
		left : false,
		right : false,
		backward : false,

		forward_dir : vec3(0, 0, -1),
		right_dir : vec3(1, 0, 0),
		up_dir : vec3(0, 1, 0),

		refresh : function() {
			var rotation = mult(rotateX(this.pitch), rotateY(this.yaw));
			this.forward_dir = mult(rotation, vec4(0, 0, -1, 0)).slice(0, 3);
			right_dir = mult(rotation, vec4(1, 0, 0, 0)).slice(0, 3);
			up_dir = mult(rotation, vec4(0, 1, 0, 0)).slice(0, 3);
			var translation = translate(this.position[0], this.position[1], this.position[2]);
			this.view = inverse4(mult(translation, rotation));
		}		
	};
}

function setupListeners() {
	var lastMouse = null;

	window.addEventListener("mousemove", function(event) {
		if(lastMouse != null){
			var newX = event.clientX;
			var newY = event.clientY;

			var deltaX = newX - lastMouse[0];
			var deltaY = newY - lastMouse[1];

			camera.yaw += deltaX * 0.2;
			//camera.pitch += deltaY * 0.2;
		}	
		lastMouse = vec2(event.clientX, event.clientY);	
	});

	window.addEventListener("keydown", function(event) {
		var intKey = event.which || event.keyCode; // firefox or chrome
		var key = String.fromCharCode(intKey);

		switch (key.toLowerCase()) {
			case 'w':
				camera.forward = true;
				break;
			case 'a':
				camera.left = true;
				break;
			case 's':
				camera.backward = true;
				break;
			case 'd':
				camera.right = true;
				break;

		}
	});

	window.addEventListener("keyup", function(event) {
		var intKey = event.which || event.keyCode; // firefox or chrome
		var key = String.fromCharCode(intKey);

		switch (key.toLowerCase()) {
			case 'w':
				camera.forward = false;
				break;
			case 'a':
				camera.left = false;
				break;
			case 's':
				camera.backward = false;
				break;
			case 'd':
				camera.right = false;
				break;
		}
	});

}

window.onload = function init(){
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);

	if(!gl){
		alert("BACON");
	} else {
		program = initShaders(gl, "vertex-shader", "fragment-shader");
		gl.useProgram(program);	
		gl = WebGLDebugUtils.makeDebugContext(gl);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		
		createGeo();
		
		camera = createCamera();
		
		setupListeners();

		render();
	}
}

function createGeo(){
	
	var frontFace = [
		vec4(-0.5, -0.5, 0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, -0.5, 0.5, 1.0),
		vec4(0.5, -0.5, 0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0)];

	var backFace = [
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(0.5, -0.5, -0.5, 1.0)];
		
	var rightFace = [
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, -0.5, 0.5, 1.0)];

	var leftFace = [
		vec4(0.5, -0.5, -0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(0.5, -0.5, -0.5, 1.0),
		vec4(0.5, -0.5, 0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0)];

	var buttomFace = [
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, -0.5, 0.5, 1.0),
		vec4(0.5, -0.5, 0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(0.5, -0.5, 0.5, 1.0),
		vec4(0.5, -0.5, -0.5, 1.0)];

	var topFace = [
		vec4(0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),	
		vec4(0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, 0.5, -0.5, 1.0)];

	square = frontFace.concat(backFace, rightFace, leftFace, buttomFace, topFace); 

	var bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(square), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);
}

var lastUpdate = new Date().getTime();

function update(){
	var currentTime = new Date().getTime();
	var elapsed = currentTime - lastUpdate;
	lastUpdate = currentTime;
	var dt = elapsed * 0.001;
	var speed = 10.0;

	var movement = speed * dt;
	if(camera.forward){
		console.log(camera.forward_dir);
		camera.position = add(camera.position, scale(movement, camera.forward_dir));
	}
	if(camera.backward){
		camera.position[2] += movement;
	}
	if(camera.left){
		camera.position[0] -= movement;
	}
	if(camera.right){
		camera.position[0] += movement;
	}	
	camera.refresh();
}

function render(){
	update();
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, square.length);
	
	var projectionMatrix = perspective(75, (canvas.width/canvas.height), 0.2, 100.0);
	var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
	gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));	

	var modelMatrix = translate(0.0, 0.0, -5.0);
	var uModelMatrix = gl.getUniformLocation(program, "uModelMatrix");
	gl.uniformMatrix4fv(uModelMatrix, false, flatten(modelMatrix));	

	var uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
	gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.view));	

	requestAnimFrame(render); 
}
