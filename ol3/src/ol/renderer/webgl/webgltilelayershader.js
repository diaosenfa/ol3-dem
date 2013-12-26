// This file is automatically generated, do not edit
goog.provide('ol.renderer.webgl.tilelayer.shader');

goog.require('ol.webgl.shader');



/**
 * @constructor
 * @extends {ol.webgl.shader.Fragment}
 */
ol.renderer.webgl.tilelayer.shader.Fragment = function() {
  goog.base(this, ol.renderer.webgl.tilelayer.shader.Fragment.SOURCE);
};
goog.inherits(ol.renderer.webgl.tilelayer.shader.Fragment, ol.webgl.shader.Fragment);
goog.addSingletonGetter(ol.renderer.webgl.tilelayer.shader.Fragment);


/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.tilelayer.shader.Fragment.DEBUG_SOURCE = 'precision highp float;\n\n// texture with encoded elevation values\nuniform sampler2D u_texture;\n\n// length of one tile in meter at equator\nuniform float u_tileSizeM;\n\n// temporary values for transfer to fragment shader\nvarying vec2 v_texCoord;\n\nfloat decodeElevation(in vec4 colorChannels) {\n\t// decode input data values\n \tfloat elevationM = ((colorChannels.r*255.0 + (colorChannels.g*255.0)*256.0)-11000.0)/10.0;\n    return elevationM;\n}\n\n\n// color ramp texture to look up hypsometric tints\nuniform sampler2D u_colorRamp;\n\n// scale threshold values to adapt color ramp \n// u_colorScale.x is lower threshold, u_colorScale.y is upper threshold\nuniform vec2 u_colorScale;\n\n// flag for coloring inland waterbodies\nuniform bool u_waterBodies; \n\n// flag for coloring inland waterbodies\nuniform bool u_hillShading; \n\n// direction of light source\nuniform vec3 u_light; \n\n// number of vertices per edge\nuniform float u_meshResolution; \n\n// flag for testing mode\nuniform bool u_testing; \n\nconst float MAX_ELEVATION = 4900.0; // assumed to be the highest elevation in the eu-dem\n// mesh cellsize for tile resolution of 256x256 pixel\nconst highp float CELLSIZE = 0.00390625; // =1.0/256.0\n\nvoid main(void) {\n\n\t// compute mesh cellSize dependend of resolution (number of vertices per edge)\n\t//highp float CELLSIZE = 1.0 / u_meshResolution; \n\n\t// Orientation of coordinate system in fragment shader:\n\t// ------>\tx\n\t// |\n\t// |\n\t// \\/\n\t// y\n    \n    // When on eastern or southern tile border, take not current cells elevation\n    // but use (northern / western) neighbour cell to avoid stronger artefacts.\n    // The values on each adjacent tile border is the same so without this filter\n    // there would be a two pixel wide line visible.\n    vec2 m_texCoord = v_texCoord;\n\n\n\tif(m_texCoord.y <= CELLSIZE){ // southern border of tile\n\t\tm_texCoord = vec2(m_texCoord.x,m_texCoord.y+CELLSIZE);\n\t}\n\tif(m_texCoord.x >= 1.0-CELLSIZE){ // eastern border of tile\n\t\tm_texCoord = vec2(m_texCoord.x-0.8*CELLSIZE,m_texCoord.y);\n\t}\n\n\t// compute neighbouring vertices\n\tvec3 neighbourRight = vec3(m_texCoord.x+CELLSIZE, 1.0 - m_texCoord.y,0.0);\n\tvec3 neighbourBelow = vec3(m_texCoord.x, 1.0 - m_texCoord.y+CELLSIZE,0.0);\n    \n\t// read encoded values from dem tile texture and decode elevation values\n    float absElevation = decodeElevation(texture2D(u_texture, m_texCoord.xy));\n    neighbourRight.z = decodeElevation(texture2D(u_texture, vec2(m_texCoord.x+CELLSIZE, m_texCoord.y)));\n    neighbourBelow.z = decodeElevation(texture2D(u_texture, vec2(m_texCoord.x, m_texCoord.y-CELLSIZE)));\n  \n\t// transform x and y to meter coordinates for normal computation and add elevation value\n\tvec3 currentV = vec3(m_texCoord.x*u_tileSizeM,(1.0 - m_texCoord.y)*u_tileSizeM,absElevation);\n\n\n// computation of hypsometric color\n\t// scaling of color ramp\n\tfloat colorMin = u_colorScale.x/MAX_ELEVATION;\n\tfloat colorMax = u_colorScale.y/MAX_ELEVATION;\n\tfloat relativeElevation = absElevation/MAX_ELEVATION;\n\tif(relativeElevation<=colorMin){\n\t\trelativeElevation = 0.0;\n\t} else if(relativeElevation>=colorMax){\n\t\trelativeElevation = 1.0;\n\t} else {\n\t\trelativeElevation = (relativeElevation - colorMin) / (colorMax - colorMin);\n\t}\n\t// read corresponding value from color ramp texture\n\tvec4 hypsoColor = abs(texture2D(u_colorRamp,vec2(0.5,relativeElevation)));\n\n\t// color for water surfaces in flat terrain\n\tif(currentV.z == absElevation && neighbourRight.z == absElevation && neighbourBelow.z == absElevation){\n\t\t\n\t\t// sealevel (0.0m) or below (i.e. negative no data values)\n\t\tif(absElevation <= 0.0){\n\t\t\thypsoColor = vec4(0.5058823529,0.7725490196,0.8470588235,1.0);\t// set color to blue\n\n\t\t// if not on sea-level and inland waterBody flag is true\t\n\t\t} else if(u_waterBodies) {\n\n\t\t\t// doublecheck if this pixel really belongs to a larger surface with help of remaining two neighbours\n\t\t\t//vec3 neighbourAbove = vec3(v_texCoord.x,v_texCoord.y-CELLSIZE/2.0,0.0);  \n\t\t\t//vec3 neighbourLeft = vec3(v_texCoord.x+CELLSIZE/2.0,v_texCoord.y,0.0);  \n\t\t\t//if(decodeElevation(texture2D(u_texture, neighbourAbove.xy)) == absElevation && decodeElevation(texture2D(u_texture, neighbourLeft.xy)) == absElevation){\n\t\t\t\thypsoColor = vec4(0.5058823529,0.7725490196,0.8470588235,1.0); \t// set color to blue\n\t\t\t//}\n\t\t}\n\t} \n\n// computation of hillshading\n\tif(u_hillShading){\n\t\t// transform to meter coordinates for normal computation\n\t\tneighbourRight.xy *= u_tileSizeM;\n\t\tneighbourBelow.xy *= u_tileSizeM;\n\n\t\t// normal computation\n\t\tvec3 normal = normalize(cross(neighbourRight -currentV,neighbourBelow-currentV));\n\n\t\t// compute hillShade with help of u_light and normal and blend hypsocolor with hillShade\n\t\tfloat hillShade = max(dot(normal,normalize(u_light)),0.0);\n\t\tgl_FragColor = hypsoColor * vec4(hillShade,hillShade,hillShade,1.0);\n\t} else {\n\t\t// apply only hypsometric color\n\t\tgl_FragColor = hypsoColor;\n\t}\n\n\n\n// testing mode\n\tif(u_testing){\n\t\tif(!gl_FrontFacing){\n\t\t//gl_FragColor = vec4(0.7,0.2,0.4,1.0);\n\t\tdiscard;\n\t\t}\t\t\n\t\tif(m_texCoord.x >= 0.99){\n\t        gl_FragColor = vec4(0.0,0.0,1.0,1.0);\n\t\t}\n\t\tif(m_texCoord.x <= 0.01){\n\t        gl_FragColor = vec4(1.0,0.0,0.0,1.0);\n\t\t}\n\t\tif(m_texCoord.y <= 0.01){\n\t        gl_FragColor = vec4(0.0,1.0,0.0,1.0);\n\t\t}\n\t\tif(m_texCoord.y >= 0.99){\n\t        gl_FragColor = vec4(0.0,0.5,0.5,1.0);\n\t\t} \t\n\t\tif(m_texCoord.y >= 0.5){\n\t\t\tgl_FragColor.a = 0.8;\n\n        //gl_FragColor.r = 1.0;\n\t\t}\n\t\tif(m_texCoord.y <= 0.5){\n        //gl_FragColor.g = 1.0;\n\t\t}\n\t}\n}\n';


/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.tilelayer.shader.Fragment.OPTIMIZED_SOURCE = 'precision highp float;uniform sampler2D a;uniform float b;varying vec2 c;float decodeElevation(in vec4 colorChannels){float elevationM=((colorChannels.r*255.0+(colorChannels.g*255.0)*256.0)-11000.0)/10.0;return elevationM;}uniform sampler2D g;uniform vec2 h;uniform bool i;uniform bool j;uniform vec3 k;uniform float l;uniform bool m;const float MAX_ELEVATION=4900.0;const highp float CELLSIZE=0.00390625;void main(void){vec2 m_texCoord=c;if(m_texCoord.y<=CELLSIZE){m_texCoord=vec2(m_texCoord.x,m_texCoord.y+CELLSIZE);}if(m_texCoord.x>=1.0-CELLSIZE){m_texCoord=vec2(m_texCoord.x-0.8*CELLSIZE,m_texCoord.y);}vec3 neighbourRight=vec3(m_texCoord.x+CELLSIZE,1.0-m_texCoord.y,0.0);vec3 neighbourBelow=vec3(m_texCoord.x,1.0-m_texCoord.y+CELLSIZE,0.0);float absElevation=decodeElevation(texture2D(a,m_texCoord.xy));neighbourRight.z=decodeElevation(texture2D(a,vec2(m_texCoord.x+CELLSIZE,m_texCoord.y)));neighbourBelow.z=decodeElevation(texture2D(a,vec2(m_texCoord.x,m_texCoord.y-CELLSIZE)));vec3 currentV=vec3(m_texCoord.x*b,(1.0-m_texCoord.y)*b,absElevation);float colorMin=h.x/MAX_ELEVATION;float colorMax=h.y/MAX_ELEVATION;float relativeElevation=absElevation/MAX_ELEVATION;if(relativeElevation<=colorMin){relativeElevation=0.0;}else if(relativeElevation>=colorMax){relativeElevation=1.0;}else{relativeElevation=(relativeElevation-colorMin)/(colorMax-colorMin);}vec4 hypsoColor=abs(texture2D(g,vec2(0.5,relativeElevation)));if(currentV.z==absElevation&&neighbourRight.z==absElevation&&neighbourBelow.z==absElevation){if(absElevation<=0.0){hypsoColor=vec4(0.5058823529,0.7725490196,0.8470588235,1.0);}else if(i){hypsoColor=vec4(0.5058823529,0.7725490196,0.8470588235,1.0);}} if(j){neighbourRight.xy*=b;neighbourBelow.xy*=b;vec3 normal=normalize(cross(neighbourRight-currentV,neighbourBelow-currentV));float hillShade=max(dot(normal,normalize(k)),0.0);gl_FragColor=hypsoColor*vec4(hillShade,hillShade,hillShade,1.0);}else{gl_FragColor=hypsoColor;}if(m){if(!gl_FrontFacing){discard;}if(m_texCoord.x>=0.99){gl_FragColor=vec4(0.0,0.0,1.0,1.0);}if(m_texCoord.x<=0.01){gl_FragColor=vec4(1.0,0.0,0.0,1.0);}if(m_texCoord.y<=0.01){gl_FragColor=vec4(0.0,1.0,0.0,1.0);}if(m_texCoord.y>=0.99){gl_FragColor=vec4(0.0,0.5,0.5,1.0);}if(m_texCoord.y>=0.5){gl_FragColor.a=0.8;}if(m_texCoord.y<=0.5){}}}';


/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.tilelayer.shader.Fragment.SOURCE = goog.DEBUG ?
    ol.renderer.webgl.tilelayer.shader.Fragment.DEBUG_SOURCE :
    ol.renderer.webgl.tilelayer.shader.Fragment.OPTIMIZED_SOURCE;



/**
 * @constructor
 * @extends {ol.webgl.shader.Vertex}
 */
ol.renderer.webgl.tilelayer.shader.Vertex = function() {
  goog.base(this, ol.renderer.webgl.tilelayer.shader.Vertex.SOURCE);
};
goog.inherits(ol.renderer.webgl.tilelayer.shader.Vertex, ol.webgl.shader.Vertex);
goog.addSingletonGetter(ol.renderer.webgl.tilelayer.shader.Vertex);


/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.tilelayer.shader.Vertex.DEBUG_SOURCE = '\n// texture with encoded elevation values\nuniform sampler2D u_texture;\n\n// length of one tile in meter at equator\nuniform float u_tileSizeM;\n\n// temporary values for transfer to fragment shader\nvarying vec2 v_texCoord;\n\nfloat decodeElevation(in vec4 colorChannels) {\n\t// decode input data values\n \tfloat elevationM = ((colorChannels.r*255.0 + (colorChannels.g*255.0)*256.0)-11000.0)/10.0;\n    return elevationM;\n}\n\n\n// vertex coordinates for computed mesh\nattribute vec2 a_position;\n\n// open layers tile structure\nuniform vec4 u_tileOffset;\n\n// current scale factor for plan oblique rendering\nuniform vec2 u_scaleFactor;\n\nvoid main(void) { \n\n\t// Orientation of coordinate system in vertex shader:\n\t// y\n\t// ^ \n\t// |\n\t// |\n\t// ------>\tx\n\n    // pass current vertex coordinates to fragment shader\n    v_texCoord = a_position;\n    \n    // compute y-flipped texture coordinates for further processing in fragment-shader\n    v_texCoord.y = 1.0 - v_texCoord.y;\n \n    // read and decode elevation for current vertex\n    float absElevation = decodeElevation(texture2D(u_texture, v_texCoord.xy));\n    \n    // shift vertex positions by given scale factor (dependend of the plan oblique inclination)\n    // direction of shift is always the top of the screen so it has to be adapted when the map view is rotated\n    vec4 vertexPosition = vec4((a_position+(absElevation * u_scaleFactor.xy) / u_tileSizeM) * u_tileOffset.xy + u_tileOffset.zw, absElevation/u_tileSizeM, 1.0);\n\n\tgl_Position = vertexPosition;\n}\n\n';


/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.tilelayer.shader.Vertex.OPTIMIZED_SOURCE = 'uniform sampler2D a;uniform float b;varying vec2 c;float decodeElevation(in vec4 colorChannels){float elevationM=((colorChannels.r*255.0+(colorChannels.g*255.0)*256.0)-11000.0)/10.0;return elevationM;}attribute vec2 d;uniform vec4 e;uniform vec2 f;void main(void){c=d;c.y=1.0-c.y;float absElevation=decodeElevation(texture2D(a,c.xy));vec4 vertexPosition=vec4((d+(absElevation*f.xy)/b)*e.xy+e.zw,absElevation/b,1.0);gl_Position=vertexPosition;}';


/**
 * @const
 * @type {string}
 */
ol.renderer.webgl.tilelayer.shader.Vertex.SOURCE = goog.DEBUG ?
    ol.renderer.webgl.tilelayer.shader.Vertex.DEBUG_SOURCE :
    ol.renderer.webgl.tilelayer.shader.Vertex.OPTIMIZED_SOURCE;



/**
 * @constructor
 * @param {WebGLRenderingContext} gl GL.
 * @param {WebGLProgram} program Program.
 */
ol.renderer.webgl.tilelayer.shader.Locations = function(gl, program) {

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_colorRamp = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_colorRamp' : 'g');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_colorScale = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_colorScale' : 'h');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_hillShading = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_hillShading' : 'j');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_light = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_light' : 'k');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_meshResolution = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_meshResolution' : 'l');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_scaleFactor = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_scaleFactor' : 'f');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_testing = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_testing' : 'm');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_texture = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_texture' : 'a');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_tileOffset = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_tileOffset' : 'e');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_tileSizeM = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_tileSizeM' : 'b');

  /**
   * @type {WebGLUniformLocation}
   */
  this.u_waterBodies = gl.getUniformLocation(
      program, goog.DEBUG ? 'u_waterBodies' : 'i');

  /**
   * @type {number}
   */
  this.a_position = gl.getAttribLocation(
      program, goog.DEBUG ? 'a_position' : 'd');
};