export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "container";
}

export function buildContainerIndex(containers) {
  return new Map(containers.map((container) => [container.id, container]));
}

export function buildContainerPath(containerId, containerIndex) {
  const path = [];
  const visited = new Set();
  let currentId = containerId;

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error("Container hierarchy contains a cycle");
    }

    visited.add(currentId);
    const container = containerIndex.get(currentId);
    if (!container) {
      break;
    }

    path.unshift({
      id: container.id,
      name: container.name,
      slug: container.slug,
      type: container.type
    });
    currentId = container.parent_container_id;
  }

  return path;
}

export function wouldCreateContainerCycle(containerId, destinationId, containers) {
  if (!destinationId) {
    return false;
  }

  if (containerId === destinationId) {
    return true;
  }

  const index = buildContainerIndex(containers);
  const visited = new Set();
  let currentId = destinationId;

  while (currentId) {
    if (visited.has(currentId)) {
      return true;
    }

    if (currentId === containerId) {
      return true;
    }

    visited.add(currentId);
    currentId = index.get(currentId)?.parent_container_id ?? null;
  }

  return false;
}

export function nestContainers(containers) {
  const nodes = new Map(
    containers.map((container) => [
      container.id,
      {
        ...container,
        children: []
      }
    ])
  );

  const roots = [];
  for (const node of nodes.values()) {
    if (node.parent_container_id && nodes.has(node.parent_container_id)) {
      nodes.get(node.parent_container_id).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByName = (left, right) => left.name.localeCompare(right.name);
  for (const node of nodes.values()) {
    node.children.sort(sortByName);
  }
  roots.sort(sortByName);
  return roots;
}

export function containerUrl(container) {
  return `/containers/${container.slug}-${container.id}`;
}
