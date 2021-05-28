import {
  initOpenCascade,
  ocCore,
  TKGeomAlgo,
  TKTopAlgo,
  TKShHealing,
  TKMesh,
  TKService,
   TKV3d,
} from "opencascade.js";
import { setupThreeJSViewport, addShapeToScene } from '../bottle - basic/library';
import { makePolygon } from './library';

const scene = setupThreeJSViewport();

initOpenCascade({
  libs: [
    ocCore,
    TKGeomAlgo,
    TKTopAlgo,
    TKShHealing,
    TKMesh,
    TKService,
    TKV3d,
  ]
}).then(openCascade => {
  addShapeToScene(openCascade, makePolygon(openCascade), scene); 
});
