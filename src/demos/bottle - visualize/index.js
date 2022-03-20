import initOpenCascade from "opencascade.js";
import {
  Color,
  Mesh,
  MeshStandardMaterial,
  Group
} from 'three';
import { makeBottle, loadSTEPorIGES, setupThreeJSViewport } from '../bottle - basic/library';
import visualize from '../../common/visualize'

const addShapeToScene = async (openCascade, shape, scene) => {
  const objectMat = new MeshStandardMaterial({
    color: new Color(0.9, 0.9, 0.9)
  });

  let geometries = visualize(openCascade, shape);

  let group = new Group();
  geometries.forEach(geometry => {
    group.add(new Mesh(geometry, objectMat));
  });

  group.name = "shape";
  group.rotation.x = -Math.PI / 2;
  scene.add(group);
}

const scene = setupThreeJSViewport();

initOpenCascade().then(openCascade => {
  // Allow users to upload STEP Files by either "File Selector" or "Drag and Drop".
  document.getElementById("step-file").addEventListener(
    'input', async (event) => { await loadSTEPorIGES(openCascade, event.srcElement.files[0], addShapeToScene, scene); });
  document.body.addEventListener("dragenter", (e) => { e.stopPropagation(); e.preventDefault(); }, false);
  document.body.addEventListener("dragover", (e) => { e.stopPropagation(); e.preventDefault(); }, false);
  document.body.addEventListener("drop", (e) => {
    e.stopPropagation(); e.preventDefault();
    if (e.dataTransfer.files[0]) { loadSTEPorIGES(openCascade, e.dataTransfer.files[0], addShapeToScene, scene); }
  }, false);
  let width = 50, height = 70, thickness = 30;
  let bottle = makeBottle(openCascade, width, height, thickness);
  addShapeToScene(openCascade, bottle, scene);

  /*
    //to test memory leak for visualize function
    let t0 = performance.now()
    let i = 0
    while(i < 1000000){
      //scene.remove(scene.getObjectByName("shape"));
      i ++
      await addShapeToScene(openCascade, bottle, scene);
      if(i % 10 === 0)
        console.log('i = ', i)
    }
    let t1 = performance.now()
    console.log('cost:', (t1 - t0)*0.001, ' seconds')
  */

  window.changeSliderWidth = value => {
    width = parseInt(value);
    scene.remove(scene.getObjectByName("shape"));
    let bottle = makeBottle(openCascade, width, height, thickness);
    const now = Date.now();
    addShapeToScene(openCascade, bottle, scene);
    console.log(Date.now() - now)
  }
  window.changeSliderHeight = value => {
    height = parseInt(value);
    scene.remove(scene.getObjectByName("shape"));
    let bottle = makeBottle(openCascade, width, height, thickness);
    addShapeToScene(openCascade, bottle, scene);
  }
  window.changeSliderThickness = value => {
    thickness = parseInt(value);
    scene.remove(scene.getObjectByName("shape"));
    let bottle = makeBottle(openCascade, width, height, thickness);
    addShapeToScene(openCascade, bottle, scene);
  }
});
