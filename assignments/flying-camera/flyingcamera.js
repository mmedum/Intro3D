var canvas;
var gl;

var program;

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

		refresh : function() {
			var rotation = mult(rotateX(this.pitch), rotateY(this.yaw));
			var translation = translate(this.position[0], this.position[1], this.position[2]);
			this.view = inverse4(mult(translation, rotation));
		}		
	};
}

function setupListeners() {

	window.addEventListener("keydown", function(event) {
		var intKey = event.which || event.keyCode; // firefox or chrome
		var key = String.fromCharCode(intKey);

		switch (key.toLowerCase()) {
			case 'w':
				camera.forward = true;
				break;
			case 'a':
				camera.right = true;
				break;
			case 's':
				camera.left = true;
				break;
			case 'd':
				camera.backward = true;
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
				camera.right = false;
				break;
			case 's':
				camera.left = false;
				break;
			case 'd':
				camera.backward = false;
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
		
		gl = WebGLDebugUtils.makeDebugContext(gl);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);

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
		vec4(0.5, -0,5, 0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0)];

	var backFace = [
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(0.5, -0,5, -0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0)];

	var rightFace = [
		vec4(0.5, 0.5, 0.5, 1.0),
		vec4(0.5, -0.5, 0.5, 1.0),
		vec4(0.5, -0.5, -0.5, 1.0),
		vec4(0.5, -0.5, -0.5, 1.0),
		vec4(0.5, -0,5, 0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0)];

	var leftFace = [
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, -0,5, 0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0)];

	var buttomFace = [
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, -0,5, 0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0)];

}

var lastUpdate = new Date().getTime();

function update(){
	var currentTime = new Date().getTime();
	var elapsed = currentTime - lastUpdate;
	lastUpdate = currentTime;

	var dt = elapsed * 0.001;
	
	camera.refresh();
}

function render(){
	update();

	
	requestAnimFrame(render);
}
