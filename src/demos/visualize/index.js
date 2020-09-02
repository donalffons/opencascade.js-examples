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
  Group
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { initOpenCascade } from "opencascade.js";
import visualize from '../../common/visualize'

var scene = new Scene();
var camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer = new WebGLRenderer({antialias: true});
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

  // Profile : Define the Geometry
  const anArcOfCircle = new openCascade.GC_MakeArcOfCircle(aPnt2, aPnt3, aPnt4);
  const aSegment1 = new openCascade.GC_MakeSegment(aPnt1, aPnt2);
  const aSegment2 = new openCascade.GC_MakeSegment(aPnt4, aPnt5);

  // Profile : Define the Topology
  const anEdge1 = new openCascade.BRepBuilderAPI_MakeEdge(aSegment1.Value());
  const anEdge2 = new openCascade.BRepBuilderAPI_MakeEdge(anArcOfCircle.Value());
  const anEdge3 = new openCascade.BRepBuilderAPI_MakeEdge(aSegment2.Value());
  const aWire  = new openCascade.BRepBuilderAPI_MakeWire(anEdge1.Edge(), anEdge2.Edge(), anEdge3.Edge());

  // Complete Profile
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
  // Threading : Create Surfaces
  const aCyl1 = new openCascade.Geom_CylindricalSurface(neckAx2, myNeckRadius * 0.99);
  const aCyl2 = new openCascade.Geom_CylindricalSurface(neckAx2, myNeckRadius * 1.05);

  // Threading : Define 2D Curves
  const aPnt = new openCascade.gp_Pnt2d(2. * Math.PI, myNeckHeight / 2.);
  const aDir = new openCascade.gp_Dir2d(2. * Math.PI, myNeckHeight / 4.);
  const anAx2d = new openCascade.gp_Ax2d(aPnt, aDir);

  const aMajor = 2. * Math.PI;
  const aMinor = myNeckHeight / 10;

  const anEllipse1 = new openCascade.Geom2d_Ellipse(anAx2d, aMajor, aMinor);
  const anEllipse2 = new openCascade.Geom2d_Ellipse(anAx2d, aMajor, aMinor / 4);
  const anArc1 = new openCascade.Geom2d_TrimmedCurve(new openCascade.Handle_Geom2d_Curve(anEllipse1), 0, Math.PI);
  const anArc2 = new openCascade.Geom2d_TrimmedCurve(new openCascade.Handle_Geom2d_Curve(anEllipse2), 0, Math.PI);
  const tmp1 = anEllipse1.Value(0);
  const anEllipsePnt1 = new openCascade.gp_Pnt2d(tmp1.X(), tmp1.Y());
  const tmp2 = anEllipse1.Value(Math.PI);
  const anEllipsePnt2 = new openCascade.gp_Pnt2d(tmp2.X(), tmp2.Y());

  const aSegment = new openCascade.GCE2d_MakeSegment(anEllipsePnt1, anEllipsePnt2);
  // Threading : Build Edges and Wires
  const anEdge1OnSurf1 = new openCascade.BRepBuilderAPI_MakeEdge(new openCascade.Handle_Geom2d_Curve(anArc1), new openCascade.Handle_Geom_Surface(aCyl1));
  const anEdge2OnSurf1 = new openCascade.BRepBuilderAPI_MakeEdge(aSegment.Value(), new openCascade.Handle_Geom_Surface(aCyl1));
  const anEdge1OnSurf2 = new openCascade.BRepBuilderAPI_MakeEdge(new openCascade.Handle_Geom2d_Curve(anArc2), new openCascade.Handle_Geom_Surface(aCyl2));
  const anEdge2OnSurf2 = new openCascade.BRepBuilderAPI_MakeEdge(aSegment.Value(), new openCascade.Handle_Geom_Surface(aCyl2));
  const threadingWire1 = new openCascade.BRepBuilderAPI_MakeWire(anEdge1OnSurf1.Edge(), anEdge2OnSurf1.Edge());
  const threadingWire2 = new openCascade.BRepBuilderAPI_MakeWire(anEdge1OnSurf2.Edge(), anEdge2OnSurf2.Edge());
  openCascade.BRepLib.prototype.BuildCurves3d(threadingWire1.Wire());
  openCascade.BRepLib.prototype.BuildCurves3d(threadingWire2.Wire());
  openCascade.BRepLib.prototype.BuildCurves3d(threadingWire1.Wire());
  openCascade.BRepLib.prototype.BuildCurves3d(threadingWire2.Wire());

  // Create Threading 
  const aTool = new openCascade.BRepOffsetAPI_ThruSections(true);
  aTool.AddWire(threadingWire1.Wire());
  aTool.AddWire(threadingWire2.Wire());
  aTool.CheckCompatibility(false);

  const myThreading = aTool.Shape();
  
  // Building the Resulting Compound 
  const aRes = new openCascade.TopoDS_Compound();
  const aBuilder = new openCascade.BRep_Builder();
  aBuilder.MakeCompound(aRes);
  aBuilder.Add(aRes, myBody.Shape());
  aBuilder.Add(aRes, myThreading);
  
  return aRes;
}

const addShape = async (openCascade, shape) => {
  const objectMat = new MeshStandardMaterial({
    color: new Color(0.9, 0.9, 0.9)
  });
  let geometries = visualize(openCascade, shape)
  let group = new Group()
  geometries.forEach(geometry => {
    group.add(new Mesh(geometry, objectMat))

  })

  group.name = "shape";
  group.rotation.x = -Math.PI / 2;
  scene.add(group);
}

const loadFileAsync = async (file) => {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  })
}

const loadSTEPorIGES = async (openCascade, inputFile) => {
  await loadFileAsync(inputFile).then(async (fileText) => {
    const fileName = inputFile.name;
    // Writes the uploaded file to Emscripten's Virtual Filesystem
    openCascade.FS.createDataFile("/", fileName, fileText, true, true);

    // Choose the correct OpenCascade file parsers to read the CAD file
    var reader = null;
    if (fileName.endsWith(".step") || fileName.endsWith(".stp")) {
      reader = new openCascade.STEPControl_Reader();
    } else if (fileName.endsWith(".iges") || fileName.endsWith(".igs")) {
      reader = new openCascade.IGESControl_Reader();
    } else { console.error("opencascade.js can't parse this extension! (yet)"); }
    const readResult = reader.ReadFile(fileName);            // Read the file
    if (readResult === 1) {
      console.log(fileName + " loaded successfully!     Converting to OCC now...");
      const numRootsTransferred = reader.TransferRoots();    // Translate all transferable roots to OpenCascade
      const stepShape           = reader.OneShape();         // Obtain the results of translation in one OCCT shape
      console.log(fileName + " converted successfully!  Triangulating now...");

      // Out with the old, in with the new!
      scene.remove(scene.getObjectByName("shape"));
      await addShape(openCascade, stepShape);
      console.log(fileName + " triangulated and added to the scene!");

      // Remove the file when we're done (otherwise we run into errors on reupload)
      openCascade.FS.unlink("/" + fileName);
    } else {
      console.error("Something in OCCT went wrong trying to read " + fileName);
    }
  });
};

initOpenCascade().then(oc => oc.ready).then(async openCascade => {

  // Allow users to upload STEP Files by either "File Selector" or "Drag and Drop".
  document.getElementById("step-file").addEventListener(
    'input', async (event) => { await loadSTEPorIGES(openCascade, event.srcElement.files[0]); });
  document.body.addEventListener("dragenter", (e) => { e.stopPropagation(); e.preventDefault(); }, false);
  document.body.addEventListener("dragover",  (e) => { e.stopPropagation(); e.preventDefault(); }, false);
  document.body.addEventListener("drop",      (e) => { e.stopPropagation(); e.preventDefault();
    if (e.dataTransfer.files[0]) { loadSTEPorIGES(openCascade, e.dataTransfer.files[0]); }
  }, false);

  let width = 50, height = 70, thickness = 30;
  let bottle = MakeBottle(openCascade, width, height, thickness);
  await addShape(openCascade, bottle);
  
  window.changeSliderWidth = value => {
    width = value;
    scene.remove(scene.getObjectByName("shape"));
    let bottle = MakeBottle(openCascade, width, height, thickness);
    addShape(openCascade, bottle);
  }
  window.changeSliderHeight = value => {
    height = value;
    scene.remove(scene.getObjectByName("shape"));
    let bottle = MakeBottle(openCascade, width, height, thickness);
    addShape(openCascade, bottle);
  }
  window.changeSliderThickness = value => {
    thickness = value;
    scene.remove(scene.getObjectByName("shape"));
    let bottle = MakeBottle(openCascade, width, height, thickness);
    addShape(openCascade, bottle);
  }
});
