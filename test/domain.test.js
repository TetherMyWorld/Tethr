import test from "node:test";
import assert from "node:assert/strict";
import { buildContainerIndex, buildContainerPath, containerUrl, nestContainers, slugify, wouldCreateContainerCycle } from "../src/domain.js";

const containers = [
  { id: "warehouse", parent_container_id: null, name: "Warehouse", slug: "warehouse", type: "Warehouse" },
  { id: "shelf", parent_container_id: "warehouse", name: "Shelf A", slug: "shelf-a", type: "Shelf" },
  { id: "box", parent_container_id: "shelf", name: "Blue Box", slug: "blue-box", type: "Box" },
  { id: "bin", parent_container_id: "warehouse", name: "Bin 12", slug: "bin-12", type: "Bin" }
];

test("slugify creates readable URL text", () => {
  assert.equal(slugify("Warehouse #2"), "warehouse-2");
});

test("buildContainerPath returns full hierarchy", () => {
  const path = buildContainerPath("box", buildContainerIndex(containers));
  assert.deepEqual(path.map((part) => part.name), ["Warehouse", "Shelf A", "Blue Box"]);
});

test("wouldCreateContainerCycle blocks move into itself", () => {
  assert.equal(wouldCreateContainerCycle("box", "box", containers), true);
});

test("wouldCreateContainerCycle blocks move into descendant", () => {
  assert.equal(wouldCreateContainerCycle("warehouse", "box", containers), true);
});

test("wouldCreateContainerCycle allows move across branches", () => {
  assert.equal(wouldCreateContainerCycle("box", "bin", containers), false);
});

test("nestContainers returns nested children", () => {
  const tree = nestContainers(containers);
  assert.equal(tree[0].children[0].children[0].name, "Blue Box");
});

test("containerUrl combines slug and id", () => {
  assert.equal(containerUrl(containers[2]), "/containers/blue-box-box");
});
