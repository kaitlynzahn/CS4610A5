"use strict";

var keys = {};

function KeyIsPressed(code) {
    var pressed = keys[code];
    if (typeof pressed !== "undefined" && pressed) {
        return true;
    }
    return false;
}

function ParseObj(objString) {

    var lines = objString.split('\n');

    var vertices = [];
    var indices = [];
    for (var i = 0; i < lines.length; i++) {

        var line = lines[i].split(' ');
        if (line[0] == "v") {
            var x = parseFloat(line[1]);
            var y = parseFloat(line[2]);
            var z = parseFloat(line[3]);
            var vertex = vec3(x, y, z);
            vertices.push(vertex);
        }
        else if (line[0] == "f") {
            var i1 = parseInt(line[1]);
            var i2 = parseInt(line[2]);
            var i3 = parseInt(line[3]);
            indices.push(i1);
            indices.push(i2);
            indices.push(i3);
        }
    }
    return [vertices, indices];
}

function FlattenIndexedAttribute(attribute, indices) {
    var flat = [];
    for (var i = 0; i < indices.length; i++) {
        var aIndex = indices[i] - 1;
        var a = attribute[aIndex];
        flat.push(a);
    }
    return flat;
}

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);

var lightAmbient = vec4(1.0, 1.0, 1.0, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(0.1, 0.1, 0.1, 1.0);
var materialDiffuse = vec4(0.1, 0.25, 1.0, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialShininess = 100.0;

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");

    var gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    var [vertices, indices] = ParseObj(pigObj);
    console.log("num vertices: " + vertices.length + ", num_indices: " + indices.length);

    //scale object down. This could also be done with a scaling matrix in the shader
    for(var i = 0; i < vertices.length; i++)
    {
        vertices[i] = mult(1.0 / 7.5, vertices[i]);
    }

    var positions = FlattenIndexedAttribute(vertices, indices);
    console.log("num positions: " + positions.length);

    // find normals for flat
    var normals = [];
    for(var i = 0; i < positions.length; i += 3) {
        var p1 = positions[i];
        var p2 = positions[i+1];
        var p3 = positions[i+2];

        var v1 = subtract(p1,p2);
        var v2 = subtract(p3,p2);

        var normal = cross(v2, v1);
        normal = normalize(normal);

        normals.push(normal);
        normals.push(normal);
        normals.push(normal);
    }

    console.log("num normals: " + normals.length);

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

    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    //setup normal buffer
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    //here we use a parent matrix so we can "move" the center of rotation

    //setup parent model matrix
    var parentRotation = mat4();
    var parentPosition = translate(0, -0.5, -4);
    var parentModel = mult(parentPosition, parentRotation);

    //setup model matrix
    var rotation = mult(rotateY(-90), rotateX(-90));
    var position = translate(0, -1.25, 0);
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

    //send lightPosition matrix to shader
    var lightPositionLoc = gl.getUniformLocation(program, "uLightPosition");
    gl.uniform4fv(lightPositionLoc, flatten(lightPosition));

    //send ambientProduct matrix to shader
    var ambientProduct = mult(lightAmbient, materialAmbient);
    var ambientProductLoc = gl.getUniformLocation(program, "uAmbientProduct");
    gl.uniform4fv(ambientProductLoc, flatten(ambientProduct));

    //send diffuseProduct matrix to shader
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var diffuseProductLoc = gl.getUniformLocation(program, "uDiffuseProduct");
    gl.uniform4fv(diffuseProductLoc, flatten(diffuseProduct));

    //send specularProduct matrix to shader
    var specularProduct = mult(lightSpecular, materialSpecular);
    var specularProductLoc = gl.getUniformLocation(program, "uSpecularProduct");
    gl.uniform4fv(specularProductLoc, flatten(specularProduct));

    //send shininess matrix to shader
    var shininessLoc = gl.getUniformLocation(program, "uShininess");
    gl.uniform1f(shininessLoc, false, materialShininess);



    function render(time) {

        //send model matrix to shader
        model = mult(position, rotation);
        parentModel = mult(parentPosition, parentRotation);
        var worldModel = mult(parentModel, model);
        gl.uniformMatrix4fv(modelLoc, false, flatten(worldModel));

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
            parentRotation = mult(rotateY(event.movementX * rotateSpeed), parentRotation);
            parentRotation = mult(rotateX(event.movementY * rotateSpeed), parentRotation);
        }
    });

    var materialDiffuseLabel = document.getElementById("materialDiffuseLabel");
    var materialSpecularLabel = document.getElementById("materialSpecularLabel");
    var materialShininessLabel = document.getElementById("materialShininessLabel");

    var sliderMDR = document.getElementById("materialDiffuseR");
    var sliderMDG = document.getElementById("materialDiffuseG");
    var sliderMDB = document.getElementById("materialDiffuseB");

    var sliderMSR = document.getElementById("materialSpecularR");
    var sliderMSG = document.getElementById("materialSpecularG");
    var sliderMSB = document.getElementById("materialSpecularB");

    var sliderShininess = document.getElementById("materialShininess");

    

    function handleDiffuseChange() {
        var R = parseFloat(sliderMDR.value);
        var G = parseFloat(sliderMDG.value);
        var B = parseFloat(sliderMDB.value);
        materialDiffuseLabel.innerHTML = `Material Diffuse RGB (${R.toFixed(2)}, ${G.toFixed(2)}, ${B.toFixed(2)}):`;
        materialDiffuse = vec4(R, G, B, 1.0);
        
        //send material diffuse to shader here
        var diffuseProduct = mult(lightDiffuse, materialDiffuse);
        var diffuseProductLoc = gl.getUniformLocation(program, "uDiffuseProduct");
        gl.uniform4fv(diffuseProductLoc, flatten(diffuseProduct));
    }

    function handelSpecularChange() {
        var R = parseFloat(sliderMSR.value);
        var G = parseFloat(sliderMSG.value);
        var B = parseFloat(sliderMSB.value);
        materialSpecularLabel.innerHTML = `Material Specular RGB (${R.toFixed(2)}, ${G.toFixed(2)}, ${B.toFixed(2)}):`;
        materialSpecular = vec4(R, G, B, 1.0);

        //send material specular to shader here
        var specularProduct = mult(lightSpecular, materialSpecular);
        var specularProductLoc = gl.getUniformLocation(program, "uSpecularProduct");
        gl.uniform4fv(specularProductLoc, flatten(specularProduct));
    }


    sliderMDR.addEventListener("input", function (event) {
        handleDiffuseChange();
    });
    sliderMDG.addEventListener("input", function (event) {
        handleDiffuseChange();
    });
    sliderMDB.addEventListener("input", function (event) {
        handleDiffuseChange();
    });

    sliderMSR.addEventListener("input", function (event) {
        handelSpecularChange();
    });
    sliderMSG.addEventListener("input", function (event) {
        handelSpecularChange();
    });
    sliderMSB.addEventListener("input", function (event) {
        handelSpecularChange();
    });


    sliderShininess.addEventListener("input", function (event) {
        var shininessValue = parseFloat(sliderShininess.value);
        materialShininess = shininessValue;
        var shininessString = String(materialShininess);
        for(var i = shininessString.length; i < 3; i++)
        {
            shininessString = "0" + shininessString;
        }
        materialShininessLabel.innerHTML = `Material Shininess (${shininessString}):`;

        //send material shininess to shader here
        var shininessLoc = gl.getUniformLocation(program, "uShininess");
        gl.uniform1f(shininessLoc, false, materialShininess);
    });

    window.addEventListener("keydown", function (event) {
        keys[event.code] = true;
    });

    window.addEventListener("keyup", function (event) {
        keys[event.code] = false;
    });
}