var turtleX;
var turtleY;
var turtleTheta;
var turtlePenUp;
var points;

function init(x, y, theta){
	turtleX = x;
	turtleY = y;
	turtleTheta = theta;
	turtlePenUp = false;
	points = [];
}

function forward(distance){
	var newX = turtleX + Math.cos(toRadians(turtleTheta)) * distance;
	var newY = turtleY + Math.sin(toRadians(turtleTheta)) * distance;
	
	if(!turtlePenUp){
		points.push(vec2(turtleX, turtleY), vec2(newX, newY));
	}	
	
	turtleX = newX;
	turtleY = newY;
}

function right(angle){
	turtleTheta -= angle;
}

function left(angle){
	turtleTheta += angle;
}

function penUp(){
	turtlePenUp = true;
}

function penDown(){
	turtlePenUp = false;
}

function toDegrees (angle) {
	  return angle * (180 / Math.PI);
}

function toRadians (angle) {
	  return angle * (Math.PI / 180);
}
