import {
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Color,
  Geometry,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import openCascadeHelper from '../../common/openCascadeHelper';

const loadFileAsync = (file) => {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  })
}

const loadSTEPorIGES = async (openCascade, inputFile, addFunction, scene) => {
  await loadFileAsync(inputFile).then(async (fileText) => {
    const fileType = (() => {
      switch (inputFile.name.toLowerCase().split(".").pop()) {
        case "step":
        case "stp":
          return "step";
        case "iges":
        case "igs":
          return "iges";
        default:
          return undefined;
      }
    })();
    // Writes the uploaded file to Emscripten's Virtual Filesystem
    openCascade.FS.createDataFile("/", `file.${fileType}`, fileText, true, true);

    // Choose the correct OpenCascade file parsers to read the CAD file
    var reader = null;
    if (fileType === "step") {
      reader = new openCascade.STEPControl_Reader_1();
    } else if (fileType === "iges") {
      reader = new openCascade.IGESControl_Reader_1();
    } else { console.error("opencascade.js can't parse this extension! (yet)"); }
    const readResult = reader.ReadFile(`file.${fileType}`);            // Read the file
    if (readResult === openCascade.IFSelect_ReturnStatus.IFSelect_RetDone) {
      console.log("file loaded successfully!     Converting to OCC now...");
      const numRootsTransferred = reader.TransferRoots(new openCascade.Message_ProgressRange_1());    // Translate all transferable roots to OpenCascade
      const stepShape = reader.OneShape();         // Obtain the results of translation in one OCCT shape
      console.log(inputFile.name + " converted successfully!  Triangulating now...");

      // Out with the old, in with the new!
      scene.remove(scene.getObjectByName("shape"));
      await addFunction(openCascade, stepShape, scene);
      console.log(inputFile.name + " triangulated and added to the scene!");

      // Remove the file when we're done (otherwise we run into errors on reupload)
      openCascade.FS.unlink(`/file.${fileType}`);
    } else {
      console.error("Something in OCCT went wrong trying to read " + inputFile.name);
    }
  });
};
export { loadSTEPorIGES };


const setupThreeJSViewport = () => {
  var scene = new Scene();
  var camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  var renderer = new WebGLRenderer({ antialias: true });
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
  return scene;
}
export { setupThreeJSViewport };

const makeBottle = (openCascade, myWidth, myHeight, myThickness) => {
  // Profile : Define Support Points
  const aPnt1 = new openCascade.gp_Pnt_3(-myWidth / 2., 0, 0);
  const aPnt2 = new openCascade.gp_Pnt_3(-myWidth / 2., -myThickness / 4., 0);
  const aPnt3 = new openCascade.gp_Pnt_3(0, -myThickness / 2., 0);
  const aPnt4 = new openCascade.gp_Pnt_3(myWidth / 2., -myThickness / 4., 0);
  const aPnt5 = new openCascade.gp_Pnt_3(myWidth / 2., 0, 0);

  // Profile : Define the Geometry
  const anArcOfCircle = new openCascade.GC_MakeArcOfCircle_4(aPnt2, aPnt3, aPnt4);
  const aSegment1 = new openCascade.GC_MakeSegment_1(aPnt1, aPnt2);
  const aSegment2 = new openCascade.GC_MakeSegment_1(aPnt4, aPnt5);

  // Profile : Define the Topology
  const anEdge1 = new openCascade.BRepBuilderAPI_MakeEdge_24(new openCascade.Handle_Geom_Curve_2(aSegment1.Value().get()));
  const anEdge2 = new openCascade.BRepBuilderAPI_MakeEdge_24(new openCascade.Handle_Geom_Curve_2(anArcOfCircle.Value().get()));
  const anEdge3 = new openCascade.BRepBuilderAPI_MakeEdge_24(new openCascade.Handle_Geom_Curve_2(aSegment2.Value().get()));
  const aWire = new openCascade.BRepBuilderAPI_MakeWire_4(anEdge1.Edge(), anEdge2.Edge(), anEdge3.Edge());

  // Complete Profile
  const xAxis = openCascade.gp.OX();
  const aTrsf = new openCascade.gp_Trsf_1();

  aTrsf.SetMirror_2(xAxis);
  const aBRepTrsf = new openCascade.BRepBuilderAPI_Transform_2(aWire.Wire(), aTrsf, false);
  const aMirroredShape = aBRepTrsf.Shape();

  const mkWire = new openCascade.BRepBuilderAPI_MakeWire_1();
  mkWire.Add_2(aWire.Wire());
  mkWire.Add_2(openCascade.TopoDS.Wire_1(aMirroredShape));
  const myWireProfile = mkWire.Wire();

  // Body : Prism the Profile
  const myFaceProfile = new openCascade.BRepBuilderAPI_MakeFace_15(myWireProfile, false);
  const aPrismVec = new openCascade.gp_Vec_4(0, 0, myHeight);
  let myBody = new openCascade.BRepPrimAPI_MakePrism_1(myFaceProfile.Face(), aPrismVec, false, true);

  // Body : Apply Fillets
  const mkFillet = new openCascade.BRepFilletAPI_MakeFillet(myBody.Shape(), openCascade.ChFi3d_FilletShape.ChFi3d_Rational);
  const anEdgeExplorer = new openCascade.TopExp_Explorer_2(myBody.Shape(), openCascade.TopAbs_ShapeEnum.TopAbs_EDGE, openCascade.TopAbs_ShapeEnum.TopAbs_SHAPE);
  while (anEdgeExplorer.More()) {
    const anEdge = openCascade.TopoDS.Edge_1(anEdgeExplorer.Current());
    // Add edge to fillet algorithm
    mkFillet.Add_2(myThickness / 12., anEdge);
    anEdgeExplorer.Next();
  }
  myBody = mkFillet.Shape();

  // Body : Add the Neck
  const neckLocation = new openCascade.gp_Pnt_3(0, 0, myHeight);
  const neckAxis = openCascade.gp.DZ();
  const neckAx2 = new openCascade.gp_Ax2_3(neckLocation, neckAxis);

  const myNeckRadius = myThickness / 4.;
  const myNeckHeight = myHeight / 10.;

  const MKCylinder = new openCascade.BRepPrimAPI_MakeCylinder_3(neckAx2, myNeckRadius, myNeckHeight);
  const myNeck = MKCylinder.Shape();

  myBody = new openCascade.BRepAlgoAPI_Fuse_3(myBody, myNeck, new openCascade.Message_ProgressRange_1());

  // Body : Create a Hollowed Solid
  let faceToRemove;
  let zMax = -1;
  const aFaceExplorer = new openCascade.TopExp_Explorer_2(myBody.Shape(), openCascade.TopAbs_ShapeEnum.TopAbs_FACE, openCascade.TopAbs_ShapeEnum.TopAbs_SHAPE);
  for (; aFaceExplorer.More(); aFaceExplorer.Next()) {
    const aFace = openCascade.TopoDS.Face_1(aFaceExplorer.Current());
    // Check if <aFace> is the top face of the bottle's neck 
    const aSurface = openCascade.BRep_Tool.Surface_2(aFace);
    if (aSurface.get().$$.ptrType.name === "Geom_Plane*") {
      const aPlane = new openCascade.Handle_Geom_Plane_2(aSurface.get()).get();
      const aPnt = aPlane.Location();
      const aZ = aPnt.Z();
      if (aZ > zMax) {
        zMax = aZ;
        faceToRemove = new openCascade.TopExp_Explorer_2(aFace, openCascade.TopAbs_ShapeEnum.TopAbs_FACE, openCascade.TopAbs_ShapeEnum.TopAbs_SHAPE).Current();
      }
    }
  }

  const facesToRemove = new openCascade.TopTools_ListOfShape_1();
  facesToRemove.Append_1(faceToRemove);
  const s = myBody.Shape();
  myBody = new openCascade.BRepOffsetAPI_MakeThickSolid();
  myBody.MakeThickSolidByJoin(s, facesToRemove, -myThickness / 50, 1.e-3, openCascade.BRepOffset_Mode.BRepOffset_Skin, false, false, openCascade.GeomAbs_JoinType.GeomAbs_Arc, false, new openCascade.Message_ProgressRange_1());
  // Threading : Create Surfaces
  const aCyl1 = new openCascade.Geom_CylindricalSurface_1(new openCascade.gp_Ax3_2(neckAx2), myNeckRadius * 0.99);
  const aCyl2 = new openCascade.Geom_CylindricalSurface_1(new openCascade.gp_Ax3_2(neckAx2), myNeckRadius * 1.05);

  // Threading : Define 2D Curves
  const aPnt = new openCascade.gp_Pnt2d_3(2. * Math.PI, myNeckHeight / 2.);
  const aDir = new openCascade.gp_Dir2d_4(2. * Math.PI, myNeckHeight / 4.);
  const anAx2d = new openCascade.gp_Ax2d_2(aPnt, aDir);

  const aMajor = 2. * Math.PI;
  const aMinor = myNeckHeight / 10;

  const anEllipse1 = new openCascade.Geom2d_Ellipse_2(anAx2d, aMajor, aMinor, true);
  const anEllipse2 = new openCascade.Geom2d_Ellipse_2(anAx2d, aMajor, aMinor / 4, true);
  const anArc1 = new openCascade.Geom2d_TrimmedCurve(new openCascade.Handle_Geom2d_Curve_2(anEllipse1), 0, Math.PI, true, true);
  const anArc2 = new openCascade.Geom2d_TrimmedCurve(new openCascade.Handle_Geom2d_Curve_2(anEllipse2), 0, Math.PI, true, true);
  const tmp1 = anEllipse1.Value(0);
  const anEllipsePnt1 = new openCascade.gp_Pnt2d_3(tmp1.X(), tmp1.Y());
  const tmp2 = anEllipse1.Value(Math.PI);
  const anEllipsePnt2 = new openCascade.gp_Pnt2d_3(tmp2.X(), tmp2.Y());

  const aSegment = new openCascade.GCE2d_MakeSegment_1(anEllipsePnt1, anEllipsePnt2);
  // Threading : Build Edges and Wires
  const anEdge1OnSurf1 = new openCascade.BRepBuilderAPI_MakeEdge_30(new openCascade.Handle_Geom2d_Curve_2(anArc1), new openCascade.Handle_Geom_Surface_2(aCyl1));
  const anEdge2OnSurf1 = new openCascade.BRepBuilderAPI_MakeEdge_30(new openCascade.Handle_Geom2d_Curve_2(aSegment.Value().get()), new openCascade.Handle_Geom_Surface_2(aCyl1));
  const anEdge1OnSurf2 = new openCascade.BRepBuilderAPI_MakeEdge_30(new openCascade.Handle_Geom2d_Curve_2(anArc2), new openCascade.Handle_Geom_Surface_2(aCyl2));
  const anEdge2OnSurf2 = new openCascade.BRepBuilderAPI_MakeEdge_30(new openCascade.Handle_Geom2d_Curve_2(aSegment.Value().get()), new openCascade.Handle_Geom_Surface_2(aCyl2));
  const threadingWire1 = new openCascade.BRepBuilderAPI_MakeWire_3(anEdge1OnSurf1.Edge(), anEdge2OnSurf1.Edge());
  const threadingWire2 = new openCascade.BRepBuilderAPI_MakeWire_3(anEdge1OnSurf2.Edge(), anEdge2OnSurf2.Edge());
  openCascade.BRepLib.BuildCurves3d_2(threadingWire1.Wire());
  openCascade.BRepLib.BuildCurves3d_2(threadingWire2.Wire());
  openCascade.BRepLib.BuildCurves3d_2(threadingWire1.Wire());
  openCascade.BRepLib.BuildCurves3d_2(threadingWire2.Wire());

  // Create Threading 
  const aTool = new openCascade.BRepOffsetAPI_ThruSections(true, false, 1.0e-06);
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
export { makeBottle };

const addShapeToScene = async (openCascade, shape, scene) => {
  openCascadeHelper.setOpenCascade(openCascade);
  const facelist = await openCascadeHelper.tessellate(shape);
  const [locVertexcoord, locNormalcoord, locTriIndices] = await openCascadeHelper.joinPrimitives(facelist);
  const tot_triangle_count = facelist.reduce((a, b) => a + b.number_of_triangles, 0);
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
export { addShapeToScene };
