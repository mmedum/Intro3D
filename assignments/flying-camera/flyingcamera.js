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

}

function update(){

}

function render(){
	update();
	requestAnimFrame(render);
}
