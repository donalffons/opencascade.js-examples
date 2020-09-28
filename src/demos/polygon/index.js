import { initOpenCascade } from "opencascade.js";
import { setupThreeJSViewport, addShapeToScene } from '../bottle - basic/library';
import { makePolygon } from './library';

const scene = setupThreeJSViewport();

initOpenCascade().then(oc => oc.ready).then(async openCascade => {
  await addShapeToScene(openCascade, makePolygon(openCascade), scene); 
});
