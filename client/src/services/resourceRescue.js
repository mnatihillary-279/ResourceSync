
function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidResource(resource) {
  return (
    resource &&
    typeof resource.id === "string" &&
    resource.id.trim() !== "" &&
    normalize(resource.name) !== "" &&
    normalize(resource.category) !== "" &&
    normalize(resource.location) !== "" &&
    Number.isFinite(resource.quantity) &&
    Number.isFinite(resource.minimumStock) &&
    resource.quantity >= 0 &&
    resource.minimumStock >= 0
  );
}

export function generateRescueRecommendations(resources) {
  if (!Array.isArray(resources)) {
    throw new TypeError("Resources must be an array.");
  }

  const groups = new Map();

  for (const resource of resources) {
    if (!isValidResource(resource) || resource.deleted) continue;

    const key = JSON.stringify([
      normalize(resource.name),
      normalize(resource.category)
    ]);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(resource);
  }

  const recommendations = [];

  for (const group of groups.values()) {
    // Detect duplicate records at the same normalized location.
    const locationCounts = new Map();

    for (const resource of group) {
      const location = normalize(resource.location);

      locationCounts.set(
        location,
        (locationCounts.get(location) || 0) + 1
      );
    }

    // Skip ambiguous groups to prevent overestimating available stock.
    if ([...locationCounts.values()].some((count) => count > 1)) {
      continue;
    }

    const sources = group
      .filter((item) => item.quantity > item.minimumStock)
      .map((item) => ({
        resource: item,
        surplus: item.quantity - item.minimumStock
      }))
      .sort((a, b) =>
        a.resource.location.localeCompare(b.resource.location)
      );

    const destinations = group
      .filter((item) => item.quantity < item.minimumStock)
      .map((item) => ({
        resource: item,
        shortage: item.minimumStock - item.quantity
      }))
      .sort((a, b) =>
        a.resource.location.localeCompare(b.resource.location)
      );

    for (const destination of destinations) {
      for (const source of sources) {
        if (destination.shortage <= 0) break;
        if (source.surplus <= 0) continue;

        const transferQuantity = Math.min(
          source.surplus,
          destination.shortage
        );

        if (transferQuantity <= 0) continue;

        recommendations.push({
          id: `${source.resource.id}:${destination.resource.id}`,
          resourceName: source.resource.name,
          category: source.resource.category,
          sourceId: source.resource.id,
          sourceLocation: source.resource.location,
          destinationId: destination.resource.id,
          destinationLocation: destination.resource.location,
          transferQuantity,
          sourceRemaining: source.surplus - transferQuantity,
          destinationRemaining: destination.shortage - transferQuantity,
          reason:
            `${source.resource.location} has ${source.surplus} units ` +
            "above its minimum stock. " +
            `${destination.resource.location} needs ${destination.shortage} ` +
            "units to reach its minimum stock."
        });

        source.surplus -= transferQuantity;
        destination.shortage -= transferQuantity;
      }
    }
  }

  return recommendations;
}
