import {
  AmbientLight,
  Color,
  DirectionalLight,
  Geometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { initOpenCascade } from "opencascade.js";

import openCascadeHelper from './openCascadeHelper';

var scene = new Scene();
var camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer = new WebGLRenderer();
const viewport = document.getElementById("viewport");
const viewportRect = viewport.getBoundingClientRect();
renderer.setSize(viewportRect.width, viewportRect.height);
viewport.appendChild(renderer.domElement);

const light = new AmbientLight(0x404040);
scene.add(light);
const directionalLight = new DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0.5, 0.5, 0.5);
scene.add(directionalLight);

camera.position.set(0, 50, 100);

const controls = new OrbitControls(camera, renderer.domElement);
controls.screenSpacePanning = true;
controls.target.set(0, 50, 0);
controls.update();

function animate() {
  requestAnimationFrame(animate);
	renderer.render(scene, camera);
}
animate();

const MakeBottle = (openCascade, myWidth, myHeight, myThickness) => {
  // Profile : Define Support Points
  const aPnt1 = new openCascade.gp_Pnt(-myWidth / 2., 0, 0);        
  const aPnt2 = new openCascade.gp_Pnt(-myWidth / 2., -myThickness / 4., 0);
  const aPnt3 = new openCascade.gp_Pnt(0, -myThickness / 2., 0);
  const aPnt4 = new openCascade.gp_Pnt(myWidth / 2., -myThickness / 4., 0);
  const aPnt5 = new openCascade.gp_Pnt(myWidth / 2., 0, 0);
  // // Profile : Define the Geometry
  const anArcOfCircle = new openCascade.GC_MakeArcOfCircle(aPnt2, aPnt3, aPnt4);
  const aSegment1 = new openCascade.GC_MakeSegment(aPnt1, aPnt2);
  const aSegment2 = new openCascade.GC_MakeSegment(aPnt4, aPnt5);
  // // Profile : Define the Topology
  const anEdge1 = new openCascade.BRepBuilderAPI_MakeEdge(aSegment1.Value());
  const anEdge2 = new openCascade.BRepBuilderAPI_MakeEdge(anArcOfCircle.Value());
  const anEdge3 = new openCascade.BRepBuilderAPI_MakeEdge(aSegment2.Value());
  const aWire  = new openCascade.BRepBuilderAPI_MakeWire(anEdge1.Edge(), anEdge2.Edge(), anEdge3.Edge());
  // // Complete Profile
  const xAxis = openCascade.gp.prototype.OX();
  const aTrsf = new openCascade.gp_Trsf();
  aTrsf.SetMirror(xAxis);
  const aBRepTrsf = new openCascade.BRepBuilderAPI_Transform(aWire.Wire(), aTrsf);
  const aMirroredShape = aBRepTrsf.Shape();
  const aMirroredWire = openCascade.TopoDS.prototype.Wire(aMirroredShape);
  const mkWire = new openCascade.BRepBuilderAPI_MakeWire();
  mkWire.Add(aWire.Wire());
  mkWire.Add(aMirroredWire);
  const myWireProfile = mkWire.Wire();
  // Body : Prism the Profile
  const myFaceProfile = new openCascade.BRepBuilderAPI_MakeFace(myWireProfile);
  const aPrismVec = new openCascade.gp_Vec(0, 0, myHeight);
  let myBody = new openCascade.BRepPrimAPI_MakePrism(myFaceProfile.Face(), aPrismVec);
  // Body : Apply Fillets
  const mkFillet = new openCascade.BRepFilletAPI_MakeFillet(myBody.Shape());
  const anEdgeExplorer = new openCascade.TopExp_Explorer(myBody.Shape(), openCascade.TopAbs_EDGE);
  while(anEdgeExplorer.More()) {
    const anEdge = openCascade.TopoDS.prototype.Edge(anEdgeExplorer.Current());
    // Add edge to fillet algorithm
    mkFillet.Add(myThickness / 12., anEdge);
    anEdgeExplorer.Next();
  }
  myBody = mkFillet.Shape();
  // Body : Add the Neck
  const neckLocation = new openCascade.gp_Pnt(0, 0, myHeight);
  const neckAxis = openCascade.gp.prototype.DZ();
  const neckAx2 = new openCascade.gp_Ax2(neckLocation, neckAxis);
  const myNeckRadius = myThickness / 4.;
  const myNeckHeight = myHeight / 10.;
  const MKCylinder = new openCascade.BRepPrimAPI_MakeCylinder(neckAx2, myNeckRadius, myNeckHeight);
  const myNeck = MKCylinder.Shape();
  myBody = new openCascade.BRepAlgoAPI_Fuse(myBody, myNeck);
  // Body : Create a Hollowed Solid
  let faceToRemove;
  let zMax = -1;
  const aFaceExplorer = new openCascade.TopExp_Explorer(myBody.Shape(), openCascade.TopAbs_FACE);
  for(; aFaceExplorer.More(); aFaceExplorer.Next()) {
    const aFace = openCascade.TopoDS.prototype.Face(aFaceExplorer.Current());
    // Check if <aFace> is the top face of the bottle's neck 
    const aSurface = openCascade.BRep_Tool.prototype.Surface(aFace);
    if(aSurface.get().DynamicType().get().Name() === "Geom_Plane") {
      const aPlane = new openCascade.Handle_Geom_Plane(aSurface.get()).get();
      const aPnt = aPlane.Location();
      const aZ = aPnt.Z();
      if(aZ > zMax) {
        zMax = aZ;
        faceToRemove = new openCascade.TopExp_Explorer(aFace, openCascade.TopAbs_FACE).Current();
      }
    }
  }
  const facesToRemove = new openCascade.TopTools_ListOfShape();
  facesToRemove.Append(faceToRemove);
  const s = myBody.Shape();
  myBody = new openCascade.BRepOffsetAPI_MakeThickSolid();
  myBody.MakeThickSolidByJoin(s, facesToRemove, -myThickness / 50, 1.e-3);
  // // Threading : Create Surfaces
  // const aCyl1 = new openCascade.Geom_CylindricalSurface(neckAx2, myNeckRadius * 0.99);
  // const aCyl2 = new openCascade.Geom_CylindricalSurface(neckAx2, myNeckRadius * 1.05);
  // // Threading : Define 2D Curves
  // const aPnt = new openCascade.gp_Pnt2d(2. * Math.PI, myNeckHeight / 2.);
  // const aDir = new openCascade.gp_Dir2d(2. * Math.PI, myNeckHeight / 4.);
  // const anAx2d = new openCascade.gp_Ax2d(aPnt, aDir);
  // const aMajor = 2. * Math.PI;
  // const aMinor = myNeckHeight / 10;
  // const anEllipse1 = new openCascade.Geom2d_Ellipse(anAx2d, aMajor, aMinor);
  // const anEllipse2 = new openCascade.Geom2d_Ellipse(anAx2d, aMajor, aMinor / 4);
  // const anArc1 = new openCascade.Geom2d_TrimmedCurve(new openCascade.Handle_Geom2d_Curve(anEllipse1), 0, Math.PI);
  // const anArc2 = new openCascade.Geom2d_TrimmedCurve(new openCascade.Handle_Geom2d_Curve(anEllipse2), 0, Math.PI);
  // const anEllipsePnt1 = anEllipse1.Value(0);
  // const anEllipsePnt2 = anEllipse1.Value(Math.PI);
  // const aSegment = new openCascade.GCE2d_MakeSegment(anEllipsePnt1, anEllipsePnt2);
  // Threading : Build Edges and Wires
  // const anEdge1OnSurf1 = new openCascade.BRepBuilderAPI_MakeEdge(anArc1, aCyl1);
  // TopoDS_Edge anEdge2OnSurf1 = BRepBuilderAPI_MakeEdge(aSegment, aCyl1);
  // TopoDS_Edge anEdge1OnSurf2 = BRepBuilderAPI_MakeEdge(anArc2, aCyl2);
  // TopoDS_Edge anEdge2OnSurf2 = BRepBuilderAPI_MakeEdge(aSegment, aCyl2);
  // TopoDS_Wire threadingWire1 = BRepBuilderAPI_MakeWire(anEdge1OnSurf1, anEdge2OnSurf1);
  // TopoDS_Wire threadingWire2 = BRepBuilderAPI_MakeWire(anEdge1OnSurf2, anEdge2OnSurf2);
  // BRepLib::BuildCurves3d(threadingWire1);
  // BRepLib::BuildCurves3d(threadingWire2);
  // BRepLib::BuildCurves3d(threadingWire1);
  // BRepLib::BuildCurves3d(threadingWire2);
  // // Create Threading 
  // BRepOffsetAPI_ThruSections aTool(Standard_True);
  // aTool.AddWire(threadingWire1);
  // aTool.AddWire(threadingWire2);
  // aTool.CheckCompatibility(Standard_False);
  // TopoDS_Shape myThreading = aTool.Shape();
  
  // Building the Resulting Compound 
  const aRes = new openCascade.TopoDS_Compound();
  const aBuilder = new openCascade.BRep_Builder();
  aBuilder.MakeCompound(aRes);
  aBuilder.Add(aRes, myBody.Shape());
  // aBuilder.Add(aRes, myThreading);
  return aRes;
}

const addBottle = async (openCascade, width, height, thickness) => {
  const bottle = MakeBottle(openCascade, width, height, thickness);

  openCascadeHelper.setOpenCascade(openCascade);
  const facelist = await openCascadeHelper.tessellate(bottle);
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
  object.name = "bottle";
  object.rotation.x = -Math.PI / 2;
  scene.add(object);
}

initOpenCascade().then(async openCascade => {
  let width = 50, height = 70, thickness = 30;
  await addBottle(openCascade, width, height, thickness);
  
  window.changeSliderWidth = value => {
    width = value;
    scene.remove(scene.getObjectByName("bottle"));
    addBottle(openCascade, width, height, thickness);
  }
  window.changeSliderHeight = value => {
    height = value;
    scene.remove(scene.getObjectByName("bottle"));
    addBottle(openCascade, width, height, thickness);
  }
  window.changeSliderThickness = value => {
    thickness = value;
    scene.remove(scene.getObjectByName("bottle"));
    addBottle(openCascade, width, height, thickness);
  }
});
