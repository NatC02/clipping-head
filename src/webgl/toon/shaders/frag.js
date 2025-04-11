const frag = `
#define TOON

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
uniform float time;
uniform float threshold;
uniform vec3 baseColor;
uniform vec3 shadeColor;

float remap(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

float cremap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
    return clamp(remap(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}


varying vec3 vPositionW;
varying vec3 vNormalW;

float exponentialInOut(float t) {
  return t == 0.0 || t == 1.0
    ? t
    : t < 0.5
      ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
      : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
}

#include <common>
#include <packing>

#include <uv_pars_fragment>

#include <map_pars_fragment>

#include <alphahash_pars_fragment>

#include <lightmap_pars_fragment>

#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif

vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );

	#ifdef USE_GRADIENTMAP

		return texture2D( gradientMap, coord ).rgb;

	#else

		float t = threshold;
		vec3 g = vec3(1.0);
		if( coord.x < t ) {
			float resolution = 0.001;
			vec2 uv = gl_FragCoord.xy + time;
			vec2 lowresxy = vec2(
				floor(uv.x / resolution),
				floor(uv.y / resolution)
			);
			float gradient = cremap(1.0 - coord.x, 1.0 - threshold, 1.0, 0.0, 1.0);
			gradient = exponentialInOut(gradient);
			float noiseAmount = gradient;
			float n = step(noiseAmount, rand(lowresxy));
            g = vec3(n);
		}
		return g;

	#endif
}

#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>

varying vec3 vViewPosition;

struct ToonMaterial {
	vec3 diffuseColor;
};

void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {

	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;

    reflectedLight.directDiffuse += irradiance;

}

void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {

	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

}

#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon

#include <shadowmap_pars_fragment>

#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {
	#include <clipping_planes_fragment>

	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

	#include <logdepthbuf_fragment>
	#include <map_fragment>
    diffuseColor.rgb = pow(diffuseColor.rgb, vec3(0.8));

    #include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>

	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	vec3 outgoingLight = mix(shadeColor, baseColor, saturate(reflectedLight.directDiffuse));

	#include <opaque_fragment>
  
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

    #include <colorspace_fragment>
}
`;
export default frag;