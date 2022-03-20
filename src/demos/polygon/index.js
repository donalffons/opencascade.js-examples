import initOpenCascade from "opencascade.js";
import { setupThreeJSViewport, addShapeToScene } from '../bottle - basic/library';
import { makePolygon } from './library';

const scene = setupThreeJSViewport();

initOpenCascade().then(openCascade => {
  addShapeToScene(openCascade, makePolygon(openCascade), scene);
});
