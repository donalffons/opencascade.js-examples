import {
  Color,
  Geometry,
  Mesh,
  MeshStandardMaterial,
} from 'three';

import { initOpenCascade } from "opencascade.js";

import openCascadeHelper from '../../common/openCascadeHelper';

import { loadSTEPorIGES, makeBottle, setupThreeJSViewport } from './library';

const addShape = async (openCascade, shape, scene) => {
  openCascadeHelper.setOpenCascade(openCascade);
  const facelist = await openCascadeHelper.tessellate(shape);
  const [locVertexcoord, locNormalcoord, locTriIndices] = await openCascadeHelper.joinPrimitives(facelist);
  const tot_triangle_count = facelist.reduce((a,b) => a + b.number_of_triangles, 0);
  const [vertices, faces] = await openCascadeHelper.generateGeometry(tot_triangle_count, locVertexcoord, locNormalcoord, locTriIndices);

  const objectMat = new MeshStandardMaterial({
    color: new Color(0.9, 0.9, 0.9)
  });
  const geometry = new Geometry();
  geometry.vertices = vertices;
  geometry.faces = faces;
  const object = new Mesh(geometry, objectMat);
  object.name = "shape";
  object.rotation.x = -Math.PI / 2;
  scene.add(object);
}

const scene = setupThreeJSViewport();

initOpenCascade().then(oc => oc.ready).then(async openCascade => {
  // Allow users to upload STEP Files by either "File Selector" or "Drag and Drop".
  document.getElementById("step-file").addEventListener(
    'input', async (event) => { await loadSTEPorIGES(openCascade, event.srcElement.files[0], addShape, scene); });
  document.body.addEventListener("dragenter", (e) => { e.stopPropagation(); e.preventDefault(); }, false);
  document.body.addEventListener("dragover",  (e) => { e.stopPropagation(); e.preventDefault(); }, false);
  document.body.addEventListener("drop",      (e) => { e.stopPropagation(); e.preventDefault();
    if (e.dataTransfer.files[0]) { loadSTEPorIGES(openCascade, e.dataTransfer.files[0], addShape, scene); }
  }, false);

  let width = 50, height = 70, thickness = 30;
  let bottle = makeBottle(openCascade, width, height, thickness);
  await addShape(openCascade, bottle, scene);
  
  window.changeSliderWidth = value => {
    height = parseInt(value);
    scene.remove(scene.getObjectByName("shape"));
    let bottle = makeBottle(openCascade, width, height, thickness);
    addShape(openCascade, bottle, scene);
  }
  window.changeSliderHeight = value => {
    height = parseInt(value);
    scene.remove(scene.getObjectByName("shape"));
    let bottle = makeBottle(openCascade, width, height, thickness);
    addShape(openCascade, bottle, scene);
  }
  window.changeSliderThickness = value => {
    height = parseInt(value);
    scene.remove(scene.getObjectByName("shape"));
    let bottle = makeBottle(openCascade, width, height, thickness);
    addShape(openCascade, bottle, scene);
  }
});
