import { MeshToonMaterial, ShaderLib, Color } from "three";

import merge from "lodash.merge";

import vert from "./shaders/vert.js";
import frag from "./shaders/frag.js";

export default class CustomToonMaterial extends MeshToonMaterial {
  constructor(options = {}) {
    super();

    const { baseColor = "#000000", shadeColor = "#000000", ...parameters } = options;

    this.setValues(parameters);

    const baseColorValue = baseColor instanceof Color ? baseColor : new Color(baseColor);
    const shadeColorValue = shadeColor instanceof Color ? shadeColor : new Color(shadeColor);

    this.uniforms = merge(
      {
        time: {
          value: 0,
        },
        threshold: {
          value: 0.7,
        },
        baseColor: {
          value: baseColorValue
        },
        shadeColor: {
          value: shadeColorValue
        }
      },
      ShaderLib.phong.uniforms
    );

    this.vertexShader = vert;
    this.fragmentShader = frag;

    this.type = "ShaderMaterial";
  }

  updateColors({ baseColor, shadeColor } = {}) {
    if (baseColor && this.uniforms.baseColor) {
      this.uniforms.baseColor.value = 
        baseColor instanceof Color ? baseColor : new Color(baseColor);
    }
    
    if (shadeColor && this.uniforms.shadeColor) {
      this.uniforms.shadeColor.value = 
        shadeColor instanceof Color ? shadeColor : new Color(shadeColor);
    }
  }
}