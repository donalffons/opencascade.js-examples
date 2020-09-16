import * as THREE from 'three'

export default function visualize(openCascade, shape){
  let geometries = []
  const ExpFace = new openCascade.TopExp_Explorer_1();
  for(ExpFace.Init(shape, openCascade.TopAbs_ShapeEnum.TopAbs_FACE, openCascade.TopAbs_ShapeEnum.TopAbs_SHAPE); ExpFace.More(); ExpFace.Next()) {
    const myFace = openCascade.TopoDS.Face_1(ExpFace.Current());

    try{
      //in case some of the faces can not been visualized
      new openCascade.BRepMesh_IncrementalMesh_2(myFace, 0.1, false, 0.5, false);
    }catch(e){
      console.error('face visualizi<ng failed')
      continue
    }
    const aLocation = new openCascade.TopLoc_Location_1();
    const myT = openCascade.BRep_Tool.Triangulation(myFace, aLocation);
    if(myT.IsNull()) {
      continue;
    }

    const pc = new openCascade.Poly_Connect_2(myT);
    const Nodes = myT.get().Nodes();
    let vertices = new Float32Array(Nodes.Length() * 3)

    // write vertex buffer
    //this_face.vertex_coord = new Array(Nodes.Length() * 3);
    for(let i = Nodes.Lower(); i <= Nodes.Upper(); i++) {
      const p = Nodes.Value(i).Transformed(aLocation.Transformation());
      vertices[3 * (i - 1)] = p.X()
      vertices[3 * (i - 1) + 1] = p.Y()
      vertices[3 * (i - 1) + 2] = p.Z()
    }

    // write normal buffer
    const myNormal = new openCascade.TColgp_Array1OfDir_2(Nodes.Lower(), Nodes.Upper());
    openCascade.StdPrs_ToolTriangulatedShape.Normal(myFace, pc, myNormal);

    let normals = new Float32Array(myNormal.Length() * 3)
    for(let i = myNormal.Lower(); i <= myNormal.Upper(); i++) {
      const d = myNormal.Value(i).Transformed(aLocation.Transformation());

      normals[3 * (i - 1)] = d.X();
      normals[3 * (i - 1) + 1] = d.Y();
      normals[3 * (i - 1) + 2] = d.Z();
    }
    
    // write triangle buffer
    const orient = myFace.Orientation_1();
    const triangles = myT.get().Triangles();
    let indices
    let triLength = triangles.Length() * 3
    if(triLength > 65535)
      indices = new Uint32Array(triLength)
    else
      indices = new Uint16Array(triLength)

    for(let nt = 1; nt <= myT.get().NbTriangles(); nt++) {
      const t = triangles.Value(nt);
      let n1 = t.Value(1);
      let n2 = t.Value(2);
      let n3 = t.Value(3);
      if(orient !== openCascade.TopAbs_Orientation.TopAbs_FORWARD) {
        let tmp = n1;
        n1 = n2;
        n2 = tmp;
      }

      indices[3 * (nt - 1)] = n1 - 1
      indices[3 * (nt - 1) + 1] = n2 - 1
      indices[3 * (nt - 1) + 2] = n3 - 1
    }

    let geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position',
      new THREE.BufferAttribute(vertices, 3)
    )
    geometry.setAttribute('normal',
      new THREE.BufferAttribute(normals, 3)
    )

    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometries.push(geometry)
  }
  return geometries;
}
