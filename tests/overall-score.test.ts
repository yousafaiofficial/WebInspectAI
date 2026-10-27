import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateOverallHealth } from "../lib/scoring/overall-score";

describe("Overall Score Calculation", () => {
  test("Full score correctly calculates weighted/rounded result", () => {
    const input = {
      performance: { available: true as const, score: 80 },
      seo: { available: true as const, score: 90 },
      accessibility: { available: true as const, score: 70 },
      mobile: { available: true as const, score: 80 },
      security: { available: true as const, score: 90 },
      links: { available: true as const, score: 100 },
      uiUx: { available: true as const, score: 70 },
    };

    const result = calculateOverallHealth(input);
    assert.equal(result.status, "available");
    assert.equal(result.coverage, 100);
    assert.equal(result.score, 83);
  });

  test("Missing UI/UX excludes it and renormalizes weights", () => {
    const input = {
      performance: { available: true as const, score: 80 },
      seo: { available: true as const, score: 90 },
      accessibility: { available: true as const, score: 70 },
      mobile: { available: true as const, score: 80 },
      security: { available: true as const, score: 90 },
      links: { available: true as const, score: 100 },
      uiUx: { available: false as const, reason: "AI unavailable" },
    };

    const result = calculateOverallHealth(input);
    assert.equal(result.status, "available");
    assert.equal(result.coverage, 90);
    
    const perfWeight = 22.22;
    const seoWeight = 16.67;
    const a11yWeight = 16.67;
    const mobileWeight = 16.67;
    const secWeight = 16.67;
    const linkWeight = 11.11;
    
    const expectedScore = Math.round(
      (80 * perfWeight + 90 * seoWeight + 70 * a11yWeight + 80 * mobileWeight + 90 * secWeight + 100 * linkWeight) / 100
    );
    assert.equal(result.score, expectedScore);
  });

  test("Missing Performance calculates correct effective weights", () => {
    const input = {
      performance: { available: false as const, reason: "Timeout" },
      seo: { available: true as const, score: 90 },
      accessibility: { available: true as const, score: 70 },
      mobile: { available: true as const, score: 80 },
      security: { available: true as const, score: 90 },
      links: { available: true as const, score: 100 },
      uiUx: { available: true as const, score: 70 },
    };

    const result = calculateOverallHealth(input);
    assert.equal(result.status, "available");
    assert.equal(result.coverage, 80);
    
    const effectiveWeights = result.categories?.map(c => c.effectiveWeight);
    assert.deepEqual(effectiveWeights, [18.75, 18.75, 18.75, 18.75, 12.5, 12.5]);
  });

  test("Insufficient coverage returns unavailable score", () => {
    const input = {
      performance: { available: false as const, reason: "Error" },
      seo: { available: true as const, score: 90 },
      accessibility: { available: false as const, reason: "Error" },
      mobile: { available: false as const, reason: "Error" },
      security: { available: true as const, score: 90 },
      links: { available: false as const, reason: "Error" },
      uiUx: { available: false as const, reason: "Error" },
    };

    const result = calculateOverallHealth(input);
    assert.equal(result.status, "unavailable");
    assert.equal(result.score, null);
  });

  test("Invalid scores are excluded", () => {
    const input = {
      performance: { available: true as const, score: 80 },
      seo: { available: true as const, score: -1 },
      accessibility: { available: true as const, score: 101 },
      mobile: { available: true as const, score: NaN },
      security: { available: true as const, score: Infinity },
      links: { available: true as const, score: 100 },
      uiUx: { available: true as const, score: 70 },
    };

    const result = calculateOverallHealth(input);
    assert.equal(result.status, "unavailable");
    assert.equal(result.score, null);
  });

  test("Weight invariant: Base weights must total exactly 100%", () => {
    const input = {
      performance: { available: true as const, score: 100 },
      seo: { available: true as const, score: 100 },
      accessibility: { available: true as const, score: 100 },
      mobile: { available: true as const, score: 100 },
      security: { available: true as const, score: 100 },
      links: { available: true as const, score: 100 },
      uiUx: { available: true as const, score: 100 },
    };

    const result = calculateOverallHealth(input);
    assert.equal(result.coverage, 100);
    const totalEffectiveWeight = result.categories?.reduce((acc, cat) => acc + cat.effectiveWeight, 0) || 0;
    assert.equal(Math.round(totalEffectiveWeight), 100);
  });

  test("Determinism: Identical inputs produce identical output", () => {
    const input1 = {
      performance: { available: true as const, score: 80 },
      seo: { available: true as const, score: 90 },
      accessibility: { available: true as const, score: 70 },
      mobile: { available: true as const, score: 80 },
      security: { available: true as const, score: 90 },
      links: { available: true as const, score: 100 },
      uiUx: { available: true as const, score: 70 },
    };
    
    const input2 = JSON.parse(JSON.stringify(input1));

    const result1 = calculateOverallHealth(input1);
    const result2 = calculateOverallHealth(input2);
    assert.deepEqual(result1, result2);
  });
});
