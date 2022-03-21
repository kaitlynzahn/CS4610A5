"use strict";

var keys = {};

function KeyIsPressed(code) {
    var pressed = keys[code];
    if (typeof pressed !== "undefined" && pressed) {
        return true;
    }
    return false;
}

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");

    var gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    var positions = [
        vec3(-0.5, -0.5, 0),
        vec3(0.5, -0.5, 0),
        vec3(0.5, 0.5, 0),

        vec3(-0.5, -0.5, 0),
        vec3(0.5, 0.5, 0),
        vec3(-0.5, 0.5, 0)
    ];

    //manually declare texture coordinates here. There should be 6, same length as positions
    var UV = [
        vec2(0,0),
        vec2(1,0),
        vec2(1,1),
        vec2(0,0),
        vec2(1,1),
        vec2(0,1),
    ];

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    //setup the canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    //setup the shader program
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    //setup vertex buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    // setup position
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    // set buffer
    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(UV), gl.STATIC_DRAW);

    // set location
    var uLocation = gl.getAttribLocation(program, "aUV");
    gl.vertexAttribPointer(uLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(uLocation);

    //Asynchronously load an image
    var image = new Image();
    image.src = "mandrill.PNG";
    image.addEventListener('load', function () {
        try {
            // Now that the image has loaded copy it to the texture & bind it
            var imageData = image;
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        catch (e) {
            console.log(e);
            canvas.remove();

            var message = document.createElement("h1");
            message.innerHTML = "Could not load image (CORS). Use visual studio to run local server.";
            document.body.appendChild(message);
            return;
        }
    });

    //here we use a parent matrix so we can "move" the center of rotation

    //setup model matrix
    var rotation = mat4();
    var position = translate(0, 0, -1);
    var model = mult(position, rotation);

    //setup view matrix
    var cameraPosition = mat4();
    var cameraRotation = mat4();

    //setup projection matrix
    var aspectRatio = canvas.width / canvas.height;
    var projection = perspective(90, aspectRatio, 0.01, 1000);

    //send model matrix to shader
    var modelLoc = gl.getUniformLocation(program, "uModel");
    gl.uniformMatrix4fv(modelLoc, false, flatten(model));

    //send view matrix to shader
    var viewLoc = gl.getUniformLocation(program, "uView");
    gl.uniformMatrix4fv(viewLoc, false, flatten(mat4()));

    //send projection matrix to shader
    var projectionLoc = gl.getUniformLocation(program, "uProjection");
    gl.uniformMatrix4fv(projectionLoc, false, flatten(projection));

    function render(time) {

        //send model matrix to shader
        model = mult(position, rotation);
        gl.uniformMatrix4fv(modelLoc, false, flatten(model));

        //send view matrix to shader
        var view = inverse(mult(cameraPosition, cameraRotation));
        gl.uniformMatrix4fv(viewLoc, false, flatten(view));

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, positions.length);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    canvas.addEventListener("mousemove", function (event) {

        var rotateSpeed = 0.3515625;

        //if mouse is currently clicked (during move event)
        if (event.buttons == 1) {
            rotation = mult(rotateY(event.movementX * rotateSpeed), rotation);
            rotation = mult(rotateX(event.movementY * rotateSpeed), rotation);
        }
    });

    window.addEventListener("keydown", function (event) {
        keys[event.code] = true;
    });

    window.addEventListener("keyup", function (event) {
        keys[event.code] = false;
    });
}