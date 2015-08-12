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
    AIR: [],
    STONE: [6, 1],
    GRASS: [2, 1],
    DIRT: [2, 0],
    WOOD: [3, 4],
    METAL: [5, 1],
    WATER: [15, 12],
    FIRE: [15, 14]
};

var worldBlocks = new Array(BLOCKS_X * BLOCKS_Y * BLOCKS_Z);
var worldChunks = new Array(CHUNKS_X * CHUNKS_Y * CHUNKS_Z);
var spinningCube;
var spinningCubePositions;
var spinningCubeTheta;

var sunAngle;

var mouseWireFrame;
var mouse3DPosition;
var mouse2DPosition;
var mouseWireframePosition;

var selectedBlockType;

var lightInfo = [
    //Torch
    {
        ambient : [0.0, 0.0, 0.0, 0.0],
        diffuse : [0.3, 0.3, 0.3, 1.0],
        specular : [0.0, 0.0, 0.0, 0.0],
        shininess : 0.5
    },
    //Sun
    {
        ambient : [0.3, 0.3, 0.3, 1.0],
        diffuse : [0.8, 0.8, 0.8, 1.0],
        specular : [1.0, 1.0, 1.0, 1.0],
        shininess : 60.0
    },
    //Moon
    {
        ambient : [0.0, 0.0, 0.0, 1.0],
        diffuse : [0.0, 0.0, 0.5, 1.0],
        specular : [0.0, 0.0, 0.0, 0.0],
        shininess : 30
    }
];

var whaleMesh;

var pickingFramebuffer;
var pickingTexture;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        alert("BACON");
    } else {
        //gl = WebGLDebugUtils.makeDebugContext(gl);

        cubeProgram = initShaders(gl, "vertex-lighting-shader", "fragment-lighting-shader");
        cubeWireframeProgram = initShaders(gl, "wireframe-vertex-shader", "wireframe-fragment-shader");
        whaleProgram = initShaders(gl, "whale-vertex-shader", "whale-fragment-shader");

        gl.enable(gl.DEPTH_TEST);

        // don't show vertices on back faces of cubes when not vissible with the camera
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        createPickingObjects();

        createTexture();

        createWorld();
        camera = new Camera(vec3(0.0, 0.0, -5.0), -30.0, 140.0);
        mouse2DPosition = vec2();

        whaleMesh = createWhale();

        setupListeners();

        spinningCube = createSpinningCube();
        spinningCubePositions = [];
        spinningCubeTheta = 0;
        sunAngle = 0;
        selectedBlockType = BlockType.DIRT;

        mouseWireFrame = createMouseWireframe();

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


    for (var x = 0; x < BLOCKS_X; x++) {
        for (var y = 0; y < BLOCKS_Y-1; y++) {
            for (var z = 0; z < BLOCKS_Z; z++) {

                if (worldBlocks[x * BLOCKS_Y * BLOCKS_Z + (y+1) * BLOCKS_Z + z] == BlockType.AIR &&
                    worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] == BlockType.DIRT) {
                    worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z] = BlockType.GRASS;
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

var blockVertices = new Float32Array(36 * 3 * 4 * CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z);
var lineVertices = new Float32Array(24 * 4 * CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z);

function fillChunk(chunk, x, y, z) {
	var cubeIndex = 0;	
    for (var dx = 0; dx < CHUNK_SIZE_X; dx++) {
        for (var dy = 0; dy < CHUNK_SIZE_Y; dy++) {
            for (var dz = 0; dz < CHUNK_SIZE_Z; dz++) {
                var wx = (x + dx);
                var wy = (y + dy);
                var wz = (z + dz);
                var blockType = worldBlocks[wx * BLOCKS_Y * BLOCKS_Z + wy * BLOCKS_Z + wz];
                if (blockType != BlockType.AIR && isVisible(wx, wy, wz)) {
					createCubeFaster(
						blockVertices.subarray(36 * 3 * 4 * cubeIndex, 36 * 3 * 4 * (cubeIndex + 1)), 
						lineVertices.subarray(24 * 4 * cubeIndex, 24 * 4 * (cubeIndex + 1)),
						wx, wy, wz, 
						blockType
					);
					cubeIndex++;
				}
			}
		}
	}
	
    gl.bindBuffer(gl.ARRAY_BUFFER, chunk.blockBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, blockVertices, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, chunk.lineBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, lineVertices, gl.DYNAMIC_DRAW);

	chunk.blockVertexCount = 36 * cubeIndex;
    chunk.lineVertexCount = 24 * cubeIndex;
}

var cube;
var cubeEdges;

function createCubeFaster(blockVertices, lineVertices, x, y, z, blockType) {
	if(!cube) {
	   cube = new Float32Array([
			// Front
			-0.5,  0.5, -0.5,  1.0,  0.0,  0.0, -1.0,  0.0,  0.0,  1.0, 42.0, 42.0,
			 0.5,  0.5, -0.5,  1.0,  0.0,  0.0, -1.0,  0.0,  1.0,  1.0, 42.0, 42.0,
			-0.5, -0.5, -0.5,  1.0,  0.0,  0.0, -1.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			-0.5, -0.5, -0.5,  1.0,  0.0,  0.0, -1.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			 0.5,  0.5, -0.5,  1.0,  0.0,  0.0, -1.0,  0.0,  1.0,  1.0, 42.0, 42.0,
			 0.5, -0.5, -0.5,  1.0,  0.0,  0.0, -1.0,  0.0,  1.0,  0.0, 42.0, 42.0,

			// Back
			 0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  0.0,  1.0,  1.0, 42.0, 42.0,
			-0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0, 42.0, 42.0,
			-0.5, -0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			-0.5, -0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			 0.5, -0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  0.0,  1.0,  0.0, 42.0, 42.0,
			 0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  0.0,  1.0,  1.0, 42.0, 42.0,

			// Right
			 0.5,  0.5, -0.5,  1.0,  1.0,  0.0,  0.0,  0.0,  1.0,  0.0, 42.0, 42.0,
			 0.5,  0.5,  0.5,  1.0,  1.0,  0.0,  0.0,  0.0,  1.0,  1.0, 42.0, 42.0,
			 0.5, -0.5, -0.5,  1.0,  1.0,  0.0,  0.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			 0.5, -0.5, -0.5,  1.0,  1.0,  0.0,  0.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			 0.5,  0.5,  0.5,  1.0,  1.0,  0.0,  0.0,  0.0,  1.0,  1.0, 42.0, 42.0,
			 0.5, -0.5,  0.5,  1.0,  1.0,  0.0,  0.0,  0.0,  0.0,  1.0, 42.0, 42.0,

			// Left
			-0.5, -0.5, -0.5,  1.0, -1.0,  0.0,  0.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			-0.5,  0.5,  0.5,  1.0, -1.0,  0.0,  0.0,  0.0,  1.0,  1.0, 42.0, 42.0,
			-0.5,  0.5, -0.5,  1.0, -1.0,  0.0,  0.0,  0.0,  1.0,  0.0, 42.0, 42.0,
			-0.5, -0.5, -0.5,  1.0, -1.0,  0.0,  0.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			-0.5, -0.5,  0.5,  1.0, -1.0,  0.0,  0.0,  0.0,  0.0,  1.0, 42.0, 42.0,
			-0.5,  0.5,  0.5,  1.0, -1.0,  0.0,  0.0,  0.0,  1.0,  1.0, 42.0, 42.0,

			// Top
			-0.5,  0.5, -0.5,  1.0,  0.0,  1.0,  0.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			-0.5,  0.5,  0.5,  1.0,  0.0,  1.0,  0.0,  0.0,  0.0,  1.0, 42.0, 42.0,
			 0.5,  0.5,  0.5,  1.0,  0.0,  1.0,  0.0,  0.0,  1.0,  1.0, 42.0, 42.0,
			-0.5,  0.5, -0.5,  1.0,  0.0,  1.0,  0.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			 0.5,  0.5,  0.5,  1.0,  0.0,  1.0,  0.0,  0.0,  1.0,  1.0, 42.0, 42.0,
			 0.5,  0.5, -0.5,  1.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0, 42.0, 42.0,

			// Bottom
			 0.5, -0.5,  0.5,  1.0,  0.0, -1.0,  0.0,  0.0,  1.0,  1.0, 42.0, 42.0,
			-0.5, -0.5,  0.5,  1.0,  0.0, -1.0,  0.0,  0.0,  0.0,  1.0, 42.0, 42.0,
			-0.5, -0.5, -0.5,  1.0,  0.0, -1.0,  0.0,  0.0,  0.0,  0.0, 42.0, 42.0,
			 0.5, -0.5, -0.5,  1.0,  0.0, -1.0,  0.0,  0.0,  1.0,  0.0, 42.0, 42.0,
			 0.5, -0.5,  0.5,  1.0,  0.0, -1.0,  0.0,  0.0,  1.0,  1.0, 42.0, 42.0,
			-0.5, -0.5, -0.5,  1.0,  0.0, -1.0,  0.0,  0.0,  0.0,  0.0, 42.0, 42.0
		]);
	}	
    var xStart = blockType[0] * (1.0/16.0);
    var yStart = blockType[1] * (1.0/16.0);
    var xEnd = blockType[0] * (1.0/16.0) + (1.0/16.0);
    var yEnd = blockType[1] * (1.0/16.0) + (1.0/16.0);
	
	var index = 0;
	for(var i = 0; i < 36; i++) {
		// Position
		blockVertices[index] = cube[index] + x + 0.5;								index++;
		blockVertices[index] = cube[index] + y + 0.5;								index++;
		blockVertices[index] = cube[index] + z + 0.5;								index++;
		blockVertices[index] = cube[index];											index++;
		
		// Normal
		blockVertices[index] = cube[index];											index++;
		blockVertices[index] = cube[index];											index++;
		blockVertices[index] = cube[index];											index++;
		blockVertices[index] = cube[index];											index++;
		
		// Texture coordinate
		blockVertices[index] = (1.0 - cube[index]) * xStart + cube[index] * xEnd;	index++;
		blockVertices[index] = (1.0 - cube[index]) * yStart + cube[index] * yEnd;	index++;
		blockVertices[index] = cube[index];											index++;
		blockVertices[index] = cube[index];											index++;
	}

	if(!cubeEdges) {
		cubeEdges = new Float32Array([
			// Back ring
			-0.5, -0.5, 0.5, 1.0, -0.5, 0.5, 0.5, 1.0,
			-0.5, -0.5, 0.5, 1.0, 0.5, -0.5, 0.5, 1.0,
			0.5, -0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0,
			0.5, 0.5, 0.5, 1.0, -0.5, 0.5, 0.5, 1.0,

			// Front ring
			-0.5, -0.5, -0.5, 1.0, -0.5, 0.5, -0.5, 1.0,
			-0.5, -0.5, -0.5, 1.0, 0.5, -0.5, -0.5, 1.0,
			0.5, -0.5, -0.5, 1.0, 0.5, 0.5, -0.5, 1.0,
			0.5, 0.5, -0.5, 1.0, -0.5, 0.5, -0.5, 1.0,

			// Left track
			-0.5, -0.5, 0.5, 1.0, -0.5, -0.5, -0.5, 1.0,
			-0.5, 0.5, 0.5, 1.0, -0.5, 0.5, -0.5, 1.0,

			// Right track
			0.5, -0.5, 0.5, 1.0, 0.5, -0.5, -0.5, 1.0,
			0.5, 0.5, 0.5, 1.0, 0.5, 0.5, -0.5, 1.0
		]);
	}
    for (var i = 0; i < 24; i++) {
		// Position
		lineVertices[i * 4 + 0] = cubeEdges[i * 4 + 0] + x + 0.5;
		lineVertices[i * 4 + 1] = cubeEdges[i * 4 + 1] + y + 0.5;
		lineVertices[i * 4 + 2] = cubeEdges[i * 4 + 2] + z + 0.5;
		lineVertices[i * 4 + 3] = cubeEdges[i * 4 + 3];
    }
}

function createChunk(x, y, z) {
    var blockBufferId = gl.createBuffer();
	var lineBufferId = gl.createBuffer();
	
    var result = {
        blockBufferId: blockBufferId,
        lineBufferId: lineBufferId
    };
	
	fillChunk(result, x, y, z);
	
	return result;
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

function createCube(blockVertices, lineVertices, x, y, z, blockType) {
    var xStart = blockType[0] * (1.0/16.0);
    var yStart = blockType[1] * (1.0/16.0);
    var xEnd = blockType[0] * (1.0/16.0) + (1.0/16.0);
    var yEnd = blockType[1] * (1.0/16.0) + (1.0/16.0);

    var cube = [
        // Front
        vec4(-0.5, 0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(xStart, yEnd, 42.0, 42.0),
        vec4(0.5, 0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(0.5, 0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),
        vec4(0.5, -0.5, -0.5, 1.0), vec4(0.0, 0.0, -1.0, 0.0), vec4(xEnd, yStart, 42.0, 42.0),

        // Back
        vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),
        vec4(-0.5, 0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(xStart, yEnd, 42.0, 42.0),
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(0.5, -0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(xEnd, yStart, 42.0, 42.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),

        // Right
        vec4(0.5, 0.5, -0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(xEnd, yStart, 42.0, 42.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),
        vec4(0.5, -0.5, -0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(0.5, -0.5, -0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),
        vec4(0.5, -0.5, 0.5, 1.0), vec4(1.0, 0.0, 0.0, 0.0), vec4(xStart, yEnd, 42.0, 42.0),

        // Left
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(-0.5, 0.5, 0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),
        vec4(-0.5, 0.5, -0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(xEnd, yStart, 42.0, 42.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(xStart, yEnd, 42.0, 42.0),
        vec4(-0.5, 0.5, 0.5, 1.0), vec4(-1.0, 0.0, 0.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),

        // Top
        vec4(-0.5, 0.5, -0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(-0.5, 0.5, 0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(xStart, yEnd, 42.0, 42.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),
        vec4(-0.5, 0.5, -0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(0.5, 0.5, 0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),
        vec4(0.5, 0.5, -0.5, 1.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(xEnd, yStart, 42.0, 42.0),

        // Bottom
        vec4(0.5, -0.5, 0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),
        vec4(-0.5, -0.5, 0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(xStart, yEnd, 42.0, 42.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(xStart, yStart, 42.0, 42.0),
        vec4(0.5, -0.5, -0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(xEnd, yStart, 42.0, 42.0),
        vec4(0.5, -0.5, 0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(xEnd, yEnd, 42.0, 42.0),
        vec4(-0.5, -0.5, -0.5, 1.0), vec4(0.0, -1.0, 0.0, 0.0), vec4(xStart, yStart, 42.0, 42.0)
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
//    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
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

    canvas.addEventListener("mousemove", function(event) {
        mouse2DPosition[0] = event.clientX - canvas.offsetLeft;
        mouse2DPosition[1] = canvas.height - (event.clientY - canvas.offsetTop);
        get3DCursorPosition();

        var edgeNormal = getEdgeNormal();

        var xPos = Math.floor(mouse3DPosition[0] - edgeNormal[0] * 0.5) + edgeNormal[0];
        var yPos = Math.floor(mouse3DPosition[1] - edgeNormal[1] * 0.5) + edgeNormal[1];
        var zPos = Math.floor(mouse3DPosition[2] - edgeNormal[2] * 0.5) + edgeNormal[2];

        mouseWireframePosition = vec3(xPos, yPos, zPos);
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

                if (camera.mapMode) {
                    document.getElementById("mapMode").innerHTML = "On";
                } else {
                    document.getElementById("mapMode").innerHTML = "Off";
                }
                break;
            case 'q':
                removeBlock();
                break;
            case 'e':
                insertBlock();
                break;
            case 'f':
                camera.flyingMode = !camera.flyingMode;
                
                if (camera.flyingMode) {
                    document.getElementById("flyingMode").innerHTML = "On";
                } else {
                    document.getElementById("flyingMode").innerHTML = "Off";
                }     
                break;
            case '1':
                selectedBlockType = BlockType.DIRT;
                document.getElementById("selectedBlock").innerHTML = "Dirt";
                break;
            case '2':
                selectedBlockType = BlockType.GRASS;
                document.getElementById("selectedBlock").innerHTML = "Grass";
                break;
            case '3':
                selectedBlockType = BlockType.WOOD;
                document.getElementById("selectedBlock").innerHTML = "Wood";
                break;
            case '4':
                selectedBlockType = BlockType.WATER;
                document.getElementById("selectedBlock").innerHTML = "Water";
                break;
            case '5':
                selectedBlockType = BlockType.FIRE;
                document.getElementById("selectedBlock").innerHTML = "Fire";
                break;
            case '6':
                selectedBlockType = BlockType.STONE;
                document.getElementById("selectedBlock").innerHTML = "Stone";
                break;
            case '7':
                selectedBlockType = BlockType.METAL;
                document.getElementById("selectedBlock").innerHTML = "Metal";
                break;
        }
    });
}

function createPickingObjects() {
    // Create Framebuffer object
    pickingFramebuffer = gl.createFramebuffer();	// framebuffer object
    pickingFramebuffer.width = canvas.width;
    pickingFramebuffer.height = canvas.height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, pickingFramebuffer);

    // Create texture for rendering...

    pickingTexture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pickingTexture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickingTexture, 0);

    // Create depth buffer for hidden surface removal...

    var depthRenderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Create our picking shader program.
    pickingProgram = initShaders(gl, "picking-vertex-shader", "picking-fragment-shader");
}

function get3DCursorPosition() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, pickingFramebuffer);

    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if(status != gl.FRAMEBUFFER_COMPLETE) {
        alert('Frame Buffer Not Complete');
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawPickingCubes();

    var color = new Uint8Array(4);
    gl.readPixels(mouse2DPosition[0], mouse2DPosition[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, color);

    mouse3DPosition = vec4(color[0] * (1.0 / 255) * 64, color[1] * (1.0 / 255) * 64, color[2] * (1.0 / 255) * 64, color[3] * (1.0 / 255) * 10);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function drawPickingCubes() {
    gl.useProgram(pickingProgram);

    var uProjectionMatrix = gl.getUniformLocation(pickingProgram, "uProjectionMatrix"); // setup perspective settings
    var uViewMatrix = gl.getUniformLocation(pickingProgram, "uViewMatrix"); // move camera
    var uModelMatrix = gl.getUniformLocation(pickingProgram, "uModelMatrix"); //placement

    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(camera.getProjection()));
    gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.getView()));
    gl.uniformMatrix4fv(uModelMatrix, false, flatten(mat4()));

    for (var x = 0; x < CHUNKS_X; x++) {
        for (var y = 0; y < CHUNKS_Y; y++) {
            for (var z = 0; z < CHUNKS_Z; z++) {
                var chunk = worldChunks[x * CHUNKS_Y * CHUNKS_Z + y * CHUNKS_Z + z];

                gl.bindBuffer(gl.ARRAY_BUFFER, chunk.blockBufferId);

                var vPosition = gl.getAttribLocation(pickingProgram, "vPosition");
                gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, sizeof['vec4'] * 3, 0);
                gl.enableVertexAttribArray(vPosition);

                var vNormal = gl.getAttribLocation(pickingProgram, "vNormal");
                gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, sizeof['vec4'] * 3, sizeof['vec4']);
                gl.enableVertexAttribArray(vNormal);

                gl.drawArrays(gl.TRIANGLES, 0, chunk.blockVertexCount);
            }
        }
    }
}

function render() {
    update();

    gl.clearColor(0.0, 0.7490, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var viewport = camera.getViewport();
    gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);

    drawWhales();
    drawCubes();
    drawCubeWireframes();
    drawSpinningCubes();
    drawSpinningCubeWireframes();
    drawMouseWireFrame();

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
    var torchPosition = vec4(camera.position[0], camera.position[1], camera.position[2], 1.0); //torch
    gl.uniform4fv(uTorchPosition, flatten(multVector(camera.getView(), torchPosition)));

    var uLightDirectionSun = gl.getUniformLocation(cubeProgram, "uLightDirectionSun");
    var lightDirectionSun = normalize(vec4(Math.cos(radians(sunAngle)), Math.sin(radians(sunAngle)), 0.01, 0.0)); //sun
    gl.uniform4fv(uLightDirectionSun, flatten(multVector(camera.getView(), lightDirectionSun)));

    var uLightDirectionMoon = gl.getUniformLocation(cubeProgram, "uLightDirectionMoon");
    var lightDirectionMoon = normalize(vec4(Math.cos(radians(sunAngle + 180)), Math.sin(radians(sunAngle + 180)), 0.01, 0.0)); //moon
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
    sunAngle += 15.0 * dt;
    for(var i=0; i<spinningCubePositions.length; i++){
        if(length(subtract(camera.position, spinningCubePositions[i])) < 1.0){
            spinningCubePositions.splice(i, 1);
            break;
        }
    }
}

function createSpinningCube() {
    var blockVertices = [];
    var lineVertices = [];

    createCube(blockVertices, lineVertices, -0.5, -0.5, -0.5, BlockType.METAL);

    //scale, rotate
    var thetaX = 45.0;
    var thetaZ = 35.0;

    var modelMatrix = mat4();
    modelMatrix =  mult(modelMatrix, rotate(thetaZ, vec3(0.0, 0.0, 1.0)));
    modelMatrix = mult(modelMatrix, rotate(thetaX, vec3(1.0, 0.0, 0.0)));
    modelMatrix = mult(modelMatrix, scalem(vec3(0.5, 0.5, 0.5)));

    // scale and rotate block to start position
    for (var i = 0; i < blockVertices.length; i++) {
        if(i % 3 != 2) {
            blockVertices[i] = multVector(modelMatrix, blockVertices[i]);
        }
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

function createMouseWireframe() {
    var blockVertices = [];
    var lineVertices = [];

    createCube(blockVertices, lineVertices, 0, 0, 0, BlockType.GRASS);

    // wireframe buffer
    var mouseWireframeId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mouseWireframeId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(lineVertices), gl.STATIC_DRAW);

    return {
        mouseWireframeId : mouseWireframeId,
        mouseWireframeVertexCount : lineVertices.length
    };
}

function drawMouseWireFrame() {
    gl.useProgram(cubeWireframeProgram);

    var uProjectionMatrix = gl.getUniformLocation(cubeWireframeProgram, "uProjectionMatrix"); // setup perspective settings
    var uViewMatrix = gl.getUniformLocation(cubeWireframeProgram, "uViewMatrix"); // move camera
    var uModelMatrix = gl.getUniformLocation(cubeWireframeProgram, "uModelMatrix"); //placement

    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(camera.getProjection()));

    gl.uniformMatrix4fv(uViewMatrix, false, flatten(camera.getView()));

    gl.bindBuffer(gl.ARRAY_BUFFER, mouseWireFrame.mouseWireframeId);

    var vPosition = gl.getAttribLocation(cubeWireframeProgram, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var modelMatrix = translate(mouseWireframePosition);
    gl.uniformMatrix4fv(uModelMatrix, false, flatten(modelMatrix));

    gl.drawArrays(gl.LINES, 0, mouseWireFrame.mouseWireframeVertexCount);
}

function getBlock(x, y, z){
    if((x >= 0 && x < BLOCKS_X) && (y >= 0 && y < BLOCKS_Y) && (z >= 0 && z < BLOCKS_Z)){
        return worldBlocks[x * BLOCKS_Y * BLOCKS_Z + y * BLOCKS_Z + z];
    }else {
        return BlockType.AIR;
    }
}

function removeBlock(){
    if(Math.round(mouse3DPosition[3]) == 10){
        return;
    }
    var edgeNormal = getEdgeNormal();

    var xPos = Math.floor(mouse3DPosition[0] - edgeNormal[0] * 0.5);
    var yPos = Math.floor(mouse3DPosition[1] - edgeNormal[1] * 0.5);
    var zPos = Math.floor(mouse3DPosition[2] - edgeNormal[2] * 0.5);

    if((xPos >= 0 && xPos < BLOCKS_X) && (yPos >= 0 && yPos < BLOCKS_Y) && (zPos >= 0 && zPos < BLOCKS_Z)) {
        worldBlocks[xPos * BLOCKS_Y * BLOCKS_Z + yPos * BLOCKS_Z + zPos] = BlockType.AIR;
        refreshChunk(xPos, yPos, zPos);
        spinningCubePositions.push(vec3(xPos + 0.5, yPos + 0.5, zPos + 0.5));
    }
}

function insertBlock(){
    if(Math.round(mouse3DPosition[3]) == 10){
        return;
    }
    var edgeNormal = getEdgeNormal();

    var xPos = Math.floor(mouse3DPosition[0] - edgeNormal[0] * 0.5) + edgeNormal[0];
    var yPos = Math.floor(mouse3DPosition[1] - edgeNormal[1] * 0.5) + edgeNormal[1];
    var zPos = Math.floor(mouse3DPosition[2] - edgeNormal[2] * 0.5) + edgeNormal[2];

    if((xPos >= 0 && xPos < BLOCKS_X) && (yPos >= 0 && yPos < BLOCKS_Y) && (zPos >= 0 && zPos < BLOCKS_Z)) {
        worldBlocks[xPos * BLOCKS_Y * BLOCKS_Z + yPos * BLOCKS_Z + zPos] = selectedBlockType;
        refreshChunk(xPos, yPos, zPos);
    }
}

function getEdgeNormal(){
    var edgeNormal = vec3();

    var edge = Math.round(mouse3DPosition[3]);
    switch(edge){
        case 0:
            edgeNormal[0] = -1;
            break;
        case 1:
            edgeNormal[0] = 1;
            break;
        case 2:
            edgeNormal[1] = -1;
            break;
        case 3:
            edgeNormal[1] = 1;
            break;
        case 4:
            edgeNormal[2] = -1;
            break;
        case 5:
            edgeNormal[2] = 1;
            break;
        case 10:
            break;
        default:
            console.log(edge);
            break;
    }
    return edgeNormal;
}

function refreshChunk(xPos, yPos, zPos){
    var chunkX = Math.floor(xPos / CHUNK_SIZE_X);
    var chunkY = Math.floor(yPos / CHUNK_SIZE_Y);
    var chunkZ = Math.floor(zPos / CHUNK_SIZE_Z);

    var chunk = worldChunks[chunkX * CHUNKS_Y * CHUNKS_Z + chunkY * CHUNKS_Z + chunkZ];

	fillChunk(chunk, chunkX * CHUNK_SIZE_X, chunkY * CHUNK_SIZE_Y, chunkZ * CHUNK_SIZE_Z);
}