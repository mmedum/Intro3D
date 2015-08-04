var canvas;
var gl;

var program;

window.onload = function init(){
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);

	if(!gl){
		alert("BACON");
	}else {
		program = initShaders(gl, "vertex-shader", "fragment-shader");
		
		gl = WebGLDebugUtils.makeDebugContext(gl);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);

		createGeo();


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

function update(){

}

function render(){
	update();
	requestAnimFrame(render);
}
