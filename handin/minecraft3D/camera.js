
function Camera(position, pitch, yaw) {
    this.position = position;
    this.pitch = pitch;
    this.yaw = yaw;

    this.moveForward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveBackward = false;

    this.forwardDir = vec3(0, 0, -1);
    this.rightDir = vec3(0, 0, -1);
    this.upDir = vec3(0, 0, -1);

    this.perspectiveProjection =  perspective(75, (canvas.width / canvas.height), 0.2, 100.0);
    this.orthoProjection = ortho(0.0, 64.0, 0.0, 64.0, 0.0, 64.0);

    this.mapMode = false;

    this.viewport = vec4(0.0, 0.0, canvas.width, canvas.height);

    var mapSize = (canvas.height * 3.0) / 4.0;
    this.mapViewport = vec4(canvas.width/2 - mapSize/2, canvas.height/2 - mapSize/2, mapSize, mapSize);
}

Camera.prototype.refresh = function() {
    // Create rotation matrix
    var rotation = mult(rotateY(this.yaw), rotateX(this.pitch));

    // Create translation matrix
    var translation = translate(this.position[0], this.position[1], this.position[2]);

    // Create inverse view matrix
    this.view = inverse4(mult(translation, rotation));

    // Create orthonormal basis we can use for movement
    // slice(0, 3) : from vec4 to vec3
    this.forwardDir = multVector(rotation, vec4(0, 0, -1, 0)).slice(0, 3);
    this.rightDir = multVector(rotation, vec4(1, 0, 0, 0)).slice(0, 3);
    this.upDir = multVector(rotation, vec4(0, 1, 0, 0)).slice(0, 3);
};

Camera.prototype.getView = function(){
    if(this.mapMode){
        var translation = translate(0, 64, 0);
        var rotation = mult(rotateY(90), rotateX(90));
        return inverse4(mult(translation, rotation));
    }else {
        return this.view;
    }
};

Camera.prototype.getProjection = function(){
    if(this.mapMode) {
        return this.orthoProjection
    }else {
        return this.perspectiveProjection;
    }
};

Camera.prototype.getViewport = function(){
    if(this.mapMode){
        return this.mapViewport;
    }else {
        return this.viewport;
    }
};

Camera.prototype.update = function(dt) {
    if(this.mapMode){
        return
    }

    var speed = 10.0;
    var movement = speed * dt;

    if (this.moveForward) {
        this.position = add(this.position, scale(movement, this.forwardDir));
    }

    if (this.moveBackward) {
        this.position = subtract(this.position, scale(movement, this.forwardDir));
    }

    if (this.moveRight) {
        this.position = add(this.position, scale(movement, this.rightDir));
    }

    if (this.moveLeft) {
        this.position = subtract(this.position, scale(movement, this.rightDir));
    }

    this.collisionDetection();

    this.refresh();
};

Camera.prototype.collisionDetection = function() {
    var wx = Math.floor(this.position[0]);
    var wy = Math.floor(this.position[1]);
    var wz = Math.floor(this.position[2]);

    var currentBlock = getBlock(wx, wy, wz);

    if (currentBlock != BlockType.AIR) {
        var up = getBlock(wx, wy+1, wz);
        var down = getBlock(wx, wy-1, wz);
        var right = getBlock(wx+1, wy, wz);
        var left = getBlock(wx-1, wy, wz);
        var front = getBlock(wx, wy, wz-1);
        var back = getBlock(wx, wy, wz+1);

        var fluidBlock = [];
        if (this.isFluid(up)) {
            fluidBlock.push(vec3(wx, (wy + 1), wz));
        }
        if (this.isFluid(down)) {
            fluidBlock.push(vec3(wx, (wy - 1), wz));
        }
        if (this.isFluid(right)) {
            fluidBlock.push(vec3((wx + 1), wy, wz));
        }
        if (this.isFluid(left)) {
            fluidBlock.push(vec3((wx - 1), wy, wz));
        }
        if (this.isFluid(front)) {
            fluidBlock.push(vec3(wx, wy, (wz - 1)));
        }
        if (this.isFluid(back)) {
            fluidBlock.push(vec3(wx, wy, (wz + 1)));
        }

        if (fluidBlock.length > 0) {
            this.position =
                fluidBlock.reduce(function (prevValue, currentValue) {
                    if (prevValue == null) {
                        return currentValue;
                    } else {
                        var distPrev = camera.distanceFromCamera(prevValue);
                        var distCur = camera.distanceFromCamera(currentValue);
                        return distPrev < distCur ? prevValue : currentValue;
                    }
                }, null);
        }
    }

};

Camera.prototype.distanceFromCamera = function(point){
    return length(subtract(this.position, point));
};

Camera.prototype.isFluid = function(block){
    return block == BlockType.AIR || block == BlockType.WATER || block == BlockType.FIRE;
};

