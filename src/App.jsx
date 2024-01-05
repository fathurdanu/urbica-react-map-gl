import React, { Component, useEffect, useRef, useState } from "react";
import MapGL from "@urbica/react-map-gl";
import mapboxgl from "mapbox-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import Stats from "three/examples/jsm/libs/stats.module";

import { GUI } from "https://threejs.org/examples/jsm/libs/lil-gui.module.min.js";
import useArrows from "./hooks/useArrows";

const accessToken = process.env.REACT_APP_ACCESS_TOKEN;
const minZoom = 12;
const ds = 0.01;
const api = {
  buildings: true,
  acceleration: 5,
  inertia: 3,
};

function App() {
  const _map = useRef();
  const mapStyle =
    "https://api.maptiler.com/maps/streets/style.json?key=K156TFZjIQmhD3HPG1gE";
  const [lng, setLng] = useState(107.548529);
  const [lat, setLang] = useState(-6.973064);
  const [viewport, setViewport] = useState({
    latitude: lat,
    longitude: lng,
    zoom: 30,
  });
  const [_customLayer, setCustomlayer] = useState(null);
  const [gui, set_gui] = useState(new GUI());
  const [stats, set_stats] = useState(new Stats());
  // const { w, a, s, d, handle_keypress } = useArrows();

  let w = false;
  let a = false;
  let s = false;
  let d = false;

  let speed = 0.0;
  let velocity = 0.0;

  // const [velocity, set_velocity] = useState(0.0);
  // const [speed, set_speed] = useState(0.0);
  let car =
    // useEffect(() => {
    //   console.log(w,a,s,d);
    // }, [w,a,s,d]);

    useEffect(() => {
      const modelOrigin = [lng, lat];
      const modelAltitude = 0;
      const modelRotate = [Math.PI / 2, 0, 0];

      const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
      );

      // transformation parameters to position, rotate and scale the 3D model onto the map
      const modelTransform = {
        translateX: modelAsMercatorCoordinate.x,
        translateY: modelAsMercatorCoordinate.y,
        translateZ: modelAsMercatorCoordinate.z,
        rotateX: modelRotate[0],
        rotateY: modelRotate[1],
        rotateZ: modelRotate[2],
        /* Since the 3D model is in real world meters, a scale transform needs to be
         * applied since the CustomLayerInterface expects units in MercatorCoordinates.
         */
        scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits(),
      };

      // configuration of the custom layer for a 3D model per the CustomLayerInterface
      const customLayer = {
        id: "3d-model",
        type: "custom",
        renderingMode: "3d",
        onAdd: function (map, gl) {
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();
          const directionalLight = new THREE.DirectionalLight(0xffffff);
          directionalLight.position.set(0, -70, 100).normalize();
          this.scene.add(directionalLight);

          const directionalLight2 = new THREE.DirectionalLight(0xffffff);
          directionalLight2.position.set(0, 70, 100).normalize();
          this.scene.add(directionalLight2);

          const loader = new GLTFLoader();
          loader.load("./3d_models/car.gltf", (gltf) => {
            car = gltf.scene;
            console.log(car);
            this.scene.add(gltf.scene);
          });
          this.map = map;

          this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
          });

          this.renderer.autoClear = false;

          init();
        },
        render: function (gl, matrix) {
          const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            modelTransform.rotateX
          );
          const rotationY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            modelTransform.rotateY
          );
          const rotationZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            modelTransform.rotateZ
          );

          const m = new THREE.Matrix4().fromArray(matrix);
          const l = new THREE.Matrix4()
            .makeTranslation(
              modelTransform.translateX,
              modelTransform.translateY,
              modelTransform.translateZ
            )
            .scale(
              new THREE.Vector3(
                modelTransform.scale,
                -modelTransform.scale,
                modelTransform.scale
              )
            )
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);

          this.camera.projectionMatrix = m.multiply(l);
          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
          this.map.triggerRepaint();
        },
      };
      setCustomlayer(customLayer);
    }, []);

  const handle_keypress = (arrow, value) => {
    if (arrow === "w") {
      w = value;
    } else if (arrow === "a") {
      a = value;
    } else if (arrow === "s") {
      s = value;
    } else if (arrow === "d") {
      d = value;
    }
  };

  const easing = (t) => {
    return t * (2 - t);
  };

  const init = () => {
    _map.current._map.getContainer().appendChild(stats.dom);

    document.body.addEventListener("keydown", function (e) {
      const key = e.code.replace("Key", "").toLowerCase();
      handle_keypress(key, true);
    });

    document.body.addEventListener("keyup", function (e) {
      const key = e.code.replace("Key", "").toLowerCase();
      handle_keypress(key, false);
    });

    animate();

    // this will define if there's a fixed zoom level for the model
    gui.add(api, "buildings").name("buildings").onChange(changeGui);
    gui.add(api, "acceleration", 1, 10).step(0.5);
    gui.add(api, "inertia", 1, 5).step(0.5);
  };

  const changeGui = () => {
    let l = "3d-buildings";
    if (api.buildings) {
      if (!api.getLayer(l)) {
        api.addLayer(createCompositeLayer(l));
      }
    } else {
      if (api.getLayer(l)) {
        api.removeLayer(l);
      }
    }

    this.scene.map.repaint = true;
  };

  // const animate = () => {
  //   requestAnimationFrame(animate);
  //   stats.update();

  //   if (!(w || s)) {
  //     if (velocity > 0) {
  //       speed = -api.inertia * ds;
  //     } else if (velocity < 0) {
  //       speed = api.inertia * ds;
  //     }
  //     if (velocity > -0.0008 && velocity < 0.0008) {
  //       speed = 0.0;
  //       velocity = 0.0;
  //       return;
  //     }
  //   }

  //   if (w) {
  //     speed = api.acceleration * ds;
  //   } else if (s) {
  //     speed = -api.acceleration * ds;
  //   }

  //   velocity = velocity + ((speed - velocity) * api.acceleration * ds);
  //   if (speed == 0.0) {
  //     velocity = 0.0;
  //     return;
  //   }

  //   const vector3 = new THREE.Vector3(0, -velocity, 0)
  //   car.position.setX(vector3.x)
  //   car.position.setY(vector3.y)
  //   car.position.setZ(vector3.z)
  //   console.log(car.position)
  //   // car.set({ worldTranslate: new THREE.Vector3(0, -velocity, 0) });

  //   let options = {
  //     center: car.coordinates,
  //     bearing: _map.current._map.getBearing(),
  //     easing: easing,
  //   };

  //   function toDeg(rad) {
  //     return (rad / Math.PI) * 180;
  //   }

  //   function toRad(deg) {
  //     return (deg * Math.PI) / 180;
  //   }

  //   let deg = 1;
  //   let rad = toRad(deg);
  //   let zAxis = new THREE.Vector3(0, 0, 1);

  //   if (a || d) {
  //     rad *= d ? -1 : 1;
  //     console.log([zAxis, car.rotation.z + rad])
  //     car.set({ quaternion: [zAxis, car.rotation.z + rad] });
  //     options.bearing = -toDeg(car.rotation.z);
  //   }

  //   _map.current._map.jumpTo(options);
  //   // console.log(_map.current)
  //   // this.scene.map.update = true;
  // };

  const animate = () => {
    requestAnimationFrame(animate);
    stats.update();

    if (!(w || s)) {
      if (velocity > 0) {
        speed = 0.01;
      } else if (velocity < 0) {
        speed = -0.01;
      }
      if (velocity > -0.0008 && velocity < 0.0008) {
        speed = 0.0;
        velocity = 0.0;
        return;
      }
    }

    if (w) {
      speed = 0.01;
    } else if (s) {
      speed = -0.01;
    }

    velocity += (speed - velocity) * api.acceleration * ds;
    if (speed == 0.0) {
      velocity = 0.0;
      return;
    }

    // sampai di sini
    const vector3 = new THREE.Vector3(0, -velocity, 0);
    car.position.setX(car.position.x + vector3.x);
    car.position.setY(car.position.y + vector3.y);
    car.position.setZ(car.position.z + vector3.z);
    console.log(car.position);
    // car.set({ worldTranslate: new THREE.Vector3(0, -velocity, 0) });

    let options = {
      center: car.coordinates,
      bearing: _map.current._map.getBearing(),
      easing: easing,
    };

    function toDeg(rad) {
      return (rad / Math.PI) * 180;
    }

    function toRad(deg) {
      return (deg * Math.PI) / 180;
    }

    let deg = 1;
    let rad = toRad(deg);
    let zAxis = new THREE.Vector3(0, 0, 1);

    if (a || d) {
      rad *= d ? -1 : 1;
      console.log([zAxis, car.rotation.z + rad]);
      car.set({ quaternion: [zAxis, car.rotation.z + rad] });
      options.bearing = -toDeg(car.rotation.z);
    }

    _map.current._map.jumpTo(options);
    // console.log(_map.current)
    // this.scene.map.update = true;
  };

  const createCompositeLayer = (layerId) => {
    let layer = {
      id: layerId,
      source: "composite",
      "source-layer": "building",
      filter: ["==", "extrude", "true"],
      type: "fill-extrusion",
      minzoom: minZoom,
      paint: {
        "fill-extrusion-color": [
          "case",
          ["boolean", ["feature-state", "select"], false],
          "red",
          ["boolean", ["feature-state", "hover"], false],
          "lightblue",
          "#aaa",
        ],

        // use an 'interpolate' expression to add a smooth transition effect to the
        // buildings as the user zooms in
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          minZoom,
          0,
          minZoom + 0.05,
          ["get", "height"],
        ],
        "fill-extrusion-base": [
          "interpolate",
          ["linear"],
          ["zoom"],
          minZoom,
          0,
          minZoom + 0.05,
          ["get", "min_height"],
        ],
        "fill-extrusion-opacity": 0.9,
      },
    };
    return layer;
  };

  return (
    <div id="main_container">
      <MapGL
        id="urbica-map"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
        }}
        onLoad={(map) => {
          if (map) {
            map.target.addLayer(_customLayer);
          }
        }}
        fog={{
          range: [-5, 20],
          color: "white",
        }}
        pitch={45}
        bearing={-90}
        mapStyle={mapStyle}
        accessToken={accessToken}
        latitude={viewport.latitude}
        longitude={viewport.longitude}
        zoom={viewport.zoom}
        onViewportChange={(e) => {
          return;
        }}
        attributionControl={false}
        ref={_map}
      ></MapGL>
    </div>
  );
}

export default App;
