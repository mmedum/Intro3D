var canvas;
var gl;

var cubeProgram;
var cubeWireframeProgram;

var camera;

var BLOCKS_X = 64;
var BLOCKS_Y = 64;
var BLOCKS_Z = 64;
var CHUNKS_X = 4;
var CHUNKS_Y = 4;
var CHUNKS_Z = 4;
var CHUNK_SIZE_X = BLOCKS_X / CHUNKS_X;
var CHUNK_SIZE_Y = BLOCKS_Y / CHUNKS_Y;
var CHUNK_SIZE_Z = BLOCKS_Z / CHUNKS_Z;

var BlockType = {
    AIR: [0.0, 0.0, 1.0, 1.0],
    STONE: [0.5, 0.5, 0.5, 1.0],
    GRASS: [0.0, 1.0, 0.0, 1.0],
    DIRT: [0.7, 0.4, 0.3, 1.0],
    WOOD: [0.8901, 0.6627, 0.4352, 1.0],
    METAL: [0.8, 0.8, 0.8, 1.0],
    WATER: [0.6, 0.8509, 0.9176, 1.0],
    FIRE: [1.0, 0.0, 0.0, 1.0]
};

var worldBlocks = new Array(BLOCKS_X * BLOCKS_Y * BLOCKS_Z);
var worldChunks = new Array(CHUNKS_X * CHUNKS_Y * CHUNKS_Z);
var spinningCube;
var spinningCubePositions;
var spinningCubeTheta;

var lightInfo = [
    //Torch
    {
        ambient : [0.0, 0.0, 0.0, 0.0],
        diffuse : [0.0, 1.0, 0.0, 1.0],
        specular : [0.0, 0.0, 0.0, 0.0],
        shininess : 10.5
    },
    //Sun
    {
        ambient : [0.2, 0.2, 0.2, 1.0],
        diffuse : [1.0, 0.0, 0.0, 1.0],
        specular : [0.8, 0.3, 0.8, 1.0],
        shininess : 100
    },
    //Moon
    {
        ambient : [0.0, 0.0, 0.0, 1.0],
        diffuse : [1.0, 1.0, 1.0, 1.0],
        specular : [0.0, 0.0, 0.0, 0.0],
        shininess : 30
    }
];

var whaleMesh;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        alert("BACON");
    } else {
        gl = WebGLDebugUtils.makeDebugContext(gl);

        cubeProgram = initShaders(gl, "vertex-lighting-shader", "fragment-lighting-shader");
        cubeWireframeProgram = initShaders(gl, "wireframe-vertex-shader", "wireframe-fragment-shader");
		whaleProgram = initShaders(gl, "whale-vertex-shader", "whale-fragment-shader");
		
        gl.clearColor(0.0, 0.7490, 1.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        // don't show vertices on back faces of cubes when not vissible with the camera
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        createWorld();
        camera = new Camera(vec3(0.0, 0.0, -5.0), -30.0, 140.0);
		
		whaleMesh = createWhale();

        setupListeners();

        spinningCube = createSpinningCube();
        spinningCubePositions = [];
        spinningCubeTheta = 0;

        createTexture();

        render();
    }
};

function createWorld() {
    var xzScale = 0.18;

    for (var x = 0; x < BLOCKS_X; x++) {
        for (var y = 0; y < BLOCKS_Y; y++) {
            for (var z = 0; z < BLOCKS_Z; z++) {
                var height = ((Math.sin(x * xzScale) + Math.sin(z * xzScale) + 2)) * 0.25 * BLOCKS_Y * 0.5;

                if (y > height) {
                    worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] = BlockType.AIR;
                } else {
                    worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] = BlockType.DIRT;
                }
            }
        }
    }

    for (var x = 0; x < CHUNKS_X; x++) {
        for (var y = 0; y < CHUNKS_Y; y++) {
            for (var z = 0; z < CHUNKS_Z; z++) {
                worldChunks[x * CHUNKS_Y * CHUNKS_Z + y * CHUNKS_Z + z] =
                    createChunk(x * CHUNK_SIZE_X, y * CHUNK_SIZE_Y, z * CHUNK_SIZE_Z);
            }
        }
    }
}

function createChunk(x, y, z) {
    var blockVertices = [];
    var lineVertices = [];

    for (var dx = 0; dx < CHUNK_SIZE_X; dx++) {
        for (var dy = 0; dy < CHUNK_SIZE_Y; dy++) {
            for (var dz = 0; dz < CHUNK_SIZE_Z; dz++) {
                var wx = (x + dx);
                var wy = (y + dy);
                var wz = (z + dz);
                var blockType = worldBlocks[wx * BLOCKS_Y * BLOCKS_Z + wy * BLOCKS_Z + wz];
                if (blockType != BlockType.AIR && isVisible(wx, wy, wz)) {
                    createCube(blockVertices, lineVertices, wx, wy, wz);
                }
            }
        }
    }

    var blockBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, blockBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(blockVertices), gl.STATIC_DRAW);

    var lineBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(lineVertices), gl.STATIC_DRAW);

    return {
        blockBufferId: blockBufferId,
        lineBufferId: lineBufferId,
        blockVertexCount: blockVertices.length / 3,
        lineVertexCount: lineVertices.length
    };
}

function isVisible(wx, wy, wz) {
    var up = wy < BLOCKS_Y - 1 ? worldBlocks[(wx) * BLOCKS_Y * BLOCKS_Z + (wy + 1) * BLOCKS_Z + (wz)] : BlockType.AIR;
    var down = wy > 0 ? worldBlocks[(wx) * BLOCKS_Y * BLOCKS_Z + (wy - 1) * BLOCKS_Z + (wz)] : BlockType.AIR;
    var right = wx < BLOCKS_X - 1 ? worldBlocks[(wx + 1) * BLOCKS_Y * BLOCKS_Z + (wy) * BLOCKS_Z + (wz)] : BlockType.AIR;
    var left = wx > 0 ? worldBlocks[(wx - 1) * BLOCKS_Y * BLOCKS_Z + (wy) * BLOCKS_Z + (wz)] : BlockType.AIR;
    var front = wz > 0 ? worldBlocks[(wx) * BLOCKS_Y * BLOCKS_Z + (wy) * BLOCKS_Z + (wz - 1)] : BlockType.AIR;
    var back = wz < BLOCKS_Z - 1 ? worldBlocks[(wx) * BLOCKS_Y * BLOCKS_Z + (wy) * BLOCKS_Z + (wz + 1)] : BlockType.AIR;

    return (up == BlockType.AIR || down == BlockType.AIR || right == BlockType.AIR ||
    left == BlockType.AIR || front == BlockType.AIR || back == BlockType.AIR);
}

function createCube(blockVertices, lineVertices, x, y, z) {
    var cube = [
        // Front
        vec4(-0.5, 0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(0.0, 1.0, 42.0, 42.0),
        vec4(0.5, 0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(0.5, 0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),
        vec4(0.5, -0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(1.0, 0.0, 42.0, 42.0),

        // Back
        vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),
        vec4(-0.5, 0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(0.0, 1.0, 42.0, 42.0),
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(0.5, -0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(1.0, 0.0, 42.0, 42.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),

        // Right
        vec4(0.5, 0.5, -0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(1.0, 0.0, 42.0, 42.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),
        vec4(0.5, -0.5, -0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(0.5, -0.5, -0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),
        vec4(0.5, -0.5, 0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(0.0, 1.0, 42.0, 42.0),

        // Left
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(-0.5, 0.5, 0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),
        vec4(-0.5, 0.5, -0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(1.0, 0.0, 42.0, 42.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(0.0, 1.0, 42.0, 42.0),
        vec4(-0.5, 0.5, 0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),

        // Top
        vec4(-0.5, 0.5, -0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(-0.5, 0.5, 0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 1.0, 42.0, 42.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),
        vec4(-0.5, 0.5, -0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),
        vec4(0.5, 0.5, -0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(1.0, 0.0, 42.0, 42.0),

        // Bottom
        vec4(0.5, -0.5, 0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(0.0, 1.0, 42.0, 42.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0),
        vec4(0.5, -0.5, -0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(1.0, 0.0, 42.0, 42.0),
        vec4(0.5, -0.5, 0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(1.0, 1.0, 42.0, 42.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(0.0, 0.0, 42.0, 42.0)
    ];

    // move cube to correct position in world with offset 0.5
    var modelMatrix = translate(x + 0.5, y + 0.5, z + 0.5);

    for (var i = 0; i < cube.length; i++) {
        if (i % 3 == 0) {
            blockVertices.push(multVector(modelMatrix, cube[i]));
        } else {
            blockVertices.push(cube[i]);
        }
    }

    var cubeEdges = [
        // Back ring
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(-0.5, 0.5, 0.5, 1.0),
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.5, -0.5, 0.5, 1.0),
        vec4(0.5, -0.5, 0.5, 1.0), vec4(0.5, 0.5, 0.5, 1.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(-0.5, 0.5, 0.5, 1.0),

        // Front ring
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(-0.5, 0.5, -0.5, 1.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.5, -0.5, -0.5, 1.0),
        vec4(0.5, -0.5, -0.5, 1.0), vec4(0.5, 0.5, -0.5, 1.0),
        vec4(0.5, 0.5, -0.5, 1.0), vec4(-0.5, 0.5, -0.5, 1.0),

        // Left track
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(-0.5, -0.5, -0.5, 1.0),
        vec4(-0.5, 0.5, 0.5, 1.0), vec4(-0.5, 0.5, -0.5, 1.0),

        // Right track
        vec4(0.5, -0.5, 0.5, 1.0), vec4(0.5, -0.5, -0.5, 1.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(0.5, 0.5, -0.5, 1.0)
    ];

    for (var i = 0; i < cubeEdges.length; i++) {
        lineVertices.push(multVector(modelMatrix, cubeEdges[i]));
    }
}

function createTexture(){
    gl.activeTexture(gl.TEXTURE0);

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var image = document.getElementById("texture");
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

}

function setupListeners() {
    var lastMouse = null;
    var newMouse = null;

    var mouseTracking = function(event) {
        if (lastMouse != null) {
            newMouse = vec2(event.clientX, event.clientY);

            var deltaX = newMouse[0] - lastMouse[0];
            var deltaY = newMouse[1] - lastMouse[1];

            camera.yaw += deltaX * 0.2;
            camera.pitch += deltaY * 0.2;
        }

        lastMouse = vec2(event.clientX, event.clientY);
    };

    canvas.addEventListener("mousedown", function(event) {
        newMouse = vec2(event.clientX, event.clientY);

        canvas.addEventListener("mousemove", mouseTracking);
    });

    canvas.addEventListener("mouseup", function(event) {
        lastMouse = null;

        canvas.removeEventListener("mousemove", mouseTracking);
    });

    canvas.addEventListener("click", function(event) {
        var tileX = Math.floor((event.clientX - canvas.offsetLeft) / BLOCKS_X);
        var tileY = BLOCKS_Y - Math.floor((event.clientY - canvas.offsetTop) / BLOCKS_Y) - 1;
        spinningCubePositions.push(vec3(tileX, tileY, 0));
    });

    window.addEventListener("keydown", function(event) {
        var intKey = event.which || event.keyCode; // firefox or chrome
        var key = String.fromCharCode(intKey);

        switch (key.toLowerCase()) {
            case 'w':
                camera.moveForward = true;
                break;
            case 'a':
                camera.moveLeft = true;
                break;
            case 's':
                camera.moveBackward = true;
                break;
            case 'd':
                camera.moveRight = true;
                break;
        }
    });

    window.addEventListener("keyup", function(event) {
        var intKey = event.which || event.keyCode; // firefox or chrome
        var key = String.fromCharCode(intKey);

        switch (key.toLowerCase()) {
            case 'w':
                camera.moveForward = false;
                break;
            case 'a':
                camera.moveLeft = false;
                break;
            case 's':
                camera.moveBackward = false;
                break;
            case 'd':
                camera.moveRight = false;
                break;
            case 'm':
                camera.mapMode = !camera.mapMode;
                break;
        }
    });
}

function render() {
    update();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var viewport = camera.getViewport();
    gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);

	drawWhales();
    drawCubes();
    drawCubeWireframes();
    drawSpinningCubes();
    drawSpinningCubeWireframes();

    requestAnimFrame(render);
}

function drawCubeWireframes() {
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    gl.useProgram(cubeWireframeProgram);

    var uProjectionMatrix = gl.getUniformLocation(cubeWireframeProgram, "uProjectionMatrix"); // setup perspective settings
    var uViewMatrix = gl.getUniformLocation(cubeWireframeProgram, "uViewMatrix"); // move camera
    var uModelMatrix = gl.getUniformLocation(cubeWireframeProgram, "uModelMatrix"); //placement

    var modelMatrix = mat4();
    gl.uniformMatrix4fv(uModelMatrix, false, flatten(modelMatrix));

    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(camera.getProjection()));

    gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.getView()));

    for (var x = 0; x < CHUNKS_X; x++) {
        for (var y = 0; y < CHUNKS_Y; y++) {
            for (var z = 0; z < CHUNKS_Z; z++) {
                var chunk = worldChunks[x * CHUNKS_Y * CHUNKS_Z + y * CHUNKS_Z + z];

                gl.bindBuffer(gl.ARRAY_BUFFER, chunk.lineBufferId);

                var vPosition = gl.getAttribLocation(cubeWireframeProgram, "vPosition");
                gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(vPosition);

                gl.drawArrays(gl.LINES, 0, chunk.lineVertexCount);
            }
        }
    }

    gl.disable(gl.POLYGON_OFFSET_FILL);
}

function drawCubes() {
    gl.useProgram(cubeProgram);

    var uTexMap = gl.getUniformLocation(cubeProgram, "uTexMap");
    gl.uniform1i(uTexMap, 0);

    var uProjectionMatrix = gl.getUniformLocation(cubeProgram, "uProjectionMatrix"); // setup perspective settings
    var uViewMatrix = gl.getUniformLocation(cubeProgram, "uViewMatrix"); // move camera
    var uModelMatrix = gl.getUniformLocation(cubeProgram, "uModelMatrix"); //placement

    var modelMatrix = mat4();
    gl.uniformMatrix4fv(uModelMatrix, false, flatten(modelMatrix));

    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(camera.getProjection()));

    gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.getView()));

    var uTorchPosition = gl.getUniformLocation(cubeProgram, "uTorchPosition");
    var torchPosition = vec4(0.0, 100.0, 0.0, 1.0); //torch
    gl.uniform4fv(uTorchPosition, flatten(multVector(camera.getView(), torchPosition)));

    var uLightDirectionSun = gl.getUniformLocation(cubeProgram, "uLightDirectionSun");
    var lightDirectionSun = normalize(vec4(10.0, 100.0, 30.0, 0.0)); //sun
    gl.uniform4fv(uLightDirectionSun, flatten(multVector(camera.getView(), lightDirectionSun)));

    var uLightDirectionMoon = gl.getUniformLocation(cubeProgram, "uLightDirectionMoon");
    var lightDirectionMoon = normalize(vec4(90.0, 70.0, 10.0, 0.0)); //moon
    gl.uniform4fv(uLightDirectionMoon, flatten(multVector(camera.getView(), lightDirectionMoon)));

    for(var i=0; i<lightInfo.length; i++){
        var uAmbientProduct = gl.getUniformLocation(cubeProgram, "Lights[" + i + "].uAmbientProduct");
        var uDiffuseProduct = gl.getUniformLocation(cubeProgram, "Lights[" + i + "].uDiffuseProduct");
        var uSpecularProduct = gl.getUniformLocation(cubeProgram, "Lights[" + i + "].uSpecularProduct");
        var uShininess = gl.getUniformLocation(cubeProgram, "Lights[" + i + "].uShininess");

        gl.uniform4fv(uAmbientProduct, flatten(lightInfo[i].ambient));
        gl.uniform4fv(uDiffuseProduct, flatten(lightInfo[i].diffuse));
        gl.uniform4fv(uSpecularProduct, flatten(lightInfo[i].specular));
        gl.uniform1f(uShininess, lightInfo[i].shininess);
    }

    for (var x = 0; x < CHUNKS_X; x++) {
        for (var y = 0; y < CHUNKS_Y; y++) {
            for (var z = 0; z < CHUNKS_Z; z++) {
                var chunk = worldChunks[x * CHUNKS_Y * CHUNKS_Z + y * CHUNKS_Z + z];

                gl.bindBuffer(gl.ARRAY_BUFFER, chunk.blockBufferId);

                var vPosition = gl.getAttribLocation(cubeProgram, "vPosition");
                gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, sizeof['vec4'] * 3, 0);
                gl.enableVertexAttribArray(vPosition);

                var vNormal = gl.getAttribLocation(cubeProgram, "vNormal");
                gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, sizeof['vec4'] * 3, sizeof['vec4']);
                gl.enableVertexAttribArray(vNormal);

                var vTexCoord = gl.getAttribLocation(cubeProgram, "vTexCoord");
                gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, sizeof['vec4'] * 3, sizeof['vec4'] * 2);
                gl.enableVertexAttribArray(vTexCoord);

                gl.drawArrays(gl.TRIANGLES, 0, chunk.blockVertexCount);
            }
        }
    }
}

function drawSpinningCubes() {
    gl.useProgram(cubeProgram);

    var uTexMap = gl.getUniformLocation(cubeProgram, "uTexMap");
    gl.uniform1i(uTexMap, 0);

    var uProjectionMatrix = gl.getUniformLocation(cubeProgram, "uProjectionMatrix"); // setup perspective settings
    var uViewMatrix = gl.getUniformLocation(cubeProgram, "uViewMatrix"); // move camera
    var uModelMatrix = gl.getUniformLocation(cubeProgram, "uModelMatrix"); //placement

    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(camera.getProjection()));

    gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.getView()));

    gl.bindBuffer(gl.ARRAY_BUFFER, spinningCube.spinningCubeBufferId);

    var vPosition = gl.getAttribLocation(cubeProgram, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, sizeof['vec4'] * 3, 0);
    gl.enableVertexAttribArray(vPosition);

    var vNormal = gl.getAttribLocation(cubeProgram, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, sizeof['vec4'] * 3, sizeof['vec4']);
    gl.enableVertexAttribArray(vNormal);

    var vTexCoord = gl.getAttribLocation(cubeProgram, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, sizeof['vec4'] * 3, sizeof['vec4'] * 2);
    gl.enableVertexAttribArray(vTexCoord);

    for(var i=0; i<spinningCubePositions.length; i++) {
        var modelMatrix = translate(spinningCubePositions[i]);
        modelMatrix = mult(modelMatrix, rotate(spinningCubeTheta, vec3(0, 1, 0)));
        gl.uniformMatrix4fv(uModelMatrix, false, flatten(modelMatrix));

        gl.drawArrays(gl.TRIANGLES, 0, spinningCube.spinningBlockVertexCount);
    }
	
}

function drawSpinningCubeWireframes() {
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0.1, 2.0);

    gl.useProgram(cubeWireframeProgram);

    var uProjectionMatrix = gl.getUniformLocation(cubeWireframeProgram, "uProjectionMatrix"); // setup perspective settings
    var uViewMatrix = gl.getUniformLocation(cubeWireframeProgram, "uViewMatrix"); // move camera
    var uModelMatrix = gl.getUniformLocation(cubeWireframeProgram, "uModelMatrix"); //placement

    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(camera.getProjection()));

    gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.getView()));

    gl.bindBuffer(gl.ARRAY_BUFFER, spinningCube.spinningCubeWireBufferId);

    var vPosition = gl.getAttribLocation(cubeWireframeProgram, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    for(var i=0; i<spinningCubePositions.length; i++) {
        var modelMatrix = translate(spinningCubePositions[i]);
        modelMatrix = mult(modelMatrix, rotate(spinningCubeTheta, vec3(0, 1, 0)));
        gl.uniformMatrix4fv(uModelMatrix, false, flatten(modelMatrix));

        gl.drawArrays(gl.LINES, 0, spinningCube.spinningLineVertexCount);
    }

    gl.disable(gl.POLYGON_OFFSET_FILL);
}

var lastUpdate = new Date().getTime();

function update() {
    var currentTime = new Date().getTime();
    var elapsed = currentTime - lastUpdate;
    lastUpdate = currentTime;

    var dt = elapsed * 0.001;

    camera.update(dt);

    spinningCubeTheta += 200.0 * dt;
}

function createSpinningCube() {
    var blockVertices = [];
    var lineVertices = [];

    createCube(blockVertices, lineVertices, -0.5, -0.5, -0.5);

    //scale, rotate
    var thetaX = 45.0;
    var thetaZ = 35.0;

    var modelMatrix = mat4();
    modelMatrix =  mult(modelMatrix, rotate(thetaZ, vec3(0.0, 0.0, 1.0)));
    modelMatrix = mult(modelMatrix, rotate(thetaX, vec3(1.0, 0.0, 0.0)));
    modelMatrix = mult(modelMatrix, scalem(vec3(0.5, 0.5, 0.5)));

    // scale and rotate block to start position
    for (var i = 0; i < blockVertices.length; i++) {
        blockVertices[i] = multVector(modelMatrix, blockVertices[i]);
    }

    for (var i = 0; i < lineVertices.length; i++) {
        lineVertices[i] = multVector(modelMatrix, lineVertices[i]);
    }

    // cube buffer
    var spinningCubeBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spinningCubeBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(blockVertices), gl.STATIC_DRAW);

    // wireframe buffer
    var spinningCubeWireBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spinningCubeWireBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(lineVertices), gl.STATIC_DRAW);

    return {
        spinningCubeBufferId : spinningCubeBufferId,
        spinningCubeWireBufferId : spinningCubeWireBufferId,
        spinningBlockVertexCount : blockVertices.length / 3,
        spinningLineVertexCount : lineVertices.length
    };
}

function getBlock(x, y, z){
    if((x >= 0 && x < BLOCKS_X) && (y >= 0 && y < BLOCKS_Y) && (z >= 0 && z < BLOCKS_Z)){
        return worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z];
    }else {
        return BlockType.AIR;
    }
}