function createWhale() {	
	var objStr = document.getElementById('whale.obj').innerHTML;

	var mesh = new OBJ.Mesh(objStr);
	
	OBJ.initMeshBuffers(gl, mesh);
	
	return mesh;
}

function drawWhales() {
	gl.useProgram(whaleProgram);

    var uProjectionMatrix = gl.getUniformLocation(whaleProgram, "uProjectionMatrix"); // setup perspective settings
    var uViewMatrix = gl.getUniformLocation(whaleProgram, "uViewMatrix"); // move camera

    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(camera.getProjection()));
    gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.getView()));

	for(var x = 0; x < 5; x++) {
		for(var z = 0; z < 5; z++) {
			drawWhale(gl, whaleMesh, vec3(x * 12.8, 64, z * 12.8));
		}
	}
	
}

function drawWhale(gl, mesh, position) {
    var uModelMatrix = gl.getUniformLocation(whaleProgram, "uModelMatrix"); //placement
    gl.uniformMatrix4fv(uModelMatrix, false, flatten(translate(position)));

	// Setup position attribute:
	gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
	
	var vPosition = gl.getAttribLocation(whaleProgram, "vPosition");
	gl.vertexAttribPointer(vPosition, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);
	
	// Setup normal attribute:
	gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
	
	var vNormal = gl.getAttribLocation(whaleProgram, "vNormal");
	gl.vertexAttribPointer(vNormal, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);	
	gl.enableVertexAttribArray(vNormal);
	
	// Draw the mesh
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
	gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

}