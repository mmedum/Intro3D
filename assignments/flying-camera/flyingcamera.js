var canvas;
var gl;

var program;

var square;

window.onload = function init(){
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);

	if(!gl){
		alert("BACON");
	}else {
		program = initShaders(gl, "vertex-shader", "fragment-shader");
		gl.useProgram(program);	
		gl = WebGLDebugUtils.makeDebugContext(gl);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		
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
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(0.5, -0,5, -0.5, 1.0)];
		
	var rightFace = [
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, 0.5, -0.5, 1.0),
		vec4(-0.5, -0.5, -0.5, 1.0),
		vec4(-0.5, 0.5, 0.5, 1.0),
		vec4(-0.5, -0,5, 0.5, 1.0)];

	var leftFace = [
		vec4(0.5, -0.5, -0.5, 1.0),
		vec4(0.5, 0.5, 0.5, 1.0),
		vec4(0.5, 0.5, -0.5, 1.0),
		vec4(0.5, -0.5, -0.5, 1.0),
		vec4(0.5, -0,5, 0.5, 1.0),
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

function update(){

}

function render(){
	//update();
	//requestAnimFrame(render);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, square.length); 
}
