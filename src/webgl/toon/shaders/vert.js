const vert = `
#define TOON

varying vec3 vViewPosition;

#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>

#include <normal_pars_vertex>

#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

float cmap(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
    return clamp(map(oldValue, oldMin, oldMax, newMin, newMax), min(newMax, newMin), max(newMin, newMax));
}

uniform vec4 uvSprite;
uniform vec4 uvOrigin;

varying vec3 vPositionW;
varying vec3 vNormalW;

void main() {
	#include <uv_vertex>

#ifdef USE_MAP
  vMapUv.x = cmap(vMapUv.x, uvOrigin.x, uvOrigin.y, uvSprite.x, uvSprite.y);
  vMapUv.y = cmap(vMapUv.y, uvOrigin.z, uvOrigin.w, uvSprite.z, uvSprite.w);
#endif
#ifdef USE_NORMALMAP

  vNormalMapUv.x = cmap(vNormalMapUv.x, uvOrigin.x, uvOrigin.y, uvSprite.x, uvSprite.y);
  vNormalMapUv.y = cmap(vNormalMapUv.y, uvOrigin.z, uvOrigin.w, uvSprite.z, uvSprite.w);

#endif
    #include <batching_vertex>

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>

	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	vViewPosition = - mvPosition.xyz;

	#include <worldpos_vertex>
	#include <shadowmap_vertex>

	vPositionW = vec3( vec4( position, 1.0 ) * modelMatrix);
	vNormalW = normalize( vec3( vec4( normal, 0.0 ) * modelMatrix ) );
}
`
export default vert;