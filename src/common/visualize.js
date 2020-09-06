import * as THREE from 'three'

export default function visualize(openCascade, shape){
  let geometries = []
  const ExpFace = new openCascade.TopExp_Explorer();
  for(ExpFace.Init(shape, openCascade.TopAbs_FACE); ExpFace.More(); ExpFace.Next()) {
    const myFace = openCascade.TopoDS.prototype.Face(ExpFace.Current());

    try{
      //in case some of the faces can not been visualized
      new openCascade.BRepMesh_IncrementalMesh(myFace, 0.1);
    }catch(e){
      console.error('face visualizing failed')
      continue
    }
    const aLocation = new openCascade.TopLoc_Location();
    const myT = openCascade.BRep_Tool.prototype.Triangulation(myFace, aLocation);
    if(myT.IsNull()) {
      continue;
    }

    const pc = new openCascade.Poly_Connect(myT);
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
    const myNormal = new openCascade.TColgp_Array1OfDir(Nodes.Lower(), Nodes.Upper());
    const SST = new openCascade.StdPrs_ToolTriangulatedShape();
    SST.Normal(myFace, pc, myNormal);

    let normals = new Float32Array(myNormal.Length() * 3)
    for(let i = myNormal.Lower(); i <= myNormal.Upper(); i++) {
      const d = myNormal.Value(i).Transformed(aLocation.Transformation());

      normals[3 * (i - 1)] = d.X();
      normals[3 * (i - 1) + 1] = d.Y();
      normals[3 * (i - 1) + 2] = d.Z()
    }
      
    // write triangle buffer
    const orient = myFace.Orientation();
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
      if(orient !== openCascade.TopAbs_FORWARD) {
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
