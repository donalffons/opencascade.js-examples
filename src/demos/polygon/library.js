const makePolygon = (openCascade) => {
  const builder = new openCascade.BRep_Builder();
  const aComp = new openCascade.TopoDS_Compound();
  builder.MakeCompound(aComp);
  const path = [[-50, 0, 0], [50, 0, 0], [50, 100, 0]].map(([x, y, z]) => new openCascade.gp_Pnt_3(x, y, z));
  const makePolygon = new openCascade.BRepBuilderAPI_MakePolygon_3(path[0], path[1], path[2], true);
  const wire = makePolygon.Wire();
  const f = new openCascade.BRepBuilderAPI_MakeFace_15(wire, false);
  builder.Add(aComp, f.Shape());
  return aComp;
}
export { makePolygon }
