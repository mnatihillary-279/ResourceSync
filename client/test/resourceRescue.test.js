
import test from "node:test";
import assert from "node:assert/strict";

import {
  generateRescueRecommendations
} from "../src/services/resourceRescue.js";

test("recommends transferring surplus to a shortage location", () => {
  const resources = [
    {
      id: "source-1",
      name: "Gloves",
      category: "Medical supplies",
      quantity: 100,
      minimumStock: 40,
      location: "Warehouse"
    },
    {
      id: "destination-1",
      name: "Gloves",
      category: "Medical supplies",
      quantity: 10,
      minimumStock: 30,
      location: "Clinic A"
    }
  ];

  const result = generateRescueRecommendations(resources);

  assert.equal(result.length, 1);
  assert.equal(result[0].transferQuantity, 20);
  assert.equal(result[0].sourceLocation, "Warehouse");
  assert.equal(result[0].destinationLocation, "Clinic A");
});

test("distributes surplus across multiple shortage locations", () => {
  const resources = [
    {
      id: "source-1",
      name: "Masks",
      category: "Medical supplies",
      quantity: 100,
      minimumStock: 40,
      location: "Warehouse"
    },
    {
      id: "destination-1",
      name: "Masks",
      category: "Medical supplies",
      quantity: 5,
      minimumStock: 20,
      location: "Clinic A"
    },
    {
      id: "destination-2",
      name: "Masks",
      category: "Medical supplies",
      quantity: 10,
      minimumStock: 25,
      location: "Clinic B"
    }
  ];

  const result = generateRescueRecommendations(resources);

  assert.equal(result.length, 2);
  assert.equal(result[0].transferQuantity, 15);
  assert.equal(result[1].transferQuantity, 15);

  const totalTransferred = result.reduce(
    (total, item) => total + item.transferQuantity,
    0
  );

  assert.equal(totalTransferred, 30);
});

test("does not recommend transfers when there is no surplus", () => {
  const resources = [
    {
      id: "source-1",
      name: "Gloves",
      category: "Medical supplies",
      quantity: 20,
      minimumStock: 20,
      location: "Warehouse"
    },
    {
      id: "destination-1",
      name: "Gloves",
      category: "Medical supplies",
      quantity: 5,
      minimumStock: 30,
      location: "Clinic A"
    }
  ];

  assert.deepEqual(generateRescueRecommendations(resources), []);
});

test("does not match different resource categories", () => {
  const resources = [
    {
      id: "source-1",
      name: "Gloves",
      category: "Medical supplies",
      quantity: 100,
      minimumStock: 20,
      location: "Warehouse"
    },
    {
      id: "destination-1",
      name: "Gloves",
      category: "General supplies",
      quantity: 0,
      minimumStock: 30,
      location: "Clinic A"
    }
  ];

  assert.deepEqual(generateRescueRecommendations(resources), []);
});

test("matches resource names without case sensitivity", () => {
  const resources = [
    {
      id: "source-1",
      name: "SURGICAL GLOVES",
      category: "Medical supplies",
      quantity: 100,
      minimumStock: 20,
      location: "Warehouse"
    },
    {
      id: "destination-1",
      name: "surgical gloves",
      category: "Medical supplies",
      quantity: 0,
      minimumStock: 30,
      location: "Clinic A"
    }
  ];

  const result = generateRescueRecommendations(resources);

  assert.equal(result.length, 1);
  assert.equal(result[0].transferQuantity, 30);
});

test("ignores deleted and invalid records", () => {
  const resources = [
    {
      id: "source-1",
      name: "Gloves",
      category: "Medical supplies",
      quantity: 100,
      minimumStock: 20,
      location: "Warehouse"
    },
    {
      id: "destination-1",
      name: "Gloves",
      category: "Medical supplies",
      quantity: 0,
      minimumStock: 30,
      location: "Clinic A",
      deleted: true
    },
    {
      id: "destination-2",
      name: "Gloves",
      category: "Medical supplies",
      quantity: -5,
      minimumStock: 30,
      location: "Clinic B"
    }
  ];

  assert.deepEqual(generateRescueRecommendations(resources), []);
});

test("rejects input that is not an array", () => {
  assert.throws(
    () => generateRescueRecommendations(null),
    TypeError
  );
});
test("rejects recommendations for duplicate resource records at one location", () => {
  const resources = [
    {
      id: "source-1",
      name: "Gloves",
      category: "Medical supplies",
      quantity: 100,
      minimumStock: 40,
      location: "Warehouse"
    },
    {
      id: "source-2",
      name: "gloves",
      category: "Medical supplies",
      quantity: 80,
      minimumStock: 30,
      location: " warehouse "
    },
    {
      id: "destination-1",
      name: "Gloves",
      category: "Medical supplies",
      quantity: 0,
      minimumStock: 30,
      location: "Clinic A"
    }
  ];

  assert.deepEqual(generateRescueRecommendations(resources), []);
});
