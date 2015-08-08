
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

    this.perspectiveProjection =  perspective(75, (canvas.clientWidth / canvas.clientHeight), 0.2, 100.0);
    this.orthoProjection = ortho(0.0, 64.0, 0.0, 64.0, 0.0, 64.0);

    this.mapMode = false;

    this.viewport = vec4(0.0, 0.0, canvas.clientWidth, canvas.clientHeight);

    var mapSize = (canvas.clientHeight * 3.0) / 4.0;
    this.mapViewport = vec4(canvas.clientWidth/2 - mapSize/2, canvas.clientHeight/2 - mapSize/2, mapSize, mapSize);
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
	
	while(movement > 0) {
		// Move in increments of 0.8:
		var movementFraction = Math.min(movement, 0.8);
		movement -= movementFraction;

		if (this.moveForward) {
			this.position = add(this.position, scale(movementFraction, this.forwardDir));
		}

		if (this.moveBackward) {
			this.position = subtract(this.position, scale(movementFraction, this.forwardDir));
		}

		if (this.moveRight) {
			this.position = add(this.position, scale(movementFraction, this.rightDir));
		}

		if (this.moveLeft) {
			this.position = subtract(this.position, scale(movementFraction, this.rightDir));
		}

		this.collisionDetection();
	}

    this.refresh();
};

Camera.prototype.collisionDetection = function() {
    var wx = Math.floor(this.position[0]);
    var wy = Math.floor(this.position[1]);
    var wz = Math.floor(this.position[2]);

    var currentBlock = getBlock(wx, wy, wz);

    if (currentBlock != BlockType.AIR) {
	
		var freePositions = [];
	
		// Loop through all surrounding blocks:
		for(var offsetX = -1; offsetX <= 1; offsetX++) {
			for(var offsetY = -1; offsetY <= 1; offsetY++) {
				for(var offsetZ = -1; offsetZ <= 1; offsetZ++) {
					if(offsetX == 0 && offsetY == 0 && offsetZ == 0) {
						continue;
					}
					var surroundingBlock = getBlock(wx + offsetX, wy + offsetY, wz + offsetZ);
					
					if (this.isFluid(surroundingBlock)) {
						function projector(floored, actual, offset) {
							if(offset == -1) {
								return floored;
							} else if(offset == 0) {
								return actual;
							} else {
								return floored + 1;
							}
						}

						// Position in the free block closest to our current position:
						var projectedPosition = vec3(
							projector(wx, this.position[0], offsetX),
							projector(wy, this.position[1], offsetY),
							projector(wz, this.position[2], offsetZ)
						);
						
						freePositions.push(projectedPosition);
					}
				}
			}
		}
	
        if (freePositions.length > 0) {
			// Choose the free position that is closest to our current position:
            this.position =
                freePositions.reduce(function (prevValue, currentValue) {
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